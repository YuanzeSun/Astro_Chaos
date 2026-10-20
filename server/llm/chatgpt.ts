// Sign in with ChatGPT, with plan usage (OpenAI's program for open-source and locally run apps).
// Copied from Elmsford.
// OAuth 2.0 + OpenID Connect, a public client with PKCE (S256), no secret:
//   - the first sign-in registers this install: client_id=dynamic_agent_client plus a per-install
//     ext_agent_host_id; the callback carries the issued client id (oaiapp_…), kept for later;
//   - scopes ask for identity and for using the ChatGPT plan (chatgpt.tokens.use.direct), with
//     resource=https://api.openai.com/v1 on both the authorize and the token request;
//   - the redirect is an HTTP loopback on 127.0.0.1 with the path /auth/callback;
//   - tokens: access ~1 h, refresh ~30 days and rotated on every refresh; refreshes are serialized;
//   - inference: the public Responses API at https://api.openai.com/v1, access token as bearer.
// Endpoints and parameters follow OpenAI's SIWC docs as described by its open-source adopters;
// this hasn't been run against a real account.

import { createHash, createPublicKey, randomBytes, verify, type JsonWebKeyInput } from "node:crypto";
import type { AccountStore, ChatGptRecord } from "./accounts";

const ISSUER = "https://auth.openai.com";
const AUTHORIZE_URL = `${ISSUER}/api/accounts/authorize`;
const TOKEN_URL = `${ISSUER}/api/accounts/oauth/token`;
const REVOKE_URL = `${ISSUER}/api/accounts/oauth/revoke`;
const JWKS_URL = `${ISSUER}/.well-known/jwks.json`;
export const CHATGPT_API = "https://api.openai.com/v1";
const SCOPES = "openid profile email offline_access resource.invoke chatgpt.tokens.use.direct";
const PLAN_SCOPE = "chatgpt.tokens.use.direct";
const REGISTRATION_CLIENT = "dynamic_agent_client";
const AGENT_NAME = "Astro Chaos";
const PENDING_TTL_MS = 10 * 60_000;
/** Refresh a little before the access token runs out. */
const REFRESH_EARLY_MS = 2 * 60_000;

export type SignInOutcome = "ok" | "noplan" | "denied" | "error";

interface Pending {
  verifier: string;
  nonce: string;
  returnTo: string;
  /** null while registering (the issued id arrives on the callback). */
  clientId: string | null;
  at: number;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in?: number;
  scope?: string;
}

const b64url = (buf: Buffer) => buf.toString("base64url");
const decodePart = (part: string) => JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as Record<string, unknown>;

/** Verify an ID token's signature (RS256 or ES256, keys from the issuer's JWKS) and its claims. */
export async function verifyIdToken(
  token: string,
  expect: { clientId: string; nonce: string; now?: number },
  fetchJson: (url: string) => Promise<unknown> = async (url) => (await fetch(url)).json(),
): Promise<Record<string, unknown>> {
  const [h, p, s] = token.split(".");
  if (!h || !p || !s) throw new Error("malformed id_token");
  const header = decodePart(h) as { alg?: string; kid?: string };
  const claims = decodePart(p);
  const jwks = (await fetchJson(JWKS_URL)) as { keys?: (JsonWebKeyInput["key"] & { kid?: string })[] };
  const jwk = jwks.keys?.find((k) => k.kid === header.kid) ?? (jwks.keys?.length === 1 ? jwks.keys[0] : undefined);
  if (!jwk) throw new Error("id_token signed with an unknown key");
  const key = createPublicKey({ key: jwk, format: "jwk" });
  const data = Buffer.from(`${h}.${p}`);
  const sig = Buffer.from(s, "base64url");
  const ok =
    header.alg === "RS256"
      ? verify("sha256", data, key, sig)
      : header.alg === "ES256"
        ? verify("sha256", data, { key, dsaEncoding: "ieee-p1363" }, sig)
        : false;
  if (!ok) throw new Error("id_token signature doesn't verify");

  const now = (expect.now ?? Date.now()) / 1000;
  const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (claims.iss !== ISSUER) throw new Error("id_token from the wrong issuer");
  if (!aud.includes(expect.clientId)) throw new Error("id_token for another client");
  if (typeof claims.exp !== "number" || claims.exp < now - 60) throw new Error("id_token expired");
  if (claims.nonce !== expect.nonce) throw new Error("id_token nonce mismatch");
  return claims;
}

