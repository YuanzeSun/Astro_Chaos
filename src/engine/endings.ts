import type { GameState } from "./types";

const honorsOf = (g: GameState) => g.students.flatMap((s) => s.honors);

export function decideEnding(g: GameState): string {
  const honors = honorsOf(g);
  const has = (contest: string, award?: string) => honors.some((h) => h.contest === contest && (!award || h.award === award));
  if (has("ioaa", "金牌")) return "gold";
  if (has("ioaa", "银牌") || has("ioaa", "铜牌")) return "medal";
  if (has("ioaa") || has("camp")) return "team";
  if ((g.flags.campReached ?? 0) > 0 || g.students.some((s) => s.quals.includes("camp"))) return "camp";
  if (g.flags.coachTitle) return "coach";
  if (has("final")) return "finalist";
  if ((g.stats.photoNights ?? 0) >= 10 || g.flags["ev:apod"]) return "photo";
  if (!g.students.some((s) => s.status === "active" || s.status === "graduated")) return "alone";
  return "love";
}
