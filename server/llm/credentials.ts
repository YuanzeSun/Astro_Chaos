// Credentials come from the local Claude Code and Codex CLI configs.
// DeepSeek and ChatGPT are connected in the game's settings instead. Secrets stay in this process; describeCredentials() is the only view that leaves it.
//
//   Claude: <CLAUDE_CONFIG_DIR or ~/.claude>/settings.json → "env" block
//   Codex:  <CODEX_HOME or ~/.codex>/config.toml (provider, base_url, model) + auth.json (key)
//
// A Claude subscription login (stored in the keychain) is deliberately not used: those
// credentials are for Claude Code itself, not for other apps.

import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse as parseToml } from "smol-toml";
import type { AccountStore } from "./accounts";

export interface AnthropicSource {
  file: string;
  baseURL: string | null;
  apiKey: string | null;
  authToken: string | null;
  /** The model named in settings.json, if any. */
  model: string | null;
}

export interface OpenAISource {
  files: string[];
  providerId: string;
  baseURL: string;
  wireApi: "responses" | "chat";
  /** A key, or a getter for tokens that refresh (ChatGPT sign-in). */
  apiKey: string | (() => Promise<string>);
  headers: Record<string, string>;
  query: Record<string, string>;
  model: string | null;
}

export interface DiscoveredCredentials {
  anthropic: AnthropicSource | null;
  openai: OpenAISource | null;
  /** Connected in the app: a DeepSeek key. */
  deepseek?: { apiKey: string } | null;
  /** Connected in the app: a ChatGPT account that granted use of its plan. */
  chatgpt?: { email: string | null; model: string | null } | null;
  /** Why a source is missing or incomplete, in Chinese, for the server log. */
  notes: string[];
}

type Json = Record<string, unknown>;

const isObject = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

function stringMap(v: unknown): Record<string, string> {
  if (!isObject(v)) return {};
  return Object.fromEntries(Object.entries(v).filter((e): e is [string, string] => typeof e[1] === "string"));
}

function readText(file: string): string | null {
  try {
    return readFileSync(file, "utf8");
  } catch {
    return null;
  }
}

function readClaude(dir: string, notes: string[]): AnthropicSource | null {
  const file = join(dir, "settings.json");
  const text = readText(file);
  if (text === null) {
    notes.push(`没找到 ${file}`);
    return null;
  }
  let settings: unknown;
  try {
    settings = JSON.parse(text);
  } catch {
    notes.push(`${file} 不是合法的 JSON`);
    return null;
  }
  const env = isObject(settings) && isObject(settings.env) ? settings.env : {};
  const apiKey = str(env.ANTHROPIC_API_KEY);
  const authToken = str(env.ANTHROPIC_AUTH_TOKEN);
  if (!apiKey && !authToken) {
    notes.push(
      `${file} 的 env 里没有 ANTHROPIC_API_KEY 或 ANTHROPIC_AUTH_TOKEN。` +
        `如果 Claude Code 用的是订阅账号登录，那份凭据不能给别的应用用。`,
    );
    return null;
  }
  const topModel = isObject(settings) ? str(settings.model) : null;
  const model = str(env.ANTHROPIC_DEFAULT_OPUS_MODEL) ?? str(env.ANTHROPIC_MODEL) ?? (topModel?.startsWith("claude-") ? topModel : null);

  return { file, baseURL: str(env.ANTHROPIC_BASE_URL), apiKey, authToken, model };
}