/** A sensible default from the plan's model catalog: the newest full-size GPT model. */
export function pickDefaultModel(ids: string[]): string | null {
  const version = (id: string) => (/^gpt-(\d+(?:\.\d+)?)/.exec(id)?.[1] ?? "0").split(".").map(Number);
  const usable = ids.filter((id) => /^gpt-\d/.test(id) && !/mini|nano|audio|realtime|image|search|transcribe|tts|preview/.test(id));
  usable.sort((a, b) => {
    const [a1 = 0, a2 = 0] = version(a);
    const [b1 = 0, b2 = 0] = version(b);
    return b1 - a1 || b2 - a2 || a.length - b.length;
  });
  return usable[0] ?? null;
}

export class ChatGptSession {
  private readonly pending = new Map<string, Pending>();
  private refreshing: Promise<string> | null = null;

  constructor(
    private readonly accounts: AccountStore,
    /** http://127.0.0.1:<port>/auth/callback */
    readonly redirectUri: string,
    private readonly http: typeof fetch = fetch,
  ) {}

  record(): ChatGptRecord {
    return this.accounts.chatgpt();
  }

  /** The URL to send the browser to. returnTo is where to land afterwards. */
  start(returnTo: string): string {
    const now = Date.now();
    for (const [k, v] of this.pending) if (now - v.at > PENDING_TTL_MS) this.pending.delete(k);

    const rec = this.accounts.chatgpt();
    const verifier = b64url(randomBytes(32));
    const state = b64url(randomBytes(16));
    const nonce = b64url(randomBytes(16));
    this.pending.set(state, { verifier, nonce, returnTo, clientId: rec.clientId, at: now });

    const q = new URLSearchParams({
      client_id: rec.clientId ?? REGISTRATION_CLIENT,
      response_type: "code",
      redirect_uri: this.redirectUri,
      scope: SCOPES,
      resource: CHATGPT_API,
      code_challenge: b64url(createHash("sha256").update(verifier).digest()),
      code_challenge_method: "S256",
      state,
      nonce,
    });
    if (!rec.clientId) {
      q.set("agent_name_hint", AGENT_NAME);
      q.set("ext_agent_host_id", rec.hostId);
    } else if (rec.email) {
      q.set("login_hint", rec.email);
    }
    return `${AUTHORIZE_URL}?${q.toString()}`;
  }

