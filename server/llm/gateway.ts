// The one door to the models: picks the provider, checks once that
// the default one answers this app (a relay may only serve its own CLI), and makes the call.

import type { ServerConfig } from "../config";
import type { AccountStore } from "./accounts";
import { createAnthropicProvider } from "./anthropicProvider";
import type { ChatGptSession } from "./chatgpt";
import type { CredentialStore, DiscoveredCredentials } from "./credentials";
import { createOpenAIProvider } from "./openaiProvider";
import { chatgptProvider, deepseekProvider } from "./providers";
import { hasProvider, resolveRoute } from "./routes";
import { PROVIDERS, type Effort, type JsonSpec, type Provider, type ProviderId, type ProviderResult, type SystemBlock } from "./types";

export type ModelList = { ok: true; models: string[] } | { ok: false };
export type ModelCatalog = Record<ProviderId, ModelList | null>;

export interface GatewayDeps {
  config: ServerConfig;
  credentials: Pick<CredentialStore, "get">;
  accounts: AccountStore;
  chatgpt: ChatGptSession;
}

const CATALOG_TTL_MS = 10 * 60_000;
const CALL_TIMEOUT_MS = 90_000;

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

/** Older models reject the effort / reasoning parameter with a 400. */
function rejectsEffort(err: unknown): boolean {
  const status = (err as { status?: unknown })?.status;
  return status === 400 && err instanceof Error && /effort|reasoning/i.test(err.message);
}

export class LlmGateway {
  private readonly providers = new Map<ProviderId, { creds: DiscoveredCredentials; provider: Provider }>();
  private catalog: { creds: DiscoveredCredentials; at: number; lists: ModelCatalog } | null = null;
  private probe: { creds: DiscoveredCredentials; result: Promise<Set<ProviderId>> } | null = null;
  private readonly noEffort = new Set<string>();

  constructor(private readonly deps: GatewayDeps) {}

  private create(id: ProviderId, creds: DiscoveredCredentials): Provider {
    if (id === "anthropic") return createAnthropicProvider(creds.anthropic!, this.deps.config.refusalFallback);
    if (id === "openai") return createOpenAIProvider(creds.openai!);
    if (id === "deepseek") return deepseekProvider(creds.deepseek!.apiKey);
    return chatgptProvider(this.deps.chatgpt);
  }

  /** Providers are rebuilt when the CLI configs or connected accounts change on disk. */
  private providerFor(id: ProviderId, creds: DiscoveredCredentials): Provider | null {
    if (!hasProvider(creds, id)) return null;
    const cached = this.providers.get(id);
    if (cached && cached.creds === creds) return cached.provider;
    const provider = this.create(id, creds);
    this.providers.set(id, { creds, provider });
    return provider;
  }

  async listModels(refresh = false): Promise<ModelCatalog> {
    const creds = this.deps.credentials.get();
    const c = this.catalog;
    if (!refresh && c && c.creds === creds && Date.now() - c.at < CATALOG_TTL_MS) return c.lists;
    const fetchList = async (id: ProviderId): Promise<ModelList | null> => {
      const provider = this.providerFor(id, creds);
      if (!provider) return null;
      try {
        return { ok: true, models: (await provider.listModels()).sort() };
      } catch (err) {
        console.error(`${id} model list failed:`, errorMessage(err).slice(0, 160));
        return { ok: false };
      }
    };
    const [anthropic, openai, chatgpt, deepseek] = await Promise.all(PROVIDERS.map(fetchList));
    const lists: ModelCatalog = { anthropic: anthropic ?? null, openai: openai ?? null, chatgpt: chatgpt ?? null, deepseek: deepseek ?? null };
    this.catalog = { creds, at: Date.now(), lists };
    return lists;
  }

  /** Before routing to the default provider, check once with a tiny call that it answers. */
  private unreachable(creds: DiscoveredCredentials): Promise<Set<ProviderId>> {
    if (this.probe?.creds === creds) return this.probe.result;
    const tryOne = async (id: ProviderId, model: string | null | undefined) => {
      const provider = this.providerFor(id, creds);
      if (!provider || !model) return false;
      try {
        await provider.call({ model, system: [{ text: "回一个字。" }], messages: [{ role: "user", content: "好" }], maxTokens: 16, timeoutMs: 30_000 });
        return true;
      } catch (err) {
        console.error(`${id} endpoint did not answer the probe:`, errorMessage(err).slice(0, 160));
        return false;
      }
    };
    const result = (async () => {
      const down = new Set<ProviderId>();
      const elsewhere = Boolean(creds.openai?.model || creds.chatgpt?.model || creds.deepseek);
      if (!creds.anthropic || !elsewhere) return down;
      if (!(await tryOne("anthropic", creds.anthropic.model ?? this.deps.config.defaultClaudeModel))) down.add("anthropic");
      if (down.has("anthropic") && creds.openai?.model && !(await tryOne("openai", creds.openai.model))) down.add("openai");
      return down;
    })();
    this.probe = { creds, result };
    return result;
  }

  async route() {
    const creds = this.deps.credentials.get();
    const selection = this.deps.accounts.selection();
    return { selection, resolved: resolveRoute(this.deps.config, creds, selection, selection ? new Set() : await this.unreachable(creds)) };
  }

  async call(req: { system: SystemBlock[]; user: string; maxTokens: number; effort?: Effort; json?: JsonSpec }): Promise<ProviderResult> {
    const creds = this.deps.credentials.get();
    const { resolved } = await this.route();
    if (!resolved.ok) throw new Error(resolved.reason);
    const { provider: id, model } = resolved.route;
    const provider = this.providerFor(id, creds)!;
    const key = `${id}:${model}`;
    const attempt = (effort: Effort | undefined) =>
      provider.call({
        model,
        system: req.system,
        messages: [{ role: "user", content: req.user }],
        maxTokens: req.maxTokens,
        timeoutMs: CALL_TIMEOUT_MS,
        ...(effort ? { effort } : {}),
        ...(req.json ? { json: req.json } : {}),
      });
    const effort = req.effort && !this.noEffort.has(key) ? req.effort : undefined;
    try {
      return await attempt(effort);
    } catch (err) {
      if (effort && rejectsEffort(err)) {
        this.noEffort.add(key);
        return attempt(undefined);
      }
      throw err;
    }
  }
}
