import { describe, expect, it } from "vitest";
import { newGame } from "../src/engine/game";
import { simulate, simulateFull, smartPolicy, randomPolicy } from "./sim";
import { questionsFor } from "../src/engine/minigames";
import { QUIZ } from "../src/data/quiz";
import { CHOICE_EVENTS } from "../src/data/events";
import { PASSIVE_EVENTS } from "../src/data/passives";
import { SYSTEM_EVENTS } from "../src/data/systemEvents";
import { TRAIT_MAP } from "../src/data/traits";
import { SHOP_MAP } from "../src/data/shop";
import { ACTIVITIES, ACTIVITY_MAP, CATEGORIES } from "../src/data/activities";
import type { GameKind } from "../src/data/contests";

describe("引擎", () => {
  it("同一个种子开出同一局", () => {
    expect(JSON.stringify(newGame(7))).toEqual(JSON.stringify(newGame(7)));
  });

  it("随便怎么玩都能走到结局", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const r = simulate(seed, seed % 2 ? smartPolicy : randomPolicy, (seed % 5) / 4);
      expect(r.ending).not.toBe("none");
      expect(r.weeks).toBeLessThan(5000);
    }
  });

  it("存档可以序列化", () => {
    const g = newGame(99);
    expect(JSON.parse(JSON.stringify(g))).toEqual(g);
  });
});

describe("小游戏", () => {
  const kinds: GameKind[] = ["quiz", "calc", "chart", "curve"];
  it("题目选项唯一，答案在范围内", () => {
    const rng = { rng: 12345 };
    for (let i = 0; i < 300; i++) {
      for (const kind of kinds) {
        for (const q of questionsFor(rng, kind, (i % 3) + 1, i % 2 === 0)) {
          expect(q.options).toHaveLength(4);
          expect(new Set(q.options).size).toBe(4);
          expect(q.answer).toBeGreaterThanOrEqual(0);
          expect(q.answer).toBeLessThan(4);
          for (const o of q.options) expect(o).not.toMatch(/NaN|undefined|Infinity/);
        }
      }
    }
  });

  it("常识题库格式正确", () => {
    for (const item of QUIZ) {
      expect(new Set(item.options).size).toBe(4);
      expect(item.answer).toBeGreaterThanOrEqual(0);
      expect(item.answer).toBeLessThan(4);
    }
  });
});

describe("内容", () => {
  const allChoice = [...CHOICE_EVENTS, ...SYSTEM_EVENTS];
  it("事件 id 不重复", () => {
    const ids = [...allChoice, ...PASSIVE_EVENTS].map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("事件引用的特性和物品都存在", () => {
    for (const ev of allChoice) {
      for (const o of ev.options) {
        for (const out of [o.win, o.lose]) {
          if (!out?.fx) continue;
          if (out.fx.item) expect(SHOP_MAP[out.fx.item], `${ev.id} item`).toBeTruthy();
          if (out.fx.self?.addTrait) expect(TRAIT_MAP[out.fx.self.addTrait], `${ev.id} trait`).toBeTruthy();
        }
      }
    }
  });

  it("文本里只用 {a} {b} 两个占位符", () => {
    const texts = [
      ...allChoice.flatMap((e) => [e.text, ...e.options.flatMap((o) => [o.label, o.win.text, o.lose?.text ?? ""])]),
      ...PASSIVE_EVENTS.map((e) => e.text),
    ];
    for (const t of texts) expect(t.replace(/\{a\}|\{b\}/g, "")).not.toMatch(/\{\w+\}/);
  });

  it("每个月每一类都有活动可选，而且基础活动都在", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const r = simulateFull(seed, smartPolicy);
      expect(r.offer?.length ?? 0).toBeGreaterThan(0);
    }
    const g = newGame(5);
    for (const cat of CATEGORIES) expect(g.offer!.some((id) => ACTIVITY_MAP[id].cat === cat), cat).toBe(true);
    for (const a of ACTIVITIES) if (a.basic) expect(g.offer).toContain(a.id);
  });

  it("活动解锁需要的器材都在商店里", () => {
    for (const a of ACTIVITIES) if (a.requires) expect(SHOP_MAP[a.requires], a.id).toBeTruthy();
  });
});
