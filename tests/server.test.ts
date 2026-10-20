import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createApp } from "../server/app";
import { loadConfig } from "../server/config";
import { AccountStore } from "../server/llm/accounts";
import { ChatGptSession } from "../server/llm/chatgpt";
import { CredentialStore, discoverCredentials } from "../server/llm/credentials";
import { LlmGateway } from "../server/llm/gateway";
import { resolveRoute } from "../server/llm/routes";

const tmp = () => mkdtempSync(join(tmpdir(), "astro-"));

function fakeHome() {
  const home = tmp();
  mkdirSync(join(home, ".claude"));
  mkdirSync(join(home, ".codex"));
  writeFileSync(join(home, ".claude/settings.json"), JSON.stringify({ env: { ANTHROPIC_AUTH_TOKEN: "t", ANTHROPIC_BASE_URL: "https://relay.example" } }));
  writeFileSync(join(home, ".codex/config.toml"), 'model = "gpt-x"\nmodel_provider = "relay"\n[model_providers.relay]\nbase_url = "https://relay.example/v1"\nwire_api = "responses"\nrequires_openai_auth = true\n');
  writeFileSync(join(home, ".codex/auth.json"), JSON.stringify({ OPENAI_API_KEY: "k" }));
  return home;
}

describe("服务端", () => {
  it("读 Claude Code 和 Codex 的配置", () => {
    const home = fakeHome();
    const creds = discoverCredentials(join(home, ".claude"), join(home, ".codex"), {});
    expect(creds.anthropic?.baseURL).toBe("https://relay.example");
    expect(creds.anthropic?.model).toBeNull();
    expect(creds.openai?.model).toBe("gpt-x");
    expect(creds.openai?.wireApi).toBe("responses");
  });

  it("默认先用 Claude，探测不通就换 Codex，手动选择优先", () => {
    const home = fakeHome();
    const config = { ...loadConfig({}), claudeConfigDir: join(home, ".claude"), codexHome: join(home, ".codex") };
    const creds = discoverCredentials(config.claudeConfigDir, config.codexHome, {});
    expect(resolveRoute(config, creds, null)).toEqual({ ok: true, route: { provider: "anthropic", model: "claude-opus-5-5" } });
    expect(resolveRoute(config, creds, null, new Set(["anthropic"]))).toEqual({ ok: true, route: { provider: "openai", model: "gpt-x" } });
    expect(resolveRoute(config, creds, "deepseek:deepseek-chat").ok).toBe(false);
  });

  it("只接受本机来的请求", async () => {
    const home = fakeHome();
    const config = { ...loadConfig({}), claudeConfigDir: join(home, ".claude"), codexHome: join(home, ".codex"), accountsDir: tmp(), webDist: join(home, "none") };
    const accounts = new AccountStore(config.accountsDir);
    const chatgpt = new ChatGptSession(accounts, "http://127.0.0.1:8765/auth/callback");
    const credentials = new CredentialStore(config.claudeConfigDir, config.codexHome, accounts);
    const gateway = new LlmGateway({ config, credentials, accounts, chatgpt });
    const app = createApp({ config, gateway, accounts, chatgpt });

    const body = JSON.stringify({ spec: "openai:gpt-x" });
    const ok = await app.request("http://127.0.0.1:8765/api/ai/selection", { method: "POST", body, headers: { host: "127.0.0.1:8765", "content-type": "application/json" } });
    expect(ok.status).toBe(200);
    expect(((await ok.json()) as { model: string }).model).toBe("gpt-x");

    const rebind = await app.request("http://evil.example/api/ai/status", { headers: { host: "evil.example" } });
    expect(rebind.status).toBe(403);
    const crossSite = await app.request("http://127.0.0.1:8765/api/ai/selection", {
      method: "POST",
      body,
      headers: { host: "127.0.0.1:8765", origin: "https://evil.example", "content-type": "application/json" },
    });
    expect(crossSite.status).toBe(403);
  });
});
