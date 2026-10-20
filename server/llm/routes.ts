import type { ServerConfig } from "../config";
import type { DiscoveredCredentials } from "./credentials";
import type { ProviderId } from "./types";

export interface ModelRoute {
  provider: ProviderId;
  model: string;
}

export type RouteResult = { ok: true; route: ModelRoute } | { ok: false; reason: string };

const PREFIX: Record<string, ProviderId> = { anthropic: "anthropic", claude: "anthropic", openai: "openai", codex: "openai", chatgpt: "chatgpt", deepseek: "deepseek" };
const LABEL: Record<ProviderId, string> = { anthropic: "Claude Code", openai: "Codex", chatgpt: "ChatGPT 登录", deepseek: "DeepSeek" };
const DEEPSEEK_DEFAULT = "deepseek-chat";

/** "anthropic:x" / "openai:x" / "chatgpt:x" / "deepseek:x", or a bare ID guessed by its name. */
export function parseModelSpec(spec: string): { provider: ProviderId; model: string } {
  const match = /^(anthropic|openai|claude|codex|chatgpt|deepseek):(.+)$/.exec(spec);
  if (match) return { provider: PREFIX[match[1]!]!, model: match[2]!.trim() };
  return { provider: spec.startsWith("claude") ? "anthropic" : spec.startsWith("deepseek") ? "deepseek" : "openai", model: spec };
}

export function hasProvider(creds: DiscoveredCredentials, provider: ProviderId): boolean {
  return Boolean(provider === "anthropic" ? creds.anthropic : provider === "openai" ? creds.openai : provider === "chatgpt" ? creds.chatgpt : creds.deepseek);
}

/**
 * Which provider and model to use: the choice made in settings, otherwise the first available of
 * Claude Code's settings (or the default Claude model), Codex's configured model, a ChatGPT
 * sign-in, a DeepSeek key — skipping one that turned out not to answer this app (`unreachable`).
 */
export function resolveRoute(
  config: ServerConfig,
  creds: DiscoveredCredentials,
  selection: string | null,
  unreachable: ReadonlySet<ProviderId> = new Set(),
): RouteResult {
  if (selection) {
    const { provider, model } = parseModelSpec(selection);
    if (!hasProvider(creds, provider)) return { ok: false, reason: `选的 ${selection} 需要 ${LABEL[provider]}，但没接上` };
    return { ok: true, route: { provider, model } };
  }
  const candidates: ModelRoute[] = [
    ...(creds.anthropic ? [{ provider: "anthropic" as const, model: creds.anthropic.model ?? config.defaultClaudeModel }] : []),
    ...(creds.openai?.model ? [{ provider: "openai" as const, model: creds.openai.model }] : []),
    ...(creds.chatgpt?.model ? [{ provider: "chatgpt" as const, model: creds.chatgpt.model }] : []),
    ...(creds.deepseek ? [{ provider: "deepseek" as const, model: DEEPSEEK_DEFAULT }] : []),
  ];
  const route = candidates.find((c) => !unreachable.has(c.provider)) ?? candidates[0];
  if (route) return { ok: true, route };
  if (creds.openai) return { ok: false, reason: "Codex 配置里没有 model" };
  return { ok: false, reason: ["没有可用的模型", ...creds.notes].join("；") };
}
