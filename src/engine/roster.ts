import type { GameState, Student } from "./types";
import { active, createStudent, hasTrait } from "./students";
import { react, system } from "./chat";
import { TRAIT_MAP } from "../data/traits";

export const MAX_ACTIVE = 8;

export function enroll(g: GameState, s: Student) {
  s.enrollYear = g.year;
  g.students.push(s);
  react(g, "join", 1, [s]);
  if (hasTrait(s, "rich")) {
    g.money += 1500;
    system(g, `${s.name}的家长赞助了 1500 元。`, "good");
  }
}

export function recruitOne(g: GameState, reason = "加入了天文社。", trait?: string) {
  if (active(g).length >= MAX_ACTIVE) {
    system(g, "活动室已经坐不下了，新人只能下次再来。");
    return null;
  }
  const s = createStudent(g, g.year);
  s.stress = Math.max(4, s.stress - 6);
  if (trait && !s.traits.includes(trait)) {
    const t = TRAIT_MAP[trait];
    s.traits = s.traits.filter((x) => !t.excludes?.includes(x) && !TRAIT_MAP[x]?.excludes?.includes(trait));
    s.traits.push(trait);
    t.init?.(s);
  }
  enroll(g, s);
  system(g, `${s.name}${reason}`, "good");
  return s;
}
