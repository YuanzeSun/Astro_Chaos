import type { GameState } from "../engine/types";

export const PLAYBACK_SPEEDS = [0.5, 1, 2] as const;
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];
export interface Playback {
  speed: PlaybackSpeed;
  paused: boolean;
}

export function parsePlayback(raw: string | null): Playback {
  try {
    const value = JSON.parse(raw ?? "null");
    return {
      speed: PLAYBACK_SPEEDS.includes(value?.speed) ? value.speed : 1,
      paused: value?.paused === true,
    };
  } catch {
    return { speed: 1, paused: false };
  }
}

/** 暂停和等待事件时不推进；切换节奏后从完整的一周间隔重新计时。 */
export function scheduleWeek(
  game: Pick<GameState, "phase" | "pending">,
  playback: Playback,
  onTick: () => void,
) {
  if (game.phase !== "running" || game.pending || playback.paused) return;
  const timer = setTimeout(onTick, 1400 / playback.speed);
  return () => clearTimeout(timer);
}
