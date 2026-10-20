import type { GameState, PendingEvent } from "../engine/types";
import { CHOICE_MAP } from "../engine/events";
import { byId } from "../engine/students";
import { dateLabel } from "../engine/calendar";
import { Avatar } from "./Avatar";

interface Props {
  g: GameState;
  p: PendingEvent;
  onChoose: (id: string) => void;
  onDone: () => void;
}

export function EventModal({ g, p, onChoose, onDone }: Props) {
  const actor = byId(g, p.actor);
  const def = CHOICE_MAP[p.eventId];
  return (
    <div className="scrim" role="dialog" aria-modal="true" aria-labelledby="ev-title">
      <div className="card">
        <h2 id="ev-title">{p.title}</h2>
        <p className="meta">
          {dateLabel(g.year, g.month, Math.max(0, g.week - 1))}
          {actor && p.text.includes(actor.name) ? (
            <span style={{ marginLeft: 10, display: "inline-flex", alignItems: "center", gap: 6, verticalAlign: "middle" }}>
              <Avatar student={actor} size={20} />
              {actor.name}
            </span>
          ) : null}
        </p>
        <p className="story">{p.text}</p>
        {p.result ? (
          <>
            <div className={`result ${p.result.good ? "good" : "bad"}`}>
              <p>{p.result.text}</p>
              {p.result.summary ? <p className="summary">{p.result.summary}</p> : null}
            </div>
            <div className="card-foot">
              <button type="button" className="primary" onClick={onDone} autoFocus>
                继续
              </button>
            </div>
          </>
        ) : (
          <div className="options">
            {p.options.map((o) => {
              const cost = def?.options.find((x) => x.id === o.id)?.cost ?? 0;
              return (
                <button key={o.id} type="button" className="option" onClick={() => onChoose(o.id)} disabled={cost > g.money}>
                  <span>{o.label}</span>
                  {o.check ? <small>{o.check}</small> : null}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
