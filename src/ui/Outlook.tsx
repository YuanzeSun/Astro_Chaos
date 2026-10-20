import { memo, useMemo } from "react";
import type { GameState } from "../engine/types";
import { CONTEST_MAP, CONTESTS, type ContestDef } from "../data/contests";
import { displayScore, projectedScore, rivalAt } from "../engine/contests";
import { CN_NUM, MONTHS, nextContest } from "../engine/calendar";
import { LineChart, type XPoint } from "./charts";

const US = "#3987e5";
const THEM = "#d95926";

function bestNow(g: GameState, def: ContestDef) {
  const team = g.students.filter((s) => s.status === "active");
  const pool = def.requires ? team.filter((s) => s.quals.includes(def.requires!)) : team;
  const ranked = (pool.length ? pool : team)
    .map((s) => ({ s, v: projectedScore(def, s.attrs, s.stress, g.morale) }))
    .sort((a, b) => b.v - a.v);
  return ranked[0];
}

/** 主界面的走势：全社最强的人在下一场比赛的期望成绩、实验中学的王牌、奖线。 */
export const Outlook = memo(function Outlook({ g }: { g: GameState }) {
  const next = nextContest(CONTESTS, g.phase === "running" ? g.clock + 1 : g.clock);
  const data = useMemo(() => {
    if (!next) return null;
    const def = next.contest;
    const history = g.history ?? [];
    const best = bestNow(g, def);
    if (!best) return null;
    const show = (v: number) => displayScore(def, v);
    const points = history.map((p) => {
      const top = Math.max(...Object.values(p.members).map((m) => projectedScore(def, m.attrs, m.stress, p.morale)));
      return { label: p.t === 0 ? `第${CN_NUM[p.year]}年 开学` : `第${CN_NUM[p.year]}年 ${MONTHS[p.month]}月底`, us: show(top), them: show(rivalAt(g, Math.max(0, p.t * 4 - 1))) };
    });
    points.push({ label: "现在", us: show(best.v), them: show(rivalAt(g, g.clock)) });
    const recent = points.slice(-13);
    const x: XPoint[] = recent.map((p, i) => ({ label: p.label, tick: i === recent.length - 1 ? "现在" : i === 0 ? (recent.length >= 13 ? "一年前" : "开学") : undefined }));
    const awards = def.awards;
    const top = awards[0];
    const low = awards[awards.length - 1];
    const refs = [{ v: show(top.min), label: top.name }, ...(low !== top ? [{ v: show(low.min), label: low.name }] : [])];
    const gap = show(top.min) - show(best.v);
    // 只看有数据和奖线的那一段，免得线挤在一起
    const values = [...recent.flatMap((p) => [p.us, p.them]), ...refs.map((r) => r.v)];
    const span = (def.fullMark ?? 100) / 10;
    const lo = Math.max(0, Math.floor((Math.min(...values) - span / 2) / span) * span);
    const hi = Math.min(def.fullMark ?? 100, Math.ceil((Math.max(...values) + span / 2) / span) * span);
    return { def, recent, x, refs, best, gap, weeks: next.weeks, domain: [lo, hi] as [number, number] };
  }, [g, next]);

  if (!data) return null;
  const { def, recent, x, refs, best, gap, weeks, domain } = data;
  const line =
    gap <= 0
      ? `${best.s.name}预计 ${displayScore(def, best.v).toFixed(0)}，够得着${def.awards[0].name}。`
      : `${best.s.name}预计 ${displayScore(def, best.v).toFixed(0)}，离${def.awards[0].name}还差 ${gap.toFixed(0)} 分。`;
  return (
    <section className="outlook-card" aria-label="比赛走势">
      <div className="outlook-head">
        <b>{CONTEST_MAP[def.id].short}走势</b>
        <span>{weeks === 0 ? "本周开考" : `还有 ${weeks} 周`}</span>
      </div>
      <LineChart
        title=""
        series={[
          { key: "us", name: "我们最强", color: US, values: recent.map((p) => p.us) },
          { key: "them", name: "实验中学", color: THEM, values: recent.map((p) => p.them) },
        ]}
        x={x}
        domain={domain}
        height={132}
        compact
        refs={refs}
        format={(v) => v.toFixed(1)}
      />
      <p>{line}</p>
    </section>
  );
});
