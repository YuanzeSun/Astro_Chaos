import { useCallback, useEffect, useRef, useState } from "react";
import { newGame, tick } from "../engine/game";
import type { GameState } from "../engine/types";
import { parsePlayback, scheduleWeek, type PlaybackSpeed } from "./playback";

const SAVE_KEY = "astro-chaos:v3:save";

function load(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const g = JSON.parse(raw) as GameState;
    return g.version === 3 ? g : null;
  } catch {
    return null;
  }
}

const PLAYBACK_KEY = "astro-chaos:v3:playback";

function loadPlayback() {
  try {
    return parsePlayback(localStorage.getItem(PLAYBACK_KEY));
  } catch {
    return parsePlayback(null);
  }
}

export function useGame() {
  const [game, setGame] = useState<GameState>(() => load() ?? newGame());
  const saveTimer = useRef<number>(0);
  const [playback, setPlayback] = useState(loadPlayback);
  const setSpeed = useCallback((speed: PlaybackSpeed) => setPlayback((p) => ({ ...p, speed })), []);
  const togglePause = useCallback(() => setPlayback((p) => ({ ...p, paused: !p.paused })), []);

  const act = useCallback((fn: (g: GameState) => void) => {
    setGame((prev) => {
      const next = structuredClone(prev);
      fn(next);
      return next;
    });
  }, []);

  const restart = useCallback(() => {
    setGame(newGame());
    setPlayback((p) => ({ ...p, paused: false }));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(PLAYBACK_KEY, JSON.stringify(playback));
    } catch {
      // 无法保存偏好时，本次游戏仍可调整节奏。
    }
  }, [playback]);

  useEffect(() => {
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => localStorage.setItem(SAVE_KEY, JSON.stringify(game)), 200);
  }, [game]);

  useEffect(() => scheduleWeek(game, playback, () => act(tick)), [game, playback, act]);

  return { game, act, restart, playback, setSpeed, togglePause };
}
