// The two providers connected in the app, shared by the gateway and settings (to test a key).

import { CHATGPT_API, type ChatGptSession } from "./chatgpt";
import { createOpenAIProvider } from "./openaiProvider";
import type { Provider } from "./types";

const DEEPSEEK_API = "https://api.deepseek.com";

/** OpenAI-compatible Chat Completions, without json_schema, strict tools or reasoning effort. */
export function deepseekProvider(apiKey: string, fetchImpl?: typeof fetch): Provider {
  const source = { files: [], providerId: "deepseek", baseURL: DEEPSEEK_API, wireApi: "chat" as const, apiKey, headers: {}, query: {}, model: null };
  return createOpenAIProvider(source, { jsonSchema: false, strictTools: false, effort: false, maxTokensField: "max_tokens", ...(fetchImpl ? { fetch: fetchImpl } : {}) });
}

/** The public Responses API with the signed-in account's token; a 401 refreshes it once. */
export function chatgptProvider(session: ChatGptSession): Provider {
  const source = { files: [], providerId: "chatgpt", baseURL: CHATGPT_API, wireApi: "responses" as const, apiKey: () => session.accessToken(), headers: {}, query: {}, model: null };
  return createOpenAIProvider(source, { onUnauthorized: () => session.invalidate() });
}
