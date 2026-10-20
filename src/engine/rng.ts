import type { GameState } from "./types";

/** mulberry32，状态存在 GameState.rng 里，保证存档可复现。 */
export function rand(g: { rng: number }): number {
  let t = (g.rng = (g.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const between = (g: { rng: number }, min: number, max: number) => min + rand(g) * (max - min);
export const int = (g: { rng: number }, min: number, max: number) => Math.floor(between(g, min, max + 1));
export const chance = (g: { rng: number }, p: number) => rand(g) < p;

export function pick<T>(g: { rng: number }, items: readonly T[]): T {
  return items[Math.floor(rand(g) * items.length)];
}

export function weighted<T>(g: { rng: number }, items: readonly T[], weight: (item: T) => number): T | undefined {
  const total = items.reduce((sum, item) => sum + Math.max(0, weight(item)), 0);
  if (total <= 0) return undefined;
  let cursor = rand(g) * total;
  for (const item of items) {
    cursor -= Math.max(0, weight(item));
    if (cursor < 0) return item;
  }
  return items[items.length - 1];
}

export function shuffle<T>(g: { rng: number }, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand(g) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function sample<T>(g: { rng: number }, items: readonly T[], count: number): T[] {
  return shuffle(g, items).slice(0, count);
}

export const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export function newSeed(): number {
  return (Math.random() * 2 ** 32) >>> 0;
}

export type Rng = Pick<GameState, "rng">;
