import { useEffect, useState } from "react";
import type { Attr, GameState, WeekSlot } from "../engine/types";
import { ACTIVITIES, ACTIVITY_MAP, CATEGORIES, type Activity } from "../data/activities";
import { CONTEST_MAP } from "../data/contests";
import { SKY_EVENT_MAP, WEATHER } from "../data/sky";
import { SHOP_MAP } from "../data/shop";
import { canUse, plannedCost } from "../engine/game";
import { schoolWeek, CN_NUM } from "../engine/calendar";
import { MOON_GLYPH, MOON_LABEL, outdoorFactor } from "../engine/sky";
import { ATTR_LABEL } from "../engine/students";
import { SPEEDS, type Speed } from "./useGame";

interface Props {
  g: GameState;
  onSet: (week: number, id: string | null) => void;
  onStart: () => void;
  onShop: () => void;
  speed: Speed;
  onSpeed: (s: Speed) => void;
}

type Outlook = "good" | "meh" | "bad" | null;

/** 按这一周的预报和月相，户外活动大概会怎样。 */
function outlook(a: Activity, slot: WeekSlot | undefined): Outlook {
  if (!a.outdoor || !slot) return null;
  const weather = slot.weather ?? slot.forecast;
  let f = a.daytime ? WEATHER[weather].outdoor : outdoorFactor(weather, slot.moon, a.moonLoving);
  if (slot.sky && !a.daytime) f *= SKY_EVENT_MAP[slot.sky].boost;
  if (f === 0) return "bad";
  if (f < 0.8) return "meh";
  if (f >= 1.1) return "good";
  return null;
}

const OUTLOOK_LINE: Record<Exclude<Outlook, null>, string> = {
  good: "这周天好，正适合。",
  meh: "这周的天不太行，收获会打折。",
  bad: "这周预报阴雨，去了多半白跑。",
};

function Gains({ a }: { a: Activity }) {
  const parts = (Object.entries(a.gains) as [Attr, number][]).map(([k, v]) => (
    <span key={k} className="plus">
      {ATTR_LABEL[k]}+{v}
    </span>
  ));
  if (a.stress) parts.push(<span key="s" className={a.stress > 0 ? "minus" : "plus"}>压力{a.stress > 0 ? "+" : ""}{a.stress}</span>);
  if (a.grades >= 2) parts.push(<span key="g" className="plus">文化课+{a.grades}</span>);
  if (a.grades <= -1.5) parts.push(<span key="gm" className="minus">文化课{a.grades}</span>);
  if (a.morale && a.morale >= 2) parts.push(<span key="m" className="plus">士气+{a.morale}</span>);
  if (a.fame) parts.push(<span key="f" className="plus">声望+{a.fame}</span>);
  if (a.gear && a.gear > 0) parts.push(<span key="e" className="plus">器材+{a.gear}</span>);
  if (a.money) parts.push(<span key="y" className="plus">经费+{a.money}</span>);
  if (a.special === "recruit") parts.push(<span key="r" className="plus">可能招到人</span>);
  if (a.special === "sponsor") parts.push(<span key="p" className="plus">拉到经费</span>);
  return <div className="act-gain">{parts}</div>;
}

function Detail({ g, a, slot }: { g: GameState; a: Activity | undefined; slot: WeekSlot | undefined }) {
  if (!a) return <div className="act-detail empty" />;
  const locked = !canUse(g, a);
  const look = outlook(a, slot);
  return (
    <div className="act-detail">
      <div className="act-top">
        <b>{a.name}</b>
        <span className="num">{a.cost ? `¥${a.cost}` : "免费"}</span>
      </div>
      <p>{locked && a.requires ? `要先买${SHOP_MAP[a.requires]?.name}。` : a.desc}</p>
      <Gains a={a} />
      {look && !locked ? <p className={`outlook ${look}`}>{OUTLOOK_LINE[look]}</p> : null}
    </div>
  );
}

