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

/** 月份开跑以后，每过一周停多久 */
const WEEK_MS = 1400;

export function useGame() {
  const [game, setGame] = useState<GameState>(() => load() ?? newGame());
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
    if (game.phase !== "running" || game.pending) return;
    const t = window.setTimeout(() => act(tick), WEEK_MS);
    return () => window.clearTimeout(t);
  }, [game, act]);

  return { game, act, restart };
}
