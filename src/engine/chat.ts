import { pick, sample } from "./rng";
import type { ChatMessage, GameState, Student } from "./types";
import { MONTHS, CN_NUM } from "./calendar";
import { GENERIC_VOICE, TRAIT_MAP, type Voice } from "../data/traits";
import { active } from "./students";

const CHAT_LIMIT = 260;

export function say(g: GameState, from: string, text: string, tone?: ChatMessage["tone"]) {
  g.chatSeq += 1;
  g.chat.push({
    id: g.chatSeq,
    from,
    text,
    tone,
    stamp: `${MONTHS[g.month]}月第${CN_NUM[Math.min(g.week, 3) + 1]}周`,
  });
  if (g.chat.length > CHAT_LIMIT) g.chat.splice(0, g.chat.length - CHAT_LIMIT);
}

export const system = (g: GameState, text: string, tone?: ChatMessage["tone"]) => say(g, "system", text, tone);

export function lineFor(g: GameState, s: Student, voice: Voice): string {
  const own = s.traits.flatMap((t) => TRAIT_MAP[t]?.voice?.[voice] ?? []);
  const pool = own.length && g.rng % 3 !== 0 ? own : [...own, ...GENERIC_VOICE[voice]];
  return pick(g, pool);
}

/** 让 1~count 个学生在群里冒泡。 */
export function react(g: GameState, voice: Voice, count = 1, who?: Student[]) {
  const pool = who ?? active(g);
  if (!pool.length) return;
  // 有专属台词的人优先开口
  const eager = pool.filter((s) => s.traits.some((t) => TRAIT_MAP[t]?.voice?.[voice]));
  const speakers = sample(g, eager.length ? eager : pool, count);
  for (const s of speakers) say(g, s.id, lineFor(g, s, voice));
}
