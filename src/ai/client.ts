import type { GameState } from "../engine/types";
import { active } from "../engine/students";
import { TRAIT_MAP } from "../data/traits";
import { NPCS } from "../data/npcs";
import { dateLabel } from "../engine/calendar";

export interface BanterLine {
  speaker: string;
  text: string;
}

export interface AiStatus {
  model: string | null;
  selection: string | null;
  chatgpt: { signedIn: boolean; canUsePlan: boolean; name: string | null; email: string | null };
  deepseek: { connected: boolean };
}

export type ModelList = { ok: true; models: string[] } | { ok: false } | null;
export type Catalog = Record<"anthropic" | "openai" | "chatgpt" | "deepseek", ModelList>;

const ENABLED_KEY = "astro-chaos:v3:ai";

export function aiEnabled(): boolean {
  return localStorage.getItem(ENABLED_KEY) === "on";
}

export function setAiEnabled(on: boolean) {
  localStorage.setItem(ENABLED_KEY, on ? "on" : "off");
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/ai${path}`, {
    ...init,
    headers: init?.body ? { "content-type": "application/json" } : undefined,
  });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return (await res.json()) as T;
}

const post = <T>(path: string, body: unknown) => call<T>(path, { method: "POST", body: JSON.stringify(body) });

export const ai = {
  status: () => call<AiStatus>("/status"),
  models: (refresh = false) => call<Catalog>(`/models${refresh ? "?refresh=1" : ""}`),
  select: (spec: string | null) => post<AiStatus>("/selection", { spec }),
  connectDeepseek: (key: string) => post<AiStatus>("/deepseek", { key }),
  forgetDeepseek: () => call<AiStatus>("/deepseek", { method: "DELETE" }),
  chatgptStart: (returnTo: string) => post<{ url: string }>("/chatgpt/start", { returnTo }),
  chatgptSignOut: () => post<AiStatus>("/chatgpt/signout", {}),
  banter: async (digest: string) => (await post<{ lines: BanterLine[] }>("/banter", { digest })).lines,
};

/** 把这个月的局势压成一段给模型看的摘要。 */
export function monthDigest(g: GameState, fromChatId: number) {
  const members = active(g).map((s) => ({
    name: s.name,
    traits: s.traits.map((t) => TRAIT_MAP[t]?.name).filter(Boolean),
    stress: Math.round(s.stress),
    grades: Math.round(s.grades),
  }));
  const happened = g.chat
    .filter((m) => m.id > fromChatId)
    .map((m) => (m.from === "system" ? m.text : `${g.students.find((s) => s.id === m.from)?.name ?? NPCS[m.from]?.name ?? m.from}：${m.text}`))
    .slice(-24);
  return JSON.stringify({ date: dateLabel(g.year, g.month), money: g.money, morale: Math.round(g.morale), members, happened });
}

const NPC_BY_NAME: Record<string, string> = { 教导主任: "dean", 班主任: "homeroom", 校长: "principal", 陆老师: "rival", 鱼雷老师: "torpedo" };

/** 把模型给的说话人映射回游戏里的 id，对不上的丢掉。 */
export function speakerId(g: GameState, speaker: string) {
  const s = active(g).find((x) => x.name === speaker);
  if (s) return s.id;
  return NPC_BY_NAME[speaker.replace(/（.*）/, "")];
}
