import { useEffect, useMemo, useState } from "react";
import type { Attr, GameState, HistoryPoint } from "../engine/types";
import { ATTRS, ATTR_LABEL } from "../engine/students";
import { CN_NUM, MONTHS } from "../engine/calendar";
import { CONTEST_MAP } from "../data/contests";
import { displayScore } from "../engine/contests";
import { LineChart, PairChart, type Series, type XPoint } from "./charts";

const COLORS: Record<Attr, string> = { theory: "#3987e5", observe: "#d95926", practice: "#199e70", knowledge: "#c98500" };
const ONE = "#3987e5";
const TWO = "#d95926";

const pointLabel = (p: HistoryPoint) => (p.t === 0 ? `第${CN_NUM[p.year]}年 开学` : `第${CN_NUM[p.year]}年 ${MONTHS[p.month]}月底`);
const pointTick = (p: HistoryPoint) => {
  if (p.t === 0) return "开学";
  if (p.month === 11) return `${CN_NUM[p.year]}年末`;
  return p.month % 3 === 2 ? `${MONTHS[p.month]}月` : undefined;
};

const yuan = (v: number) => `¥${Math.round(v).toLocaleString("zh-CN")}`;

export function Stats({ g, onClose }: { g: GameState; onClose: () => void }) {
  const history = useMemo(() => g.history ?? [], [g.history]);
  const log = g.contestLog ?? [];
  const [who, setWho] = useState<string>("team");
  const [table, setTable] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // 出现在记录里的人：在社的在前
  const people = useMemo(() => {
    const seen = new Set(history.flatMap((p) => Object.keys(p.members)));
    return g.students.filter((s) => seen.has(s.id)).sort((a, b) => Number(b.status === "active") - Number(a.status === "active"));
  }, [g.students, history]);

  const x: XPoint[] = history.map((p) => ({ label: pointLabel(p), tick: pointTick(p) }));
  const pick = (p: HistoryPoint) => (who === "team" ? { attrs: p.team, stress: p.stress } : p.members[who] ?? null);

  const abilities: Series[] = ATTRS.map((a) => ({ key: a, name: ATTR_LABEL[a], color: COLORS[a], values: history.map((p) => pick(p)?.attrs[a] ?? null) }));
  const stress: Series[] = [{ key: "stress", name: "压力", color: ONE, values: history.map((p) => pick(p)?.stress ?? null) }];
  const club: Series[] = [
    { key: "morale", name: "士气", color: ONE, values: history.map((p) => p.morale) },
    { key: "fame", name: "声望", color: TWO, values: history.map((p) => p.fame) },
  ];
  const money: Series[] = [{ key: "money", name: "经费", color: ONE, values: history.map((p) => p.money) }];

  const pairs = log.map((e) => {
    const def = CONTEST_MAP[e.contest];
    return {
      label: `第${CN_NUM[e.year]}年 ${def.short}`,
      tick: def.short,
      sub: `${CN_NUM[e.year]}年`,
      a: e.best,
      b: e.rival,
      aNote: `${e.bestName}${e.award ? ` ${e.award}` : ""}`,
      bNote: "实验中学",
    };
  });
  const scoreText = (v: number, i: number) => {
    const def = CONTEST_MAP[log[i].contest];
    return `${displayScore(def, v).toFixed(1)}${def.fullMark ? ` / ${def.fullMark}` : ""}`;
  };

  const enough = history.length >= 2;
  const name = who === "team" ? "全社平均" : g.students.find((s) => s.id === who)?.name;

  return (
    <div className="scrim" role="dialog" aria-modal="true" aria-labelledby="stats-title" onClick={onClose}>
      <div className="card stats" onClick={(e) => e.stopPropagation()}>
        <div className="stats-head">
          <h2 id="stats-title">统计</h2>
          <div className="speed" role="group" aria-label="显示方式">
            <button type="button" aria-pressed={!table} onClick={() => setTable(false)}>
              曲线
            </button>
            <button type="button" aria-pressed={table} onClick={() => setTable(true)}>
              表格
            </button>
          </div>
        </div>

        {!enough ? (
          <p className="dim">过完第一个月，这里就有曲线了。</p>
        ) : (
          <>
            <section className="stats-section">
              <div className="who" role="group" aria-label="看谁">
                <button type="button" className="chip" aria-pressed={who === "team"} onClick={() => setWho("team")}>
                  全社平均
                </button>
                {people.map((s) => (
                  <button key={s.id} type="button" className={`chip${s.status === "active" ? "" : " gone"}`} aria-pressed={who === s.id} onClick={() => setWho(s.id)}>
                    {s.name}
                  </button>
                ))}
              </div>
              {table ? (
                <div className="table-wrap">
                  <table className="stats-table">
                    <thead>
                      <tr>
                        <th>{name}</th>
                        {ATTRS.map((a) => (
                          <th key={a}>{ATTR_LABEL[a]}</th>
                        ))}
                        <th>压力</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((p) => {
                        const v = pick(p);
                        return (
                          <tr key={p.t}>
                            <td>{pointLabel(p)}</td>
                            {ATTRS.map((a) => (
                              <td key={a}>{v ? v.attrs[a].toFixed(1) : "—"}</td>
                            ))}
                            <td>{v ? Math.round(v.stress) : "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="stats-row wide">
                  <LineChart title={`${name}的能力`} series={abilities} x={x} height={230} />
                  <LineChart title={`${name}的压力`} series={stress} x={x} domain={[0, 120]} height={230} format={(v) => `${Math.round(v)}`} band={[95, 120]} />
                </div>
              )}
            </section>

            <section className="stats-section">
              {table ? (
                <div className="table-wrap">
                  <table className="stats-table">
                    <thead>
                      <tr>
                        <th>社团</th>
                        <th>士气</th>
                        <th>声望</th>
                        <th>经费</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((p) => (
                        <tr key={p.t}>
                          <td>{pointLabel(p)}</td>
                          <td>{Math.round(p.morale)}</td>
                          <td>{Math.round(p.fame)}</td>
                          <td>{yuan(p.money)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {log.length ? (
                    <table className="stats-table">
                      <thead>
                        <tr>
                          <th>比赛</th>
                          <th>我们的最高分</th>
                          <th>实验中学</th>
                        </tr>
                      </thead>
                      <tbody>
                        {log.map((e, i) => (
                          <tr key={i}>
                            <td>{pairs[i].label}</td>
                            <td>
                              {scoreText(e.best, i)}　{pairs[i].aNote}
                            </td>
                            <td>{e.rival === null ? "—" : scoreText(e.rival, i)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : null}
                </div>
              ) : (
                <>
                  <div className="stats-row">
                    <LineChart title="士气和声望" series={club} x={x} domain={[0, 100]} format={(v) => `${Math.round(v)}`} />
                    <LineChart title="经费" series={money} x={x} zero format={yuan} />
                  </div>
                  {pairs.length ? (
                    <PairChart title="比赛：我们的最高分和实验中学" points={pairs} names={["我们", "实验中学"]} colors={[ONE, TWO]} format={scoreText} />
                  ) : null}
                </>
              )}
            </section>
          </>
        )}

        <div className="card-foot">
          <button type="button" className="primary" onClick={onClose}>
            好了
          </button>
        </div>
      </div>
    </div>
  );
}

