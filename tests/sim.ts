import { newGame, toggleDraft, confirmDraft, setActivity, startMonth, tick, chooseOption, dismissEvent, closeContest, buy, canUse } from "../src/engine/game";
import type { GameState } from "../src/engine/types";
import { ACTIVITIES, ACTIVITY_MAP } from "../src/data/activities";
import { CONTEST_MAP } from "../src/data/contests";
import { recordGame, resolveNight } from "../src/engine/contests";
import { SHOP } from "../src/data/shop";
import { active } from "../src/engine/students";
import { rand } from "../src/engine/rng";

export type Policy = (g: GameState, week: number) => string;

/** 简单的“认真教练”：缺什么补什么，压力高就休息。 */
export const smartPolicy: Policy = (g, w) => {
  const team = active(g);
  const avgStress = team.reduce((s, x) => s + x.stress, 0) / Math.max(1, team.length);
  const avgGrades = team.reduce((s, x) => s + x.grades, 0) / Math.max(1, team.length);
  if (avgStress > 62) return w % 2 ? "hotpot" : "rest";
  if (avgGrades < 52) return "selfStudy";
  if (g.money < 300 && w === 0) return "sponsor";
  const slot = g.slots[w];
  const clearish = slot.forecast === "clear" || slot.forecast === "fair";
  const attrs = ["theory", "observe", "practice", "knowledge"] as const;
  const avg = (a: (typeof attrs)[number]) => team.reduce((s, x) => s + x.attrs[a], 0) / Math.max(1, team.length);
  const weakest = [...attrs].sort((a, b) => avg(a) - avg(b))[0];
  const options: Record<string, string[]> = {
    theory: ["sphereTrig", "pastPapers", "textbook"],
    observe: clearish ? ["deepSky", "fieldTrip", "rooftop"] : ["starHop", "planetarium"],
    practice: ["photometry", "dataLab", "errorDrill"],
    knowledge: ["quizBank", "magazine"],
  };
  const pickable = options[weakest].filter((id) => canUse(g, ACTIVITY_MAP[id]) && g.money >= ACTIVITY_MAP[id].cost);
  return pickable[0] ?? "starHop";
};

export const randomPolicy: Policy = (g) => {
  const usable = ACTIVITIES.filter((a) => canUse(g, a));
  return usable[Math.floor(rand(g) * usable.length)].id;
};

export interface SimResult {
  ending: string;
  best: string[];
  quits: number;
  money: number;
  weeks: number;
}

export function simulateFull(seed: number, policy: Policy = smartPolicy, minigameSkill = 0.5): GameState {
  const g = newGame(seed);
  let guard = 0;
  while (g.phase !== "ending" && guard++ < 5000) {
    const p = g.pending;
    if (p?.kind === "draft") {
      const sorted = [...p.candidates].sort((a, b) => b.student.attrs.theory - a.student.attrs.theory);
      for (const c of sorted.slice(0, p.picks)) toggleDraft(g, c.student.id);
      confirmDraft(g);
      continue;
    }
    if (p?.kind === "event") {
      if (!p.result) chooseOption(g, p.options[Math.floor(rand(g) * p.options.length)].id);
      if (!p.result) chooseOption(g, p.options[p.options.length - 1].id);
      if (!p.result) chooseOption(g, p.options[0].id);
      dismissEvent(g);
      continue;
    }
    if (p?.kind === "contest") {
      const def = CONTEST_MAP[p.contestId];
      while (p.nights > 0) resolveNight(g, p, p.nightOptions[0]);
      for (const sec of def.sections) {
        const total = 3;
        const correct = Math.round(total * minigameSkill);
        recordGame(p, sec.attr, sec.game, correct, total - correct, total, (correct / total) * 6);
      }
      closeContest(g);
      continue;
    }
    if (g.phase === "plan") {
      // 有钱就买器材
      for (const item of SHOP) if (g.money > item.price + 1500) buy(g, item.id);
      for (let w = 0; w < 4; w++) if (!g.slots[w].contest) setActivity(g, w, policy(g, w));
      startMonth(g);
      continue;
    }
    tick(g);
  }
  g.stats.simWeeks = guard;
  return g;
}

export function simulate(seed: number, policy: Policy, minigameSkill = 0.5): SimResult {
  const g = simulateFull(seed, policy, minigameSkill);
  const guard = g.stats.simWeeks;
  const best = g.students.flatMap((s) => s.honors.map((h) => `${h.contest}:${h.award}`));
  return {
    ending: g.ending ?? "none",
    best: [...new Set(best)],
    quits: g.students.filter((s) => s.status === "quit" || s.status === "pulled").length,
    money: g.money,
    weeks: guard,
  };
}
