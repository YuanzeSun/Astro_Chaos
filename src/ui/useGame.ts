import { useCallback, useEffect, useRef, useState } from "react";
import { newGame, tick } from "../engine/game";
import type { GameState } from "../engine/types";

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

export const SPEEDS = { 慢: 1400, 中: 750, 快: 280 } as const;
export type Speed = keyof typeof SPEEDS;

export function useGame() {
  const [game, setGame] = useState<GameState>(() => load() ?? newGame());
  const [speed, setSpeed] = useState<Speed>(() => (localStorage.getItem("astro-chaos:v3:speed") as Speed) || "中");
  const saveTimer = useRef<number>(0);

  const act = useCallback((fn: (g: GameState) => void) => {
    setGame((prev) => {
      const next = structuredClone(prev);
      fn(next);
      return next;
    });
  }, []);

  const restart = useCallback(() => setGame(newGame()), []);

  useEffect(() => {
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => localStorage.setItem(SAVE_KEY, JSON.stringify(game)), 200);
  }, [game]);

  useEffect(() => {
    localStorage.setItem("astro-chaos:v3:speed", speed);
  }, [speed]);

  useEffect(() => {
    if (game.phase !== "running" || game.pending) return;
    const t = window.setTimeout(() => act(tick), SPEEDS[speed]);
    return () => window.clearTimeout(t);
  }, [game, speed, act]);

  return { game, act, restart, speed, setSpeed };
}
