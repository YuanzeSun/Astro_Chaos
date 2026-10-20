import type { GameState, Student } from "../engine/types";
import { ATTRS, ATTR_LABEL, rating } from "../engine/students";
import { gradeName } from "../engine/calendar";
import { TRAIT_MAP } from "../data/traits";
import { CONTEST_MAP } from "../data/contests";
import { Avatar } from "./Avatar";

const SHORT_AWARD: Record<string, string> = { 晋级决赛: "进决赛", 入选国家队: "国家队" };

function honorLabel(h: Student["honors"][number]) {
  const c = CONTEST_MAP[h.contest];
  return `${c.short}${SHORT_AWARD[h.award] ?? h.award}`;
}

export function TraitChip({ id }: { id: string }) {
  const t = TRAIT_MAP[id];
  if (!t) return null;
  return (
    <button type="button" className="trait">
      {t.name}
      <span className="tip" role="tooltip">
        {t.desc}
      </span>
    </button>
  );
}

function Member({ s, year }: { s: Student; year: number }) {
  const gone = s.status !== "active";
  const best = s.honors.slice(-3);
  return (
    <article className={`member${gone ? " gone" : ""}`}>
      <div className="member-head">
        <Avatar student={s} />
        <div className="member-name">
          <b>{s.name}</b>
          <small>{gone ? s.leftNote : gradeName(s.enrollYear, year)}</small>
          {best.length ? (
            <div className="honors">
              {best.map((h, i) => (
                <span className="honor" key={i}>
                  {honorLabel(h)}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      {gone ? null : (
        <>
          <div className="meters">
            {ATTRS.map((a) => (
              <Row key={a} label={ATTR_LABEL[a]} value={s.attrs[a]} />
            ))}
          </div>
          <div className="status-row">
            <span>压力</span>
            <div className="bar stress" title={`压力 ${Math.round(s.stress)}`}>
              <i style={{ width: `${Math.min(100, s.stress)}%` }} />
            </div>
            <span>文化课</span>
            <div className="bar grades" title={`文化课 ${Math.round(s.grades)}`}>
              <i style={{ width: `${s.grades}%` }} />
            </div>
          </div>
          <div className="traits">
            {s.traits.map((t) => (
              <TraitChip key={t} id={t} />
            ))}
          </div>
        </>
      )}
    </article>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <>
      <span>{label}</span>
      <div className="bar">
        <i style={{ width: `${value}%` }} />
      </div>
      <em>
        {Math.round(value)}
        <small>{rating(value)}</small>
      </em>
    </>
  );
}

export function Roster({ g }: { g: GameState }) {
  const activeList = g.students.filter((s) => s.status === "active");
  const gone = g.students.filter((s) => s.status !== "active");
  return (
    <div className="roster">
      {activeList.map((s) => (
        <Member key={s.id} s={s} year={g.year} />
      ))}
      {gone.map((s) => (
        <Member key={s.id} s={s} year={g.year} />
      ))}
    </div>
  );
}
