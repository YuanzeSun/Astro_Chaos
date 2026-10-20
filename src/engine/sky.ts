import { chance, rand, weighted } from "./rng";
import type { GameState, MoonPhase, WeatherId } from "./types";
import { SKY_EVENTS, WEATHER, MONTH_WEATHER } from "../data/sky";

export const WEATHER_ORDER: WeatherId[] = ["clear", "fair", "cloudy", "overcast", "rain"];

/** 阴天教徒每人让云量 +1，晴天娃娃每人 -1。 */
export function cloudBias(g: GameState) {
  let bias = 0;
  for (const s of g.students) {
    if (s.status !== "active") continue;
    if (s.traits.includes("cloudCult")) bias += 1;
    if (s.traits.includes("sunny")) bias -= 1;
  }
  return bias;
}

export function rollWeather(g: GameState, month: number, extraBias = 0): WeatherId {
  const base = MONTH_WEATHER[month];
  const bias = cloudBias(g) + extraBias;
  const id = weighted(g, WEATHER_ORDER, (w) => {
    const i = WEATHER_ORDER.indexOf(w);
    const shift = i <= 1 ? -6 * bias : i >= 3 ? 7 * bias : 2 * bias;
    return Math.max(2, base[i] + shift);
  });
  return id ?? "fair";
}

/** 预报大概六成准；剩下的照常重新掷。 */
export function actualWeather(g: GameState, month: number, forecast: WeatherId): WeatherId {
  if (chance(g, 0.6)) return forecast;
  return rollWeather(g, month);
}

const SYNODIC_DAYS = 29.53;

export function moonPhase(g: GameState, clock: number): MoonPhase {
  const offset = (g.seed % 2953) / 100;
  const days = (clock * 7 + offset) % SYNODIC_DAYS;
  return (Math.floor((days / SYNODIC_DAYS) * 4 + 0.5) % 4) as MoonPhase;
}

export const MOON_LABEL = ["新月", "上弦", "满月", "下弦"];
export const MOON_GLYPH = ["🌑", "🌓", "🌕", "🌗"];

/** 户外观测的综合系数：天气 × 月相。 */
export function outdoorFactor(weather: WeatherId, moon: MoonPhase, moonLoving = false) {
  const w = WEATHER[weather].outdoor;
  const m = moonLoving ? [0.7, 1, 1.25, 1][moon] : [1.15, 1, 0.75, 1][moon];
  return w * m;
}

/** 为某一周挑一个天象（流星雨、梅西耶马拉松、彗星……）。 */
export function skyEventFor(g: GameState, month: number, week: number, moon: MoonPhase): string | undefined {
  for (const ev of SKY_EVENTS) {
    if (ev.month !== undefined && ev.month !== month) continue;
    if (ev.week !== undefined && ev.week !== week) continue;
    if (ev.moon !== undefined && ev.moon !== moon) continue;
    if (ev.once && g.flags[`sky:${ev.id}`]) continue;
    if (ev.chance !== undefined && rand(g) > ev.chance) continue;
    if (ev.once) g.flags[`sky:${ev.id}`] = 1;
    return ev.id;
  }
  return undefined;
}
