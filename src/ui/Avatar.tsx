import { NPCS } from "../data/npcs";
import type { Student } from "../engine/types";

export function Avatar({ student, npc, size }: { student?: Student; npc?: string; size?: number }) {
  const hue = student?.hue ?? NPCS[npc ?? ""]?.hue ?? 210;
  const glyph = student ? student.name.slice(-1) : (NPCS[npc ?? ""]?.glyph ?? "?");
  const style = { background: `hsl(${hue} 55% 72%)`, ...(size ? { width: size, height: size } : {}) };
  return (
    <span className="avatar" style={style} aria-hidden="true">
      {glyph}
    </span>
  );
}
