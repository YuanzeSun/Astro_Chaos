import OpenAI from "openai";
import type { OpenAISource } from "./credentials";
import type { Provider, ProviderCall, ProviderResult, ToolCall, Usage } from "./types";

type Response = OpenAI.Responses.Response;

function parseArguments(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined; // the caller's schema check rejects it
  }
}

function responseOutput(r: Response): { text: string; refused: boolean; toolCalls: ToolCall[] } {
  let text = "";
  let refused = false;
  const toolCalls: ToolCall[] = [];
  for (const item of r.output) {
    if (item.type === "function_call") toolCalls.push({ name: item.name, input: parseArguments(item.arguments) });
    if (item.type !== "message") continue;
    for (const part of item.content) {
      if (part.type === "output_text") text += part.text;
      else if (part.type === "refusal") refused = true;
    }
  }
  const truncated = r.status === "incomplete";
  return { text: refused ? "" : text, refused, toolCalls: refused || truncated ? [] : toolCalls };
}

function responseUsage(r: Response): Usage {
  const cached = r.usage?.input_tokens_details?.cached_tokens ?? 0;
  return {
    inputTokens: (r.usage?.input_tokens ?? 0) - cached,
    outputTokens: r.usage?.output_tokens ?? 0,
    cacheReadTokens: cached,
    cacheWriteTokens: 0,
  };
}

const opts = (c: ProviderCall) => (c.timeoutMs ? { timeout: c.timeoutMs } : undefined);

/** Where an OpenAI-compatible endpoint differs from OpenAI's own. */
export interface CompatOptions {
  /** json_schema structured output. Without it: json_object, with the schema in the prompt. */
  jsonSchema?: boolean;
  /** `strict` on function tools. */
  strictTools?: boolean;
  /** Accepts reasoning effort. */
  effort?: boolean;
  /** Chat Completions: the name of the output limit. */
  maxTokensField?: "max_completion_tokens" | "max_tokens";
  /** Called on a 401 before one retry, for tokens that refresh. */
  onUnauthorized?: () => void;
  /** Tests swap the network out. */
  fetch?: typeof fetch;
}

