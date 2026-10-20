import { useState } from "react";
import { ACHIEVEMENTS } from "../data/achievements";
import { ENDINGS } from "../data/endings";
import type { Profile } from "./profile";
import { AiAccounts } from "./AiSettings";

interface Props {
  profile: Profile;
  aiOn: boolean;
  onAi: (on: boolean) => void;
  onRestart: () => void;
  onClose: () => void;
}

export function Settings({ profile, aiOn, onAi, onRestart, onClose }: Props) {
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="scrim" role="dialog" aria-modal="true" aria-labelledby="settings-title" onClick={onClose}>
      <div className="card" onClick={(e) => e.stopPropagation()}>
        <h2 id="settings-title">设置</h2>
        <p className="meta">
          结局 {profile.endings.length}/{ENDINGS.length}　成就 {profile.achievements.length}/{ACHIEVEMENTS.length}
        </p>
        <div className="badges" style={{ marginBottom: 22 }}>
          {ACHIEVEMENTS.map((a) => (
            <span key={a.id} className={`badge${profile.achievements.includes(a.id) ? " on" : ""}`} title={a.desc}>
              {profile.achievements.includes(a.id) ? a.name : "？？？"}
            </span>
          ))}
        </div>

        <div className="switch-row">
          <b style={{ fontWeight: 600 }}>AI 群友</b>
          <div className="speed" role="group" aria-label="AI 群友">
            <button type="button" aria-pressed={!aiOn} onClick={() => onAi(false)}>
              关
            </button>
            <button type="button" aria-pressed={aiOn} onClick={() => onAi(true)}>
              开
            </button>
          </div>
        </div>
        {aiOn ? <AiAccounts /> : null}

        <div className="card-foot" style={{ justifyContent: "space-between" }}>
          {confirm ? (
            <button type="button" className="ghost" style={{ borderColor: "var(--redlight)", color: "var(--redlight)" }} onClick={onRestart}>
              这一届不带了
            </button>
          ) : (
            <button type="button" className="ghost" onClick={() => setConfirm(true)}>
              重新带一届
            </button>
          )}
          <button type="button" className="primary" onClick={onClose}>
            好了
          </button>
        </div>
      </div>
    </div>
  );
}
