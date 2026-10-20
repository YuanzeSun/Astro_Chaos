import Anthropic from "@anthropic-ai/sdk";
import type { AnthropicSource } from "./credentials";
import type { Provider, ProviderCall, ProviderResult } from "./types";

const OFFICIAL_BASE_URL = "https://api.anthropic.com";
const FALLBACK_BETA = "server-side-fallback-2026-07-01";

export function createAnthropicProvider(source: AnthropicSource, refusalFallback: "auto" | "on" | "off"): Provider {
  const baseURL = source.baseURL ?? OFFICIAL_BASE_URL;
  // Pass every credential explicitly (null when absent) so the SDK never falls back to
  // whatever ANTHROPIC_* variables happen to be in this process's environment.
  const client = new Anthropic({ apiKey: source.apiKey, authToken: source.authToken, baseURL, maxRetries: 2 });
  const useFallback =
    refusalFallback === "on" || (refusalFallback === "auto" && baseURL.replace(/\/+$/, "") === OFFICIAL_BASE_URL);

  return {
    async listModels() {
      const ids: string[] = [];
      for await (const model of client.models.list({ limit: 100 })) ids.push(model.id);
      return ids;
    },

    async call(c: ProviderCall): Promise<ProviderResult> {
      const outputConfig: Anthropic.OutputConfig = {};
      if (c.effort) outputConfig.effort = c.effort;
      if (c.json) outputConfig.format = { type: "json_schema", schema: c.json.schema };

      const params: Anthropic.MessageCreateParamsNonStreaming = {
        model: c.model,
        max_tokens: c.maxTokens,
        system: c.system.map((b) => ({
          type: "text" as const,
          text: b.text,
          ...(b.cache ? { cache_control: { type: "ephemeral" as const } } : {}),
        })),
        messages: c.messages,
        ...(c.effort || c.json ? { output_config: outputConfig } : {}),
        ...(c.tools?.length
          ? {
              tools: c.tools.map((t) => ({
                name: t.name,
                description: t.description,
                input_schema: t.schema as Anthropic.Tool.InputSchema,
                // Stream tool inputs as generated; the caller validates every input anyway.
                ...(c.onText ? { eager_input_streaming: true } : {}),
              })),
            }
          : {}),
      };

      const options = c.timeoutMs ? { timeout: c.timeoutMs } : undefined;
      let message: Anthropic.Message | Anthropic.Beta.BetaMessage;
      if (useFallback) {
        const betaParams = { ...params, betas: [FALLBACK_BETA], fallbacks: "default" as const };
        if (c.onText) {
          const stream = client.beta.messages.stream(betaParams, options);
          stream.on("text", c.onText);
          message = await stream.finalMessage();
        } else {
          message = await client.beta.messages.create(betaParams, options);
        }
      } else if (c.onText) {
        const stream = client.messages.stream(params, options);
        stream.on("text", c.onText);
        message = await stream.finalMessage();
      } else {
        message = await client.messages.create(params, options);
      }

      const refused = message.stop_reason === "refusal";
      const text = refused
        ? ""
        : message.content
            .map((block) => (block.type === "text" ? block.text : ""))
            .join("");
      // A truncated or refused turn may carry a half-written tool call; never act on it.
      const actionable = !refused && message.stop_reason !== "max_tokens";
      const toolCalls = actionable
        ? message.content.flatMap((block) => (block.type === "tool_use" ? [{ name: block.name, input: block.input }] : []))
        : [];
      return {
        text,
        toolCalls,
        model: message.model,
        usage: {
          inputTokens: message.usage.input_tokens,
          outputTokens: message.usage.output_tokens,
          cacheReadTokens: message.usage.cache_read_input_tokens ?? 0,
          cacheWriteTokens: message.usage.cache_creation_input_tokens ?? 0,
        },
        stopReason: message.stop_reason ?? "unknown",
        refused,
      };
    },
  };
}