/** Talks to an OpenAI-compatible endpoint: Codex's configured one, a ChatGPT sign-in, DeepSeek. */
export function createOpenAIProvider(source: OpenAISource, compat: CompatOptions = {}): Provider {
  const { jsonSchema = true, strictTools = true, effort: sendEffort = true, maxTokensField = "max_completion_tokens" } = compat;
  // Relays may treat prompt_cache_key as a Codex session marker and prepend ~20k tokens of their
  // own instructions (measured: 4k → 26k input tokens). Only the official endpoint gets it.
  const sendCacheKey = /^https:\/\/api\.openai\.com(\/|$)/.test(source.baseURL);
  const client = new OpenAI({
    apiKey: source.apiKey,
    baseURL: source.baseURL,
    organization: null,
    project: null,
    defaultHeaders: source.headers,
    defaultQuery: source.query,
    maxRetries: 2,
    ...(compat.fetch ? { fetch: compat.fetch } : {}),
  });

  const viaResponses = async (c: ProviderCall): Promise<ProviderResult> => {
    const body: OpenAI.Responses.ResponseCreateParamsNonStreaming = {
      model: c.model,
      instructions: c.system.map((b) => b.text).join("\n\n"),
      input: c.messages.map((m) => ({ role: m.role, content: m.content })),
      max_output_tokens: c.maxTokens,
      store: false,
      ...(c.cacheKey && sendCacheKey ? { prompt_cache_key: c.cacheKey } : {}),
      ...(c.effort && sendEffort ? { reasoning: { effort: c.effort } } : {}),
      ...(c.json
        ? { text: { format: { type: "json_schema" as const, name: c.json.name, schema: c.json.schema, strict: true } } }
        : {}),
      ...(c.tools?.length
        ? {
            tools: c.tools.map((t) => ({
              type: "function" as const,
              name: t.name,
              description: t.description,
              parameters: t.schema,
              strict: true,
            })),
          }
        : {}),
    };

    let final: Response | undefined;
    if (c.onText) {
      const stream = await client.responses.create({ ...body, stream: true }, opts(c));
      for await (const event of stream) {
        if (event.type === "response.output_text.delta") c.onText(event.delta);
        else if (event.type === "response.completed" || event.type === "response.incomplete") final = event.response;
        else if (event.type === "response.failed") throw new Error(event.response.error?.message ?? "response failed");
        else if (event.type === "error") throw new Error(event.message);
      }
      if (!final) throw new Error("stream ended without a final response");
    } else {
      final = await client.responses.create(body, opts(c));
    }

    const { text, refused, toolCalls } = responseOutput(final);
    const stopReason = final.incomplete_details?.reason ? `incomplete:${final.incomplete_details.reason}` : final.status ?? "unknown";
    return { text, toolCalls, model: final.model, usage: responseUsage(final), stopReason, refused };
  };

  const viaChat = async (c: ProviderCall): Promise<ProviderResult> => {
    let system = c.system.map((b) => b.text).join("\n\n");
    // Without json_schema the schema goes into the prompt (json_object mode wants the word "json" there too).
    if (c.json && !jsonSchema) system += `\n\n只输出一个 json 对象，不要别的文字。它必须符合这个 JSON Schema：\n${JSON.stringify(c.json.schema)}`;
    const body: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
      model: c.model,
      messages: [{ role: "system", content: system }, ...c.messages],
      ...(maxTokensField === "max_tokens" ? { max_tokens: c.maxTokens } : { max_completion_tokens: c.maxTokens }),
      ...(c.cacheKey && sendCacheKey ? { prompt_cache_key: c.cacheKey } : {}),
      ...(c.effort && sendEffort ? { reasoning_effort: c.effort } : {}),
      ...(c.json
        ? {
            response_format: jsonSchema
              ? { type: "json_schema" as const, json_schema: { name: c.json.name, schema: c.json.schema, strict: true } }
              : { type: "json_object" as const },
          }
        : {}),
      ...(c.tools?.length
        ? {
            tools: c.tools.map((t) => ({
              type: "function" as const,
              function: { name: t.name, description: t.description, parameters: t.schema, ...(strictTools ? { strict: true } : {}) },
            })),
          }
        : {}),
    };

    let text = "";
    let model = c.model;
    let finish = "unknown";
    let refused = false;
    let usage: OpenAI.CompletionUsage | undefined;
    const calls = new Map<number, { name: string; args: string }>();
    if (c.onText) {
      const stream = await client.chat.completions.create({ ...body, stream: true, stream_options: { include_usage: true } }, opts(c));
      for await (const chunk of stream) {
        model = chunk.model || model;
        const choice = chunk.choices[0];
        if (choice?.delta?.content) {
          text += choice.delta.content;
          c.onText(choice.delta.content);
        }
        if (choice?.delta?.refusal) refused = true;
        for (const tc of choice?.delta?.tool_calls ?? []) {
          const call = calls.get(tc.index) ?? { name: "", args: "" };
          if (tc.function?.name) call.name += tc.function.name;
          if (tc.function?.arguments) call.args += tc.function.arguments;
          calls.set(tc.index, call);
        }
        if (choice?.finish_reason) finish = choice.finish_reason;
        if (chunk.usage) usage = chunk.usage;
      }
    } else {
      const completion = await client.chat.completions.create(body, opts(c));
      const choice = completion.choices[0];
      text = choice?.message.content ?? "";
      refused = Boolean(choice?.message.refusal);
      for (const [i, tc] of (choice?.message.tool_calls ?? []).entries()) {
        if (tc.type === "function") calls.set(i, { name: tc.function.name, args: tc.function.arguments });
      }
      finish = choice?.finish_reason ?? finish;
      model = completion.model;
      usage = completion.usage;
    }

    // DeepSeek reports cache hits as prompt_cache_hit_tokens.
    const cached = usage?.prompt_tokens_details?.cached_tokens ?? (usage as { prompt_cache_hit_tokens?: number } | undefined)?.prompt_cache_hit_tokens ?? 0;
    const toolCalls = refused || finish === "length" ? [] : [...calls.values()].map((tc) => ({ name: tc.name, input: parseArguments(tc.args) }));
    return {
      text: refused ? "" : text,
      toolCalls,
      model,
      usage: {
        inputTokens: (usage?.prompt_tokens ?? 0) - cached,
        outputTokens: usage?.completion_tokens ?? 0,
        cacheReadTokens: cached,
        cacheWriteTokens: 0,
      },
      stopReason: finish,
      refused,
    };
  };

  const inner = source.wireApi === "responses" ? viaResponses : viaChat;
  return {
    async call(c) {
      try {
        return await inner(c);
      } catch (err) {
        if (!compat.onUnauthorized || (err as { status?: number }).status !== 401) throw err;
        compat.onUnauthorized();
        return inner(c);
      }
    },
    async listModels() {
      const ids: string[] = [];
      for await (const model of client.models.list()) ids.push(model.id);
      return ids;
    },
  };
}
