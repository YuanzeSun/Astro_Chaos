// Accounts the player connects inside the game (unlike Claude Code and Codex, which are read from
// their CLI configs): a DeepSeek key, a ChatGPT sign-in, and which model to use. Kept in the
// user's config directory (~/.config/astro-chaos), readable by this user only.

import { randomUUID } from "node:crypto";
import { chmodSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface ChatGptTokens {
  access: string;
  refresh: string;
  /** Epoch ms. */
  expiresAt: number;
}

export interface ChatGptRecord {
  /** One per install, sent when registering: "urn:uuid:…". */
  hostId: string;
  /** Issued on the first sign-in ("oaiapp_…"); reused afterwards. */
  clientId: string | null;
  email: string | null;
  name: string | null;
  /** The account granted use of its ChatGPT plan (scope chatgpt.tokens.use.direct). */
  canUsePlan: boolean;
  /** A model from the plan's catalog to use when none is chosen. */
  defaultModel: string | null;
  tokens: ChatGptTokens | null;
}

export class AccountStore {
  constructor(private readonly dir: string) {}

  private file(name: string) {
    return join(this.dir, `${name}.json`);
  }

  private read<T>(name: string): T | null {
    try {
      return JSON.parse(readFileSync(this.file(name), "utf8")) as T;
    } catch {
      return null;
    }
  }

  private write(name: string, value: unknown) {
    mkdirSync(this.dir, { recursive: true, mode: 0o700 });
    const path = this.file(name);
    writeFileSync(path, JSON.stringify(value, null, 2), { mode: 0o600 });
    chmodSync(path, 0o600);
  }

  /** Changes whenever either file does; credentials are re-read then. */
  stamp(): string {
    return ["deepseek", "chatgpt"]
      .map((n) => {
        try {
          const s = statSync(this.file(n));
          return `${s.mtimeMs}:${s.size}`;
        } catch {
          return "-";
        }
      })
      .join("|");
  }

  deepseekKey(): string | null {
    return this.read<{ apiKey?: string }>("deepseek")?.apiKey?.trim() || null;
  }

  setDeepseekKey(key: string | null) {
    if (key) this.write("deepseek", { apiKey: key.trim() });
    else rmSync(this.file("deepseek"), { force: true });
  }

  chatgpt(): ChatGptRecord {
    const saved = this.read<ChatGptRecord>("chatgpt");
    if (saved?.hostId) return saved;
    const fresh: ChatGptRecord = { hostId: `urn:uuid:${randomUUID()}`, clientId: null, email: null, name: null, canUsePlan: false, defaultModel: null, tokens: null };
    this.write("chatgpt", fresh);
    return fresh;
  }

  saveChatgpt(record: ChatGptRecord) {
    this.write("chatgpt", record);
  }

  /** "provider:model" chosen in settings, or null for automatic. */
  selection(): string | null {
    return this.read<{ spec?: string }>("model")?.spec ?? null;
  }

  setSelection(spec: string | null) {
    if (spec) this.write("model", { spec });
    else rmSync(this.file("model"), { force: true });
  }
}
