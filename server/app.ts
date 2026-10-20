import { existsSync } from "node:fs";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono, type MiddlewareHandler } from "hono";
import { z } from "zod";
import type { ServerConfig } from "./config";
import type { AccountStore } from "./llm/accounts";
import type { ChatGptSession } from "./llm/chatgpt";
import type { LlmGateway } from "./llm/gateway";
import { deepseekProvider } from "./llm/providers";
import { banter, BanterBody } from "./banter";

export interface Services {
  config: ServerConfig;
  gateway: LlmGateway;
  accounts: AccountStore;
  chatgpt: ChatGptSession;
}

const SelectionBody = z.object({ spec: z.string().regex(/^(anthropic|openai|chatgpt|deepseek):\S+$/).nullable() });
const KeyBody = z.object({ key: z.string().trim().min(8).max(400) });
const StartBody = z.object({ returnTo: z.string().url() });

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost"]);

/** Only back to a page of this game on this machine. */
function loopback(url: string): boolean {
  const u = new URL(url);
  return u.protocol === "http:" && LOOPBACK_HOSTS.has(u.hostname);
}

/**
 * This process holds the user's CLI credentials. It only listens on 127.0.0.1; on top of that,
 * refuse requests addressed to another host name (DNS rebinding) or sent from another site.
 */
const sameMachine: MiddlewareHandler = async (c, next) => {
  const host = (c.req.header("host") ?? "").replace(/:\d+$/, "");
  if (!LOOPBACK_HOSTS.has(host)) return c.text("forbidden", 403);
  const origin = c.req.header("origin");
  if (origin && origin !== "null" && !loopback(origin)) return c.text("forbidden", 403);
  return next();
};

async function parse<T>(c: { req: { json: () => Promise<unknown> } }, schema: z.ZodType<T>): Promise<T | null> {
  try {
    const parsed = schema.safeParse(await c.req.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function createApp(s: Services) {
  const { gateway, accounts, chatgpt } = s;
  const app = new Hono();
  app.use("*", sameMachine);

  const view = async () => {
    const rec = chatgpt.record();
    const { selection, resolved } = await gateway.route();
    return {
      model: resolved.ok ? resolved.route.model : null,
      selection,
      chatgpt: { signedIn: Boolean(rec.tokens), canUsePlan: rec.canUsePlan, name: rec.name, email: rec.email },
      deepseek: { connected: Boolean(accounts.deepseekKey()) },
    };
  };

  const api = new Hono();
  api.get("/status", async (c) => c.json(await view()));
  api.get("/models", async (c) => c.json(await gateway.listModels(c.req.query("refresh") === "1")));

  api.post("/selection", async (c) => {
    const b = await parse(c, SelectionBody);
    if (!b) return c.json({ error: "bad request" }, 400);
    accounts.setSelection(b.spec);
    return c.json(await view());
  });

  api.post("/deepseek", async (c) => {
    const b = await parse(c, KeyBody);
    if (!b) return c.json({ error: "bad request" }, 400);
    // Keep only a key that works.
    try {
      await deepseekProvider(b.key).listModels();
    } catch (err) {
      console.error("DeepSeek key check failed:", err instanceof Error ? err.message : err);
      return c.json({ error: "接不上" }, 400);
    }
    accounts.setDeepseekKey(b.key);
    return c.json(await view());
  });

  api.delete("/deepseek", async (c) => {
    accounts.setDeepseekKey(null);
    return c.json(await view());
  });

  api.post("/chatgpt/start", async (c) => {
    const b = await parse(c, StartBody);
    if (!b || !loopback(b.returnTo)) return c.json({ error: "bad request" }, 400);
    return c.json({ url: chatgpt.start(b.returnTo) });
  });

  api.post("/chatgpt/signout", async (c) => {
    await chatgpt.signOut();
    return c.json(await view());
  });

  api.post("/banter", async (c) => {
    const b = await parse(c, BanterBody);
    if (!b) return c.json({ error: "bad request" }, 400);
    try {
      return c.json({ lines: await banter(gateway, b.digest) });
    } catch (err) {
      console.error("banter failed:", err instanceof Error ? err.message.slice(0, 200) : err);
      return c.json({ lines: [] }, 502);
    }
  });

  app.route("/api/ai", api);

  // Sign in with ChatGPT comes back here (an HTTP loopback on 127.0.0.1, path /auth/callback).
  app.get("/auth/callback", async (c) => {
    const { returnTo, outcome } = await chatgpt.finish(new URL(c.req.url).searchParams);
    const back = new URL(returnTo, `http://127.0.0.1:${s.config.port}`);
    back.searchParams.set("chatgpt", outcome);
    return c.redirect(back.toString());
  });

  // The built game (npm run build). In development Vite serves it instead.
  if (existsSync(s.config.webDist)) app.use("/*", serveStatic({ root: s.config.webDist }));
  return app;
}
