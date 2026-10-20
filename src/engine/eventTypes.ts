import type { Attr, EffectBundle, GameState, Student, WeekSlot } from "./types";

export interface EventCtx {
  g: GameState;
  slot: WeekSlot;
  actor?: Student;
  partner?: Student;
}

export interface Outcome {
  text: string;
  fx?: EffectBundle;
  /** 群聊里的反应：a 是主角，b 是搭档，其他是 NPC id */
  chat?: [string, string][];
}

export interface Check {
  /** 用哪项能力检定；luck 表示纯随机，dc 为成功概率 */
  attr: Attr | "luck" | "fame" | "morale";
  dc: number;
  /** 谁来检定：主角、全队最强、或者队伍平均 */
  by?: "actor" | "best" | "team";
}

export interface EventOption {
  id: string;
  label: string;
  check?: Check;
  cost?: number;
  showIf?: (ctx: EventCtx) => boolean;
  win: Outcome;
  lose?: Outcome;
}

export interface ChoiceEvent {
  id: string;
  title: string;
  text: string;
  /** 主角需要满足的条件 */
  actor?: (s: Student, ctx: EventCtx) => boolean;
  partner?: boolean;
  when?: (ctx: EventCtx) => boolean;
  weight?: number;
  once?: boolean;
  cooldown?: number;
  options: EventOption[];
}

export interface PassiveEvent {
  id: string;
  text: string;
  actor?: (s: Student, ctx: EventCtx) => boolean;
  when?: (ctx: EventCtx) => boolean;
  weight?: number;
  once?: boolean;
  cooldown?: number;
  fx?: EffectBundle;
  tone?: "good" | "bad" | "warn" | "info";
  chat?: [string, string][];
}
