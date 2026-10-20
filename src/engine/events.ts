import { between, chance, pick, rand, weighted } from "./rng";
import type { EventCtx, Outcome, PassiveEvent, ChoiceEvent, Check } from "./eventTypes";
import type { GameState, PendingEvent, Student, WeekSlot } from "./types";
import { active, byId, traitsOf, ATTR_LABEL } from "./students";
import { applyEffects, fillNames } from "./effects";
import { CHOICE_EVENTS } from "../data/events";
import { PASSIVE_EVENTS } from "../data/passives";
import { SYSTEM_EVENTS } from "../data/systemEvents";

const ALL_CHOICES = [...CHOICE_EVENTS, ...SYSTEM_EVENTS];
export const CHOICE_MAP: Record<string, ChoiceEvent> = Object.fromEntries(ALL_CHOICES.map((e) => [e.id, e]));

function available(g: GameState, ev: { id: string; once?: boolean; cooldown?: number }) {
  if (ev.once && g.flags[`ev:${ev.id}`]) return false;
  const until = g.cooldowns[ev.id];
  return until === undefined || g.clock >= until;
}

function markUsed(g: GameState, ev: { id: string; once?: boolean; cooldown?: number }) {
  g.flags[`ev:${ev.id}`] = (g.flags[`ev:${ev.id}`] ?? 0) + 1;
  g.cooldowns[ev.id] = g.clock + (ev.cooldown ?? 10);
}

function castActors(g: GameState, slot: WeekSlot, ev: Pick<ChoiceEvent, "actor" | "partner">, forced?: Student) {
  const team = active(g);
  const ctx: EventCtx = { g, slot };
  const actors = forced ? [forced] : team.filter((s) => !ev.actor || ev.actor(s, ctx));
  if (!actors.length) return null;
  const actor = forced ?? pick(g, actors);
  let partner: Student | undefined;
  if (ev.partner) {
    const rest = team.filter((s) => s.id !== actor.id);
    if (!rest.length) return null;
    partner = pick(g, rest);
  }
  return { actor, partner };
}

export function openChoice(g: GameState, slot: WeekSlot, ev: ChoiceEvent, forced?: Student): PendingEvent | null {
  const cast = castActors(g, slot, ev, forced);
  if (!cast) return null;
  const ctx: EventCtx = { g, slot, ...cast };
  const names = { a: cast.actor.name, b: cast.partner?.name };
  markUsed(g, ev);
  return {
    kind: "event",
    eventId: ev.id,
    actor: cast.actor.id,
    partner: cast.partner?.id,
    title: ev.title,
    text: fillNames(ev.text, names),
    options: ev.options
      .filter((o) => !o.showIf || o.showIf(ctx))
      .map((o) => ({ id: o.id, label: fillNames(o.label, names), check: describeCheck(o.check, o.cost) })),
  };
}

function describeCheck(check?: Check, cost?: number) {
  const parts: string[] = [];
  if (cost) parts.push(`¥${cost}`);
  if (check) {
    if (check.attr === "luck") parts.push("看运气");
    else if (check.attr === "fame") parts.push("看声望");
    else if (check.attr === "morale") parts.push("看士气");
    else parts.push(`${ATTR_LABEL[check.attr]}检定`);
  }
  return parts.join(" ") || undefined;
}

export function pickChoiceEvent(g: GameState, slot: WeekSlot): PendingEvent | null {
  const ctx: EventCtx = { g, slot };
  const candidates = CHOICE_EVENTS.filter((ev) => available(g, ev) && (!ev.when || ev.when(ctx)));
  for (let tries = 0; tries < 4 && candidates.length; tries++) {
    const ev = weighted(g, candidates, (e) => e.weight ?? 1);
    if (!ev) break;
    const pending = openChoice(g, slot, ev);
    if (pending) return pending;
    candidates.splice(candidates.indexOf(ev), 1);
  }
  return null;
}

function luckOf(s?: Student) {
  if (!s) return 0;
  return traitsOf(s).reduce((sum, t) => sum + (t.luck ?? 0), 0);
}

function rollCheck(g: GameState, check: Check, actor?: Student): boolean {
  if (check.attr === "luck") return rand(g) < check.dc + luckOf(actor) * 0.025;
  if (check.attr === "fame") return g.fame + between(g, -15, 15) >= check.dc;
  if (check.attr === "morale") return g.morale + between(g, -15, 15) >= check.dc;
  const attr = check.attr;
  const team = active(g);
  let value = actor?.attrs[attr] ?? 0;
  if (check.by === "best") value = Math.max(...team.map((s) => s.attrs[attr]));
  if (check.by === "team") value = team.reduce((sum, s) => sum + s.attrs[attr], 0) / Math.max(1, team.length);
  return value + between(g, -16, 16) + luckOf(actor) >= check.dc;
}

export function resolveChoice(g: GameState, pending: PendingEvent, optionId: string, slot: WeekSlot) {
  const ev = CHOICE_MAP[pending.eventId];
  const option = ev?.options.find((o) => o.id === optionId);
  if (!ev || !option) return null;
  if (option.cost && g.money < option.cost) return null;
  const actor = byId(g, pending.actor);
  const partner = byId(g, pending.partner);
  if (option.cost) g.money -= option.cost;
  const ok = option.check ? rollCheck(g, option.check, actor) : true;
  const outcome: Outcome = ok || !option.lose ? option.win : option.lose;
  const names = { a: actor?.name, b: partner?.name };
  const summary = applyEffects(g, outcome.fx, actor);
  const text = fillNames(outcome.text, names);
  pending.result = { text, good: ok, summary };
  void slot;
  return { ok, text, summary, chat: outcome.chat };
}

export function pickPassive(g: GameState, slot: WeekSlot): { text: string; summary: string; tone: PassiveEvent["tone"] } | null {
  const ctx: EventCtx = { g, slot };
  const candidates = PASSIVE_EVENTS.filter((ev) => available(g, ev) && (!ev.when || ev.when(ctx)));
  const ev = weighted(g, candidates, (e) => e.weight ?? 1);
  if (!ev) return null;
  const cast = castActors(g, slot, ev);
  if (!cast) return null;
  markUsed(g, ev);
  const summary = applyEffects(g, ev.fx, cast.actor);
  return { text: fillNames(ev.text, { a: cast.actor.name }), summary, tone: ev.tone };
}

export const rollEvent = (g: GameState, p: number) => chance(g, p);
