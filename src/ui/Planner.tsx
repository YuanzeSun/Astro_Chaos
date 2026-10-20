import { useEffect, useMemo, useState } from "react";
import type { GameState } from "../engine/types";
import { ACTIVITIES, ACTIVITY_MAP, CATEGORIES, type Activity, type Category } from "../data/activities";
import { CONTEST_MAP } from "../data/contests";
import { SKY_EVENT_MAP, WEATHER } from "../data/sky";
import { SHOP_MAP } from "../data/shop";
import { canUse, plannedCost } from "../engine/game";
import { schoolWeek, CN_NUM } from "../engine/calendar";
import { MOON_GLYPH, MOON_LABEL } from "../engine/sky";
import { ATTR_LABEL } from "../engine/students";
import type { Attr } from "../engine/types";
import { SPEEDS, type Speed } from "./useGame";

interface Props {
  g: GameState;
  onSet: (week: number, id: string | null) => void;
  onStart: () => void;
  onShop: () => void;
  speed: Speed;
  onSpeed: (s: Speed) => void;
}

function Gains({ a }: { a: Activity }) {
  const parts = (Object.entries(a.gains) as [Attr, number][]).map(([k, v]) => (
    <span key={k} className="plus">
      {ATTR_LABEL[k]}+{v}{" "}
    </span>
  ));
  if (a.stress) parts.push(<span key="s" className={a.stress > 0 ? "minus" : "plus"}>压力{a.stress > 0 ? "+" : ""}{a.stress} </span>);
  if (a.grades >= 2) parts.push(<span key="g" className="plus">文化课+{a.grades} </span>);
  if (a.fame) parts.push(<span key="f" className="plus">声望+{a.fame} </span>);
  if (a.gear && a.gear > 0) parts.push(<span key="e" className="plus">器材+{a.gear} </span>);
  if (a.special === "recruit") parts.push(<span key="r" className="plus">可能招到人 </span>);
  if (a.special === "sponsor") parts.push(<span key="m" className="plus">拉到经费 </span>);
  return <div className="act-gain">{parts}</div>;
}

export function Planner({ g, onSet, onStart, onShop, speed, onSpeed }: Props) {
  const planning = g.phase === "plan";
  const firstEmpty = g.slots.findIndex((s) => !s.contest && !s.activity);
  const [focus, setFocus] = useState(firstEmpty >= 0 ? firstEmpty : 0);
  const [cat, setCat] = useState<Category>("理论");

  useEffect(() => {
    if (planning) {
      const i = g.slots.findIndex((s) => !s.contest && !s.activity);
      const fallback = g.slots.findIndex((s) => !s.contest);
      setFocus(i >= 0 ? i : Math.max(0, fallback));
    }
    // 只在换月时重置焦点
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.month, g.year, planning]);

  const acts = useMemo(() => ACTIVITIES.filter((a) => a.cat === cat && canUse(g, a)), [cat, g]);
  const cost = plannedCost(g);

  function pickActivity(id: string) {
    if (!planning || g.slots[focus]?.contest) return;
    onSet(focus, id);
    const next = g.slots.findIndex((s, i) => i !== focus && !s.contest && !s.activity);
    if (next >= 0) setFocus(next);
  }

  return (
    <>
      <div className="weeks">
        {g.slots.map((slot, i) => {
          const contest = slot.contest ? CONTEST_MAP[slot.contest] : undefined;
          const exam = schoolWeek(g.month, i);
          const sky = slot.sky ? SKY_EVENT_MAP[slot.sky] : undefined;
          const done = g.phase === "running" && i < g.week;
          const now = g.phase === "running" && i === g.week - 1;
          const shown = slot.weather ?? slot.forecast;
          const a = slot.activity ? ACTIVITY_MAP[slot.activity] : undefined;
          const cls = [
            "week",
            a || contest ? "filled" : "",
            contest ? "locked" : "",
            planning && focus === i && !contest ? "focus" : "",
            now ? "now" : "",
            done && !now ? "done" : "",
          ].join(" ");
          return (
            <button
              key={i}
              type="button"
              className={cls}
              onClick={() => planning && !contest && setFocus(i)}
              onDoubleClick={() => planning && !contest && onSet(i, null)}
              aria-label={`第${CN_NUM[i + 1]}周`}
            >
              <div className="week-head">
                <span>第{CN_NUM[i + 1]}周</span>
                <span title={MOON_LABEL[slot.moon]}>{MOON_GLYPH[slot.moon]}</span>
              </div>
              <div className="week-forecast" title={slot.weather ? "实际天气" : "天气预报"}>
                <span>{WEATHER[shown].glyph}</span>
                <span>{slot.weather ? WEATHER[shown].name : `预报${WEATHER[shown].name}`}</span>
              </div>
              <div className="week-tags">
                {contest ? <span className="tag contest">{contest.short}</span> : null}
                {exam ? <span className="tag exam">{exam.label}</span> : null}
                {sky ? <span className="tag celestial">{sky.name}</span> : null}
              </div>
              <div className={`week-act${a || contest ? "" : " empty"}`}>
                {contest ? contest.name : a ? a.name : planning ? "空着就休息" : "休息"}
              </div>
              {slot.report && done ? <div className="week-report">{slot.report}</div> : null}
            </button>
          );
        })}
      </div>

      <div className="plan-bar">
        {planning ? (
          <>
            <p>
              本月花费 <b className="num">¥{cost}</b>，账上 <b className="num">¥{g.money}</b>
            </p>
            <button type="button" className="primary" onClick={onStart} disabled={Boolean(g.pending)}>
              开始这个月
            </button>
          </>
        ) : (
          <>
            <p>这个月正在进行……</p>
            <div className="speed" role="group" aria-label="播放速度">
              {(Object.keys(SPEEDS) as Speed[]).map((s) => (
                <button key={s} type="button" aria-pressed={speed === s} onClick={() => onSpeed(s)}>
                  {s}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {planning ? (
        <>
          <div className="cats" role="group" aria-label="活动类别">
            {CATEGORIES.map((c) => (
              <button key={c} type="button" className="cat" aria-pressed={cat === c} onClick={() => setCat(c)}>
                {c}
              </button>
            ))}
          </div>
          <div className="acts">
            {acts.map((a) => (
              <button key={a.id} type="button" className="act" onClick={() => pickActivity(a.id)} disabled={Boolean(g.slots[focus]?.contest)}>
                <div className="act-top">
                  <b>
                    {a.name}
                    {a.outdoor ? <span className="tag celestial" style={{ marginLeft: 6 }}>看天</span> : null}
                  </b>
                  <span className="num">{a.cost ? `¥${a.cost}` : "免费"}</span>
                </div>
                <p>{a.desc}</p>
                <Gains a={a} />
              </button>
            ))}
          </div>
        </>
      ) : null}

      <div className="shelf">
        <h3>器材</h3>
        <div className="owned">
          {g.items.map((id) => (
            <span key={id} className="tag">
              {SHOP_MAP[id]?.name}
            </span>
          ))}
          <span className="tag">器材状态 {Math.round(g.gear)}</span>
          <button type="button" className="ghost" onClick={onShop} disabled={!planning}>
            逛器材店
          </button>
        </div>
      </div>
    </>
  );
}