function WeekCard({ g, slot, i, focus, planning, onFocus, onClear }: {
  g: GameState;
  slot: WeekSlot;
  i: number;
  focus: boolean;
  planning: boolean;
  onFocus: () => void;
  onClear: () => void;
}) {
  const contest = slot.contest ? CONTEST_MAP[slot.contest] : undefined;
  const exam = schoolWeek(g.month, i);
  const sky = slot.sky ? SKY_EVENT_MAP[slot.sky] : undefined;
  const running = g.phase === "running";
  const done = running && i < g.week;
  const now = running && i === g.week - 1;
  const shown = slot.weather ?? slot.forecast;
  const a = slot.activity ? ACTIVITY_MAP[slot.activity] : undefined;
  const cls = [
    "week",
    a || contest ? "filled" : "",
    contest ? "locked" : "",
    planning && focus && !contest ? "focus" : "",
    now ? "now" : "",
    done && !now ? "done" : "",
  ].join(" ");
  return (
    <div className="week-wrap">
      <button type="button" className={cls} onClick={onFocus} disabled={!planning || Boolean(contest)} aria-label={`第${CN_NUM[i + 1]}周`}>
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
          {planning && a && outlook(a, slot) === "bad" ? <i className="dot bad" title={OUTLOOK_LINE.bad} /> : null}
          {contest ? contest.name : a ? a.name : "休息"}
        </div>
        {done && slot.report ? <div className="week-report">{slot.report}</div> : null}
      </button>
      {planning && a && !contest ? (
        <button type="button" className="week-clear" onClick={onClear} aria-label="清掉这一周">
          ×
        </button>
      ) : null}
    </div>
  );
}

export function Planner({ g, onSet, onStart, onShop, speed, onSpeed }: Props) {
  const planning = g.phase === "plan";
  const [focus, setFocus] = useState(0);
  const [hover, setHover] = useState<string | null>(null);

  // 换月时，焦点放到第一个空着的周
  useEffect(() => {
    if (!planning) return;
    const empty = g.slots.findIndex((s) => !s.contest && !s.activity);
    const free = g.slots.findIndex((s) => !s.contest);
    setFocus(empty >= 0 ? empty : Math.max(0, free));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.month, g.year, planning]);

  const slot = g.slots[focus];
  const current = slot?.activity ? ACTIVITY_MAP[slot.activity] : undefined;
  const shown = hover ? ACTIVITY_MAP[hover] : current;

  function pick(id: string) {
    if (!planning || !slot || slot.contest) return;
    onSet(focus, id);
    const next = g.slots.findIndex((s, i) => i > focus && !s.contest && !s.activity);
    const wrap = g.slots.findIndex((s, i) => i !== focus && !s.contest && !s.activity);
    if (next >= 0) setFocus(next);
    else if (wrap >= 0) setFocus(wrap);
  }

  return (
    <>
      <div className="weeks">
        {g.slots.map((s, i) => (
          <WeekCard
            key={i}
            g={g}
            slot={s}
            i={i}
            focus={focus === i}
            planning={planning}
            onFocus={() => setFocus(i)}
            onClear={() => {
              onSet(i, null);
              setFocus(i);
            }}
          />
        ))}
      </div>

      <div className="plan-bar">
        <p>
          本月花费 <b className="num">¥{plannedCost(g)}</b>，账上 <b className="num">¥{g.money}</b>
        </p>
        <div className="plan-actions">
          <div className="speed" role="group" aria-label="播放速度">
            {(Object.keys(SPEEDS) as Speed[]).map((s) => (
              <button key={s} type="button" aria-pressed={speed === s} onClick={() => onSpeed(s)}>
                {s}
              </button>
            ))}
          </div>
          <button type="button" className="ghost" onClick={onShop} disabled={!planning}>
            器材店
          </button>
          <button type="button" className="primary" onClick={onStart} disabled={!planning || Boolean(g.pending)}>
            {planning ? "开始这个月" : "进行中"}
          </button>
        </div>
      </div>

      <div className={`palette${planning && !slot?.contest ? "" : " idle"}`} onMouseLeave={() => setHover(null)}>
        {CATEGORIES.map((cat) => (
          <div key={cat} className="palette-col">
            <h3>{cat}</h3>
            {ACTIVITIES.filter((a) => a.cat === cat).map((a) => {
              const locked = !canUse(g, a);
              const look = planning ? outlook(a, slot) : null;
              return (
                <button
                  key={a.id}
                  type="button"
                  className={`chip${locked ? " locked" : ""}`}
                  aria-pressed={slot?.activity === a.id}
                  aria-disabled={locked || undefined}
                  disabled={!planning || Boolean(slot?.contest)}
                  onClick={() => !locked && pick(a.id)}
                  onMouseEnter={() => setHover(a.id)}
                  onFocus={() => setHover(a.id)}
                  onBlur={() => setHover(null)}
                >
                  {look ? <i className={`dot ${look}`} aria-hidden="true" /> : null}
                  {a.name}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      {planning ? <Detail g={g} a={shown} slot={slot} /> : null}
    </>
  );
}