function readCodex(dir: string, env: NodeJS.ProcessEnv, notes: string[]): OpenAISource | null {
  const configFile = join(dir, "config.toml");
  const authFile = join(dir, "auth.json");
  const configText = readText(configFile);
  const authText = readText(authFile);
  if (configText === null && authText === null) {
    notes.push(`没找到 ${dir} 下的 config.toml 和 auth.json`);
    return null;
  }

  let config: Json = {};
  if (configText !== null) {
    try {
      config = parseToml(configText) as Json;
    } catch {
      notes.push(`${configFile} 解析失败`);
      return null;
    }
  }
  let auth: Json = {};
  if (authText !== null) {
    try {
      const parsed: unknown = JSON.parse(authText);
      if (isObject(parsed)) auth = parsed;
    } catch {
      notes.push(`${authFile} 不是合法的 JSON`);
    }
  }

  const profileName = str(config.profile);
  const profiles = isObject(config.profiles) ? config.profiles : {};
  const profile = profileName && isObject(profiles[profileName]) ? (profiles[profileName] as Json) : {};
  const providerId = str(profile.model_provider) ?? str(config.model_provider) ?? "openai";
  const model = str(profile.model) ?? str(config.model);

  const providers = isObject(config.model_providers) ? config.model_providers : {};
  const provider = isObject(providers[providerId]) ? (providers[providerId] as Json) : null;
  if (!provider && providerId !== "openai") {
    notes.push(`${configFile} 里 model_provider = "${providerId}"，但没有对应的 [model_providers.${providerId}]`);
    return null;
  }

  const baseURL = str(provider?.base_url) ?? "https://api.openai.com/v1";
  const wireApi = (str(provider?.wire_api) ?? (provider ? "chat" : "responses")) === "responses" ? "responses" : "chat";
  const requiresOpenaiAuth = provider ? provider.requires_openai_auth === true : true;

  let apiKey: string | null = str(provider?.experimental_bearer_token);
  const envKey = str(provider?.env_key);
  if (!apiKey && envKey) {
    apiKey = str(env[envKey]);
    if (!apiKey) notes.push(`Codex 的 provider "${providerId}" 要从环境变量 ${envKey} 取 key，但这个变量没有设置`);
  }
  if (!apiKey && requiresOpenaiAuth) {
    apiKey = str(auth.OPENAI_API_KEY);
    if (!apiKey) {
      notes.push(
        isObject(auth.tokens)
          ? `${authFile} 里是 ChatGPT 账号登录，不是 API key，没法给别的应用用`
          : `${authFile} 里没有 OPENAI_API_KEY`,
      );
    }
  }
  if (!apiKey) return null;
  if (!model) notes.push(`${configFile} 没有设置 model；要用 Codex 的话，在游戏设置里选一个模型`);

  const headers = stringMap(provider?.http_headers);
  for (const [header, varName] of Object.entries(stringMap(provider?.env_http_headers))) {
    const value = str(env[varName]);
    if (value) headers[header] = value;
  }

  return {
    files: [configFile, authFile].filter((f) => readText(f) !== null),
    providerId,
    baseURL,
    wireApi,
    apiKey,
    headers,
    query: stringMap(provider?.query_params),
    model,
  };
}

export function discoverCredentials(
  claudeConfigDir: string,
  codexHome: string,
  env: NodeJS.ProcessEnv = process.env,
): DiscoveredCredentials {
  const notes: string[] = [];
  return {
    anthropic: readClaude(claudeConfigDir, notes),
    openai: readCodex(codexHome, env, notes),
    notes,
  };
}

/** Re-reads the CLI configs whenever one of their files changes, so edits in Claude Code / Codex apply live. */
export class CredentialStore {
  private cached: DiscoveredCredentials | null = null;
  private stamp = "";

  constructor(
    private readonly claudeConfigDir: string,
    private readonly codexHome: string,
    private readonly accounts?: AccountStore,
  ) {}

  private currentStamp(): string {
    return [join(this.claudeConfigDir, "settings.json"), join(this.codexHome, "config.toml"), join(this.codexHome, "auth.json")]
      .map((f) => {
        try {
          const s = statSync(f);
          return `${s.mtimeMs}:${s.size}`;
        } catch {
          return "-";
        }
      })
      .join("|")
      .concat(`|${this.accounts?.stamp() ?? ""}`);
  }

  get(): DiscoveredCredentials {
    const stamp = this.currentStamp();
    if (!this.cached || stamp !== this.stamp) {
      const found = discoverCredentials(this.claudeConfigDir, this.codexHome);
      const key = this.accounts?.deepseekKey();
      const gpt = this.accounts?.chatgpt();
      this.cached = {
        ...found,
        deepseek: key ? { apiKey: key } : null,
        chatgpt: gpt?.tokens && gpt.canUsePlan ? { email: gpt.email, model: gpt.defaultModel } : null,
      };
      this.stamp = stamp;
    }
    return this.cached;
  }
}

/** Safe-to-show summary: where things came from, never the secrets themselves. */
export function describeCredentials(creds: DiscoveredCredentials) {
  return {
    anthropic: creds.anthropic && {
      file: creds.anthropic.file,
      baseURL: creds.anthropic.baseURL ?? "https://api.anthropic.com",
      auth: [creds.anthropic.apiKey ? "ANTHROPIC_API_KEY" : null, creds.anthropic.authToken ? "ANTHROPIC_AUTH_TOKEN" : null].filter(Boolean),
      model: creds.anthropic.model,
    },
    openai: creds.openai && {
      files: creds.openai.files,
      providerId: creds.openai.providerId,
      baseURL: creds.openai.baseURL,
      wireApi: creds.openai.wireApi,
      model: creds.openai.model,
    },
    deepseek: Boolean(creds.deepseek),
    chatgpt: creds.chatgpt ?? null,
    notes: creds.notes,
  };
}
