import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = fileURLToPath(new URL("../", import.meta.url));

export interface ServerConfig {
  port: number;
  /** Built game to serve (dist/), if it exists. */
  webDist: string;
  /** Where Claude Code and Codex keep their settings. */
  claudeConfigDir: string;
  codexHome: string;
  /** Accounts connected in the game itself (DeepSeek key, ChatGPT sign-in, model choice). */
  accountsDir: string;
  /** Claude model used when ~/.claude/settings.json doesn't name one. */
  defaultClaudeModel: string;
  /** Server-side refusal fallback (beta). "auto" enables it only against api.anthropic.com. */
  refusalFallback: "auto" | "on" | "off";
}

const nonEmpty = (v: string | undefined) => (v && v.trim() ? v.trim() : undefined);

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const port = Number(env.PORT);
  const fallback = env.LLM_REFUSAL_FALLBACK;
  return {
    port: Number.isInteger(port) && port > 0 ? port : 8765,
    webDist: join(REPO_ROOT, "dist"),
    claudeConfigDir: nonEmpty(env.CLAUDE_CONFIG_DIR) ?? join(homedir(), ".claude"),
    codexHome: nonEmpty(env.CODEX_HOME) ?? join(homedir(), ".codex"),
    accountsDir: nonEmpty(env.ASTRO_CHAOS_CONFIG_DIR) ?? join(nonEmpty(env.XDG_CONFIG_HOME) ?? join(homedir(), ".config"), "astro-chaos"),
    defaultClaudeModel: "claude-opus-5-5",
    refusalFallback: fallback === "on" || fallback === "off" ? fallback : "auto",
  };
}
