export type Attr = "theory" | "observe" | "practice" | "knowledge";
export type Attrs = Record<Attr, number>;

export type WeatherId = "clear" | "fair" | "cloudy" | "overcast" | "rain";
export type MoonPhase = 0 | 1 | 2 | 3; // 新月 上弦 满月 下弦

export type StudentStatus = "active" | "quit" | "pulled" | "graduated";

export interface Honor {
  year: number;
  contest: string;
  award: string;
  score: number;
}

export interface Student {
  id: string;
  name: string;
  enrollYear: number;
  attrs: Attrs;
  talent: Attrs;
  stress: number;
  grades: number;
  traits: string[];
  status: StudentStatus;
  leftNote?: string;
  honors: Honor[];
  hue: number;
  /** 本学年拿到的参赛资格，例如 "final" "camp" "team" */
  quals: string[];
}

export interface Candidate {
  student: Student;
  pitch: string;
}

export type ChatFrom = string; // 学生 id、NPC id 或 "system"

export interface ChatMessage {
  id: number;
  from: ChatFrom;
  text: string;
  tone?: "good" | "bad" | "warn" | "info";
  stamp: string;
}

export interface WeekSlot {
  activity: string | null;
  forecast: WeatherId;
  weather?: WeatherId;
  moon: MoonPhase;
  sky?: string; // 当周天象 id
  contest?: string; // 当周比赛 id
  report?: string;
}

export interface EffectBundle {
  money?: number;
  gear?: number;
  morale?: number;
  fame?: number;
  /** 作用于全体在社学生 */
  stress?: number;
  grades?: number;
  attrs?: Partial<Attrs>;
  /** 只作用于事件主角 */
  self?: {
    stress?: number;
    grades?: number;
    attrs?: Partial<Attrs>;
    addTrait?: string;
    removeTrait?: string;
    leave?: StudentStatus;
    leaveNote?: string;
  };
  flag?: string;
  item?: string;
  /** 招一个人；给字符串时，新人必带这个特性 */
  recruit?: boolean | string;
  contestBuff?: number;
}

export interface PendingEvent {
  kind: "event";
  eventId: string;
  actor?: string;
  partner?: string;
  title: string;
  text: string;
  options: { id: string; label: string; check?: string }[];
  result?: { text: string; good: boolean; summary: string };
}

export interface ContestResultRow {
  studentId: string;
  name: string;
  sections: Partial<Record<Attr, number>>;
  score: number;
  award: string | null;
  qualifies: boolean;
}

export interface PendingContest {
  kind: "contest";
  contestId: string;
  weather?: WeatherId;
  venue: "field" | "dome";
  participants: string[];
  bonus: Partial<Record<Attr, number>>;
  played: string[];
  nights: number;
  nightOptions: string[];
  nightLog: string[];
  results?: ContestResultRow[];
  rival?: { name: string; score: number; award: string | null };
  /** 小游戏战绩，用于成就 */
  games: { kind: string; correct: number; wrong: number; total: number }[];
}

export interface DraftState {
  kind: "draft";
  picks: number;
  candidates: Candidate[];
  chosen: string[];
}

export type Pending = PendingEvent | PendingContest | DraftState;

export interface GameState {
  version: 3;
  seed: number;
  rng: number;
  year: number;
  month: number; // 0..11 对应 9 月到次年 8 月
  week: number; // 0..3
  phase: "plan" | "running" | "ending";
  money: number;
  gear: number;
  morale: number;
  fame: number;
  items: string[];
  students: Student[];
  slots: WeekSlot[];
  chat: ChatMessage[];
  chatSeq: number;
  pending: Pending | null;
  flags: Record<string, number>;
  cooldowns: Record<string, number>;
  stats: Record<string, number>;
  contestBuff: number;
  rival: { coach: string; student: string; quals: string[]; offset: number };
  queue: Pending[];
  ending?: string;
  unlocked: string[];
  clock: number; // 绝对周数
  /** 月初快照，用来写月底小结 */
  monthBase?: { attrs: Attrs; stress: number; money: number };
}