  private async tokenRequest(form: Record<string, string>): Promise<TokenResponse> {
    const res = await this.http(TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
      body: new URLSearchParams(form).toString(),
    });
    const body = (await res.json().catch(() => ({}))) as TokenResponse & { error?: string; error_description?: string };
    if (!res.ok || !body.access_token) throw Object.assign(new Error(body.error_description ?? body.error ?? `token endpoint ${res.status}`), { status: res.status });
    return body;
  }

  private async catalog(accessToken: string): Promise<string[]> {
    try {
      const res = await this.http(`${CHATGPT_API}/models`, { headers: { authorization: `Bearer ${accessToken}` } });
      const body = (await res.json()) as { data?: { id: string }[] };
      return (body.data ?? []).map((m) => m.id);
    } catch {
      return [];
    }
  }

  /** The browser came back to /auth/callback. */
  async finish(params: URLSearchParams): Promise<{ returnTo: string; outcome: SignInOutcome }> {
    const pending = this.pending.get(params.get("state") ?? "");
    if (!pending) return { returnTo: "/", outcome: "error" };
    this.pending.delete(params.get("state")!);
    const { returnTo } = pending;
    if (params.get("error")) return { returnTo, outcome: params.get("error") === "access_denied" ? "denied" : "error" };

    // The issued client id arrives on the callback when registering; never exchange as dynamic_agent_client.
    const clientId = params.get("client_id") ?? pending.clientId;
    const code = params.get("code");
    if (!code || !clientId || clientId === REGISTRATION_CLIENT) return { returnTo, outcome: "error" };

    try {
      const tokens = await this.tokenRequest({
        grant_type: "authorization_code",
        client_id: clientId,
        code,
        code_verifier: pending.verifier,
        redirect_uri: this.redirectUri,
        resource: CHATGPT_API,
      });
      const claims = tokens.id_token
        ? await verifyIdToken(tokens.id_token, { clientId, nonce: pending.nonce }, async (u) => (await this.http(u)).json())
        : {};
      // Signing in alone doesn't grant use of the plan; the granted scopes must include it.
      const canUsePlan = (tokens.scope ?? "").split(/\s+/).includes(PLAN_SCOPE);
      const rec = this.accounts.chatgpt();
      this.accounts.saveChatgpt({
        ...rec,
        clientId,
        email: typeof claims.email === "string" ? claims.email : rec.email,
        name: typeof claims.name === "string" ? claims.name : rec.name,
        canUsePlan,
        defaultModel: canUsePlan ? pickDefaultModel(await this.catalog(tokens.access_token)) : null,
        tokens: tokens.refresh_token
          ? { access: tokens.access_token, refresh: tokens.refresh_token, expiresAt: Date.now() + (tokens.expires_in ?? 3600) * 1000 }
          : null,
      });
      return { returnTo, outcome: canUsePlan ? "ok" : "noplan" };
    } catch (err) {
      console.error("ChatGPT sign-in failed:", err instanceof Error ? err.message : err);
      return { returnTo, outcome: "error" };
    }
  }

  /** A valid access token, refreshing when it's about to run out. One refresh at a time. */
  async accessToken(): Promise<string> {
    const rec = this.accounts.chatgpt();
    if (!rec.tokens || !rec.clientId) throw new Error("not signed in to ChatGPT");
    if (rec.tokens.expiresAt - Date.now() > REFRESH_EARLY_MS) return rec.tokens.access;
    this.refreshing ??= this.refresh(rec).finally(() => (this.refreshing = null));
    return this.refreshing;
  }

  /** The server said 401: treat the access token as spent. */
  invalidate() {
    const rec = this.accounts.chatgpt();
    if (rec.tokens) this.accounts.saveChatgpt({ ...rec, tokens: { ...rec.tokens, expiresAt: 0 } });
  }

  private async refresh(rec: ChatGptRecord): Promise<string> {
    try {
      const t = await this.tokenRequest({ grant_type: "refresh_token", client_id: rec.clientId!, refresh_token: rec.tokens!.refresh, resource: CHATGPT_API });
      const next = { access: t.access_token, refresh: t.refresh_token ?? rec.tokens!.refresh, expiresAt: Date.now() + (t.expires_in ?? 3600) * 1000 };
      this.accounts.saveChatgpt({ ...this.accounts.chatgpt(), tokens: next });
      return next.access;
    } catch (err) {
      // A refresh token that no longer works means signing in again.
      if ((err as { status?: number }).status === 400 || (err as { status?: number }).status === 401) {
        this.accounts.saveChatgpt({ ...this.accounts.chatgpt(), tokens: null });
      }
      throw err;
    }
  }

  async signOut() {
    const rec = this.accounts.chatgpt();
    if (rec.tokens && rec.clientId) {
      await this.http(REVOKE_URL, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: rec.tokens.refresh, token_type_hint: "refresh_token", client_id: rec.clientId }).toString(),
      }).catch(() => {});
    }
    // Keep the install's host id and issued client id; the next sign-in reuses them.
    this.accounts.saveChatgpt({ ...rec, tokens: null, canUsePlan: false, defaultModel: null });
  }
}
