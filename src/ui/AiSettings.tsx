import { useCallback, useEffect, useState } from "react";
import { ai, type AiStatus, type Catalog } from "../ai/client";

const GROUPS: [keyof Catalog, string][] = [
  ["anthropic", "Claude"],
  ["openai", "OpenAI"],
  ["chatgpt", "ChatGPT"],
  ["deepseek", "DeepSeek"],
];

const SIGN_IN: Record<string, string> = {
  noplan: "登上了，但这个账号没让用它的 ChatGPT 套餐。",
  denied: "没登上。",
  error: "没登上。",
};

function ModelRow({ status, onChange }: { status: AiStatus; onChange: (s: AiStatus) => void }) {
  const [open, setOpen] = useState(false);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  useEffect(() => {
    if (open && !catalog) void ai.models().then(setCatalog, () => setCatalog({ anthropic: null, openai: null, chatgpt: null, deepseek: null }));
  }, [open, catalog]);
  const pick = (spec: string | null) => {
    void ai.select(spec).then(onChange, () => {});
    setOpen(false);
  };
  return (
    <div className="ai-row">
      <span>模型</span>
      <div>
        <button type="button" className="link" onClick={() => setOpen(!open)}>
          {status.model ?? "—"}
        </button>
        {open ? (
          <div className="choices">
            {!catalog ? (
              <span className="dim">……</span>
            ) : (
              <>
                <div className="options">
                  <button type="button" className={status.selection ? "" : "on"} onClick={() => pick(null)}>
                    默认
                  </button>
                </div>
                {GROUPS.map(([provider, name]) => {
                  const list = catalog[provider];
                  if (!list?.ok || !list.models.length) return null;
                  return (
                    <div key={provider}>
                      <div className="group">{name}</div>
                      <div className="options">
                        {list.models.map((m) => {
                          const spec = `${provider}:${m}`;
                          return (
                            <button key={m} type="button" className={status.selection === spec ? "on" : ""} onClick={() => pick(spec)}>
                              {m}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** 模型、ChatGPT 登录、DeepSeek key。key 只经过本机的服务端，不存在浏览器里。 */
export function AiAccounts() {
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [offline, setOffline] = useState(false);
  const [keyOpen, setKeyOpen] = useState(false);
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(() => {
    const outcome = new URLSearchParams(location.search).get("chatgpt");
    return outcome ? (SIGN_IN[outcome] ?? null) : null;
  });

  const load = useCallback(() => void ai.status().then(setStatus, () => setOffline(true)), []);
  useEffect(() => {
    load();
    if (location.search.includes("chatgpt=")) history.replaceState(null, "", location.pathname);
  }, [load]);

  if (offline) return <p className="dim">要先运行 npm start。</p>;
  if (!status) return <p className="dim">……</p>;

  const signIn = async () => {
    setBusy(true);
    try {
      const { url } = await ai.chatgptStart(location.href.split("?")[0]);
      location.assign(url);
    } catch {
      setNote("没登上。");
      setBusy(false);
    }
  };

  const saveKey = async () => {
    setBusy(true);
    try {
      setStatus(await ai.connectDeepseek(key));
      setKey("");
      setKeyOpen(false);
      setNote(null);
    } catch {
      setNote("这个 key 接不上。");
    }
    setBusy(false);
  };

  const who = status.chatgpt.name ?? status.chatgpt.email;
  return (
    <div className="ai-accounts">
      <ModelRow status={status} onChange={setStatus} />
      <div className="ai-row">
        <span>ChatGPT</span>
        <div>
          {status.chatgpt.signedIn ? (
            <>
              {who ?? "已登录"}
              {!status.chatgpt.canUsePlan ? <span className="dim">　不能用套餐</span> : null}
              <button type="button" className="link" onClick={() => void ai.chatgptSignOut().then(setStatus, () => {})}>
                退出
              </button>
            </>
          ) : (
            <button type="button" className="link" onClick={() => void signIn()} disabled={busy}>
              用 ChatGPT 登录
            </button>
          )}
        </div>
      </div>
      <div className="ai-row">
        <span>DeepSeek</span>
        <div>
          {status.deepseek.connected ? (
            <>
              已接上
              <button type="button" className="link" onClick={() => void ai.forgetDeepseek().then(setStatus, () => {})}>
                去掉
              </button>
            </>
          ) : keyOpen ? (
            <span className="key-row">
              <input
                type="password"
                value={key}
                autoFocus
                autoComplete="off"
                spellCheck={false}
                placeholder="sk-…"
                onChange={(e) => setKey(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && key.trim() && void saveKey()}
              />
              <button type="button" className="link" onClick={() => void saveKey()} disabled={busy || !key.trim()}>
                {busy ? "……" : "接上"}
              </button>
              <button type="button" className="link" onClick={() => setKeyOpen(false)}>
                算了
              </button>
            </span>
          ) : (
            <button type="button" className="link" onClick={() => setKeyOpen(true)}>
              填 API key
            </button>
          )}
        </div>
      </div>
      {note ? <p className="dim">{note}</p> : null}
    </div>
  );
}
