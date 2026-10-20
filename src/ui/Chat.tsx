import { useEffect, useRef } from "react";
import type { GameState } from "../engine/types";
import { NPCS } from "../data/npcs";
import { Avatar } from "./Avatar";

export function Chat({ g }: { g: GameState }) {
  const ref = useRef<HTMLDivElement>(null);
  const last = g.chat[g.chat.length - 1]?.id;
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [last]);
  return (
    <div className="chat" ref={ref} aria-live="polite">
      {g.chat.map((m) => {
        if (m.from === "system") {
          return (
            <div key={m.id} className={`sys ${m.tone ?? ""}`}>
              <time>{m.stamp}</time>
              {m.text}
            </div>
          );
        }
        const student = g.students.find((s) => s.id === m.from);
        const name = student?.name ?? NPCS[m.from]?.name ?? m.from;
        return (
          <div key={m.id} className={`msg${m.from === "me" ? " me" : ""}`}>
            <Avatar student={student} npc={student ? undefined : m.from} />
            <div className="bubble">
              <small>{name}</small>
              <p>{m.text}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
