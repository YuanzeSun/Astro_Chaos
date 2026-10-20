import { clamp } from "./rng";
import type { Attr, EffectBundle, GameState, Student } from "./types";
import { active, addGrades, addStress, ATTR_LABEL, train } from "./students";
import { TRAIT_MAP } from "../data/traits";
import { SHOP_MAP } from "../data/shop";
import { recruitOne } from "./roster";

const signed = (v: number, digits = 0) => `${v > 0 ? "+" : ""}${v.toFixed(digits)}`;

/** 应用一组效果，返回给玩家看的简短总结。 */
export function applyEffects(g: GameState, fx: EffectBundle | undefined, actor?: Student): string {
  if (!fx) return "";
  const parts: string[] = [];
  if (fx.money) {
    g.money += fx.money;
    parts.push(`经费 ${signed(fx.money)}`);
  }
  if (fx.gear) {
    g.gear = clamp(g.gear + fx.gear, 0, 100);
    parts.push(`器材 ${signed(fx.gear)}`);
  }
  if (fx.morale) {
    g.morale = clamp(g.morale + fx.morale, 0, 100);
    parts.push(`士气 ${signed(fx.morale)}`);
  }
  if (fx.fame) {
    g.fame = clamp(g.fame + fx.fame, 0, 100);
    parts.push(`声望 ${signed(fx.fame)}`);
  }
  const team = active(g);
  if (fx.attrs) {
    for (const s of team) train(g, s, fx.attrs);
    for (const [a, v] of Object.entries(fx.attrs) as [Attr, number][]) parts.push(`全员${ATTR_LABEL[a]} ${signed(v, 1)}`);
  }
  if (fx.stress) {
    for (const s of team) addStress(s, fx.stress);
    parts.push(`全员压力 ${signed(fx.stress)}`);
  }
  if (fx.grades) {
    for (const s of team) addGrades(s, fx.grades);
    parts.push(`全员文化课 ${signed(fx.grades)}`);
  }
  if (fx.self && actor) {
    const me = fx.self;
    if (me.attrs) {
      train(g, actor, me.attrs);
      for (const [a, v] of Object.entries(me.attrs) as [Attr, number][]) parts.push(`${actor.name}${ATTR_LABEL[a]} ${signed(v, 1)}`);
    }
    if (me.stress) {
      addStress(actor, me.stress);
      parts.push(`${actor.name}压力 ${signed(me.stress)}`);
    }
    if (me.grades) {
      addGrades(actor, me.grades);
      parts.push(`${actor.name}文化课 ${signed(me.grades)}`);
    }
    if (me.addTrait && !actor.traits.includes(me.addTrait)) {
      actor.traits.push(me.addTrait);
      parts.push(`${actor.name}获得「${TRAIT_MAP[me.addTrait]?.name}」`);
    }
    if (me.removeTrait && actor.traits.includes(me.removeTrait)) {
      actor.traits = actor.traits.filter((t) => t !== me.removeTrait);
      parts.push(`${actor.name}失去「${TRAIT_MAP[me.removeTrait]?.name}」`);
    }
    if (me.leave) {
      actor.status = me.leave;
      actor.leftNote = me.leaveNote;
      parts.push(`${actor.name}离开了天文社`);
    }
  }
  if (fx.item && !g.items.includes(fx.item)) {
    g.items.push(fx.item);
    parts.push(`获得${SHOP_MAP[fx.item]?.name ?? fx.item}`);
  }
  if (fx.flag) g.flags[fx.flag] = (g.flags[fx.flag] ?? 0) + 1;
  if (fx.recruit) {
    const s = recruitOne(g, undefined, typeof fx.recruit === "string" ? fx.recruit : undefined);
    if (s) parts.push(`${s.name}入社`);
  }
  if (fx.contestBuff) {
    g.contestBuff = clamp(g.contestBuff + fx.contestBuff, -10, 10);
    parts.push(`下场比赛状态 ${signed(fx.contestBuff)}`);
  }
  return parts.join("，");
}

export function fillNames(text: string, names: Record<string, string | undefined>) {
  return text.replace(/\{(\w+)\}/g, (_, k) => names[k] ?? "某位社员");
}
