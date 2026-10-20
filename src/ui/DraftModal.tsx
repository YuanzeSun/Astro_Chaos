import type { DraftState, GameState } from "../engine/types";
import { ATTRS, ATTR_LABEL } from "../engine/students";
import { TRAIT_MAP } from "../data/traits";

function stars(v: number) {
  const n = Math.max(1, Math.min(5, Math.round((v - 2) / 7)));
  return "★".repeat(n) + "☆".repeat(5 - n);
}

export function DraftModal({ g, d, onToggle, onConfirm }: { g: GameState; d: DraftState; onToggle: (id: string) => void; onConfirm: () => void }) {
  const first = g.year === 1 && g.students.length === 0;
  return (
    <div className="scrim" role="dialog" aria-modal="true" aria-labelledby="draft-title">
      <div className="paper">
        <h2 id="draft-title">天文社入社申请表</h2>
        <p className="sub">
          {first ? `选 ${d.picks} 个人，组成你的第一届天文社` : `新学年招新，最多再收 ${d.picks} 个人`}
        </p>
        <div className="forms">
          {d.candidates.map(({ student: s, pitch }) => {
            const on = d.chosen.includes(s.id);
            return (
              <button key={s.id} type="button" className="form" aria-pressed={on} onClick={() => onToggle(s.id)}>
                <b>{s.name}</b>
                <p>“{pitch}”</p>
                <div className="stars">
                  {ATTRS.map((a) => (
                    <span key={a} style={{ display: "contents" }}>
                      <span>{ATTR_LABEL[a]}</span>
                      <i>{stars(s.attrs[a])}</i>
                    </span>
                  ))}
                </div>
                <div className="ftraits">
                  {s.traits.map((t) => (
                    <span key={t} title={TRAIT_MAP[t]?.desc}>
                      {TRAIT_MAP[t]?.name}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
        <div className="card-foot">
          <span className="q-count" style={{ marginRight: "auto", alignSelf: "center" }}>
            已选 {d.chosen.length} / {d.picks}
          </span>
          <button type="button" className="primary" onClick={onConfirm} disabled={d.chosen.length === 0}>
            就你们了
          </button>
        </div>
      </div>
    </div>
  );
}
