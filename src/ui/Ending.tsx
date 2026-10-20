import type { GameState } from "../engine/types";
import { ENDING_MAP, ENDINGS } from "../data/endings";
import { ACHIEVEMENTS } from "../data/achievements";
import { CONTEST_MAP } from "../data/contests";
import { SkyStrip } from "./SkyStrip";
import type { Profile } from "./profile";

const RANK: Record<string, number> = { 金牌: 9, 银牌: 8, 铜牌: 7, 荣誉提名: 6, 入选国家队: 5, 一等奖: 4, 二等奖: 3, 三等奖: 2, 鼓励奖: 1, 晋级决赛: 0.5 };
const CONTEST_RANK: Record<string, number> = { ioaa: 50, camp: 40, final: 30, prelim: 10, province: 5 };

export function Ending({ g, profile, onRestart }: { g: GameState; profile: Profile; onRestart: () => void }) {
  const ending = ENDING_MAP[g.ending ?? "love"];
  const people = g.students
    .map((s) => {
      const best = [...s.honors].sort((a, b) => CONTEST_RANK[b.contest] + (RANK[b.award] ?? 0) - (CONTEST_RANK[a.contest] + (RANK[a.award] ?? 0)))[0];
      return { s, best };
    })
    .sort((a, b) => (b.best ? CONTEST_RANK[b.best.contest] + RANK[b.best.award] : 0) - (a.best ? CONTEST_RANK[a.best.contest] + RANK[a.best.award] : 0));
  return (
    <div className="ending" role="dialog" aria-modal="true" aria-labelledby="ending-title">
      <div className="sky">
        <SkyStrip month={11} week={1} weather={ending.tone === "bad" ? "overcast" : "clear"} moon={0} lightPollution={false} dome={false} />
      </div>
      <div className="ending-body">
        <h2 id="ending-title" className={ending.tone === "gold" ? "gold" : ""}>
          {ending.title}
        </h2>
        <p className="story">{ending.text}</p>
        <div className="ledger">
          {people.map(({ s, best }) => (
            <div key={s.id}>
              <b>{s.name}</b>
              <span>{best ? `${CONTEST_MAP[best.contest].short}${best.award}` : s.status === "active" || s.status === "graduated" ? "在楼顶看过很多星星" : s.leftNote}</span>
            </div>
          ))}
        </div>
        <h3 style={{ fontSize: 14, margin: "0 0 8px" }}>结局 {profile.endings.length}/{ENDINGS.length}　成就 {profile.achievements.length}/{ACHIEVEMENTS.length}</h3>
        <div className="badges" style={{ marginBottom: 28 }}>
          {ACHIEVEMENTS.map((a) => (
            <span key={a.id} className={`badge${profile.achievements.includes(a.id) ? " on" : ""}`} title={a.desc}>
              {profile.achievements.includes(a.id) ? a.name : "？？？"}
            </span>
          ))}
        </div>
        <button type="button" className="primary" onClick={onRestart}>
          再带一届
        </button>
      </div>
    </div>
  );
}
