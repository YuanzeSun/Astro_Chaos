import { between, clamp, int, pick, rand, sample, weighted } from "./rng";
import type { Attr, Attrs, GameState, Student } from "./types";
import { GIVEN_NAMES, SURNAMES } from "../data/names";
import { TRAITS, TRAIT_MAP, type Trait } from "../data/traits";
import { BALANCE } from "./balance";

export const ATTRS: Attr[] = ["theory", "observe", "practice", "knowledge"];
export const ATTR_LABEL: Record<Attr, string> = {
  theory: "理论",
  observe: "观测",
  practice: "实测",
  knowledge: "常识",
};

const attrsOf = (fn: (a: Attr) => number) => Object.fromEntries(ATTRS.map((a) => [a, fn(a)])) as Attrs;

export function uniqueName(g: GameState) {
  const taken = new Set(g.students.map((s) => s.name));
  for (let i = 0; i < 50; i++) {
    const name = pick(g, SURNAMES) + pick(g, GIVEN_NAMES);
    if (!taken.has(name)) return name;
  }
  return pick(g, SURNAMES) + pick(g, GIVEN_NAMES) + "二号";
}

function pickTraits(g: GameState): Trait[] {
  const count = weighted(g, [1, 2, 2, 3], () => 1) ?? 2;
  const chosen: Trait[] = [];
  const pool = TRAITS.filter((t) => !t.rare || rand(g) < 0.35);
  for (const t of sample(g, pool, pool.length)) {
    if (chosen.length >= count) break;
    if (chosen.some((c) => c.excludes?.includes(t.id) || t.excludes?.includes(c.id))) continue;
    chosen.push(t);
  }
  return chosen;
}

export function createStudent(g: GameState, enrollYear: number): Student {
  const s: Student = {
    id: `s${g.flags.nextId = (g.flags.nextId ?? 0) + 1}`,
    name: uniqueName(g),
    enrollYear,
    attrs: attrsOf(() => between(g, 8, 24)),
    talent: attrsOf(() => between(g, 0.85, 1.18)),
    stress: between(g, 8, 24),
    grades: between(g, 58, 86),
    traits: [],
    status: "active",
    honors: [],
    hue: int(g, 0, 359),
    quals: [],
  };
  for (const t of pickTraits(g)) {
    s.traits.push(t.id);
    t.init?.(s);
  }
  for (const a of ATTRS) s.attrs[a] = clamp(s.attrs[a], 0, 100);
  return s;
}

export const active = (g: GameState) => g.students.filter((s) => s.status === "active");
export const byId = (g: GameState, id: string | undefined) => g.students.find((s) => s.id === id);
export const traitsOf = (s: Student) => s.traits.map((id) => TRAIT_MAP[id]).filter(Boolean);
export const hasTrait = (s: Student, id: string) => s.traits.includes(id);

export function growthOf(s: Student, a: Attr) {
  return traitsOf(s).reduce((m, t) => m * (t.growth?.[a] ?? 1), s.talent[a]);
}

export function stressScale(s: Student) {
  return traitsOf(s).reduce((m, t) => m * (t.stressScale ?? 1), 1);
}

export function gradesScale(s: Student) {
  return traitsOf(s).reduce((m, t) => m * (t.gradesScale ?? 1), 1);
}

export function outdoorScale(s: Student) {
  return traitsOf(s).reduce((m, t) => m * (t.outdoor ?? 1), 1);
}

/** 高分段越往上越难涨。 */
export function diminishing(v: number) {
  return clamp(BALANCE.dimStart - v / BALANCE.dimSlope, BALANCE.dimFloor, BALANCE.dimStart);
}

export function train(g: GameState, s: Student, gains: Partial<Attrs>, factor = 1) {
  const morale = 0.85 + g.morale / 333;
  for (const [a, base] of Object.entries(gains) as [Attr, number][]) {
    if (!base) continue;
    const delta = base > 0 ? base * BALANCE.growth * growthOf(s, a) * diminishing(s.attrs[a]) * morale * factor : base * factor;
    s.attrs[a] = clamp(s.attrs[a] + delta, 0, 100);
  }
}

export function addStress(s: Student, amount: number) {
  const scaled = amount > 0 ? amount * stressScale(s) : amount;
  s.stress = clamp(s.stress + scaled, 0, 120);
}

export function addGrades(s: Student, amount: number) {
  const scaled = amount < 0 ? amount * gradesScale(s) : amount;
  s.grades = clamp(s.grades + scaled, 0, 100);
}

export const overall = (s: Student) => ATTRS.reduce((sum, a) => sum + s.attrs[a], 0) / ATTRS.length;

export function rating(v: number) {
  if (v >= 92) return "S";
  if (v >= 82) return "A";
  if (v >= 70) return "B";
  if (v >= 56) return "C";
  if (v >= 40) return "D";
  return "E";
}

export function gearWord(v: number) {
  if (v >= 80) return "崭新";
  if (v >= 60) return "好用";
  if (v >= 40) return "凑合";
  if (v >= 20) return "有点松";
  return "快散架";
}
