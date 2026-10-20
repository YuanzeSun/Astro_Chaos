import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { loadConfig } from "./config";
import { AccountStore } from "./llm/accounts";
import { ChatGptSession } from "./llm/chatgpt";
import { CredentialStore, describeCredentials } from "./llm/credentials";
import { LlmGateway } from "./llm/gateway";

const config = loadConfig();
const accounts = new AccountStore(config.accountsDir);
const chatgpt = new ChatGptSession(accounts, `http://127.0.0.1:${config.port}/auth/callback`);
const credentials = new CredentialStore(config.claudeConfigDir, config.codexHome, accounts);
const gateway = new LlmGateway({ config, credentials, accounts, chatgpt });
const app = createApp({ config, gateway, accounts, chatgpt });

// Localhost only: this process holds the user's own CLI credentials.
serve({ fetch: app.fetch, port: config.port, hostname: "127.0.0.1" }, ({ port }) => {
  const creds = describeCredentials(credentials.get());
  console.log(`天文闹赛：http://127.0.0.1:${port}/`);
  console.log(`  Claude: ${creds.anthropic ? `${creds.anthropic.file} → ${creds.anthropic.baseURL}` : "未读到"}`);
  console.log(`  Codex:  ${creds.openai ? `${creds.openai.files.join(" + ")} → ${creds.openai.baseURL} (${creds.openai.wireApi})` : "未读到"}`);
  if (creds.chatgpt) console.log(`  ChatGPT: ${creds.chatgpt.email ?? "已登录"}`);
  if (creds.deepseek) console.log("  DeepSeek: 已接上");
  for (const note of creds.notes) console.log(`  · ${note}`);
});
