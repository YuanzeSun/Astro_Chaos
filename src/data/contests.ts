import type { Attr } from "../engine/types";

export type GameKind = "quiz" | "calc" | "chart" | "curve";

export interface Section {
  attr: Attr;
  weight: number;
  label: string;
  game: GameKind;
  /** 户外观测，遇阴雨改天象厅 */
  outdoor?: boolean;
  /** 始终在天象厅考 */
  dome?: boolean;
}

export interface Award {
  name: string;
  min: number;
  fame: number;
  money: number;
  /** 获得该奖项即拿到下一轮资格 */
  qual?: string;
}

export interface ContestDef {
  id: string;
  name: string;
  short: string;
  month: number;
  week: number;
  sections: Section[];
  requires?: string;
  /** 本校最多几人入选 */
  schoolCap?: number;
  nights: number;
  awards: Award[];
  /** 额外的资格线：分数够才晋级，和奖项分开 */
  extraQual?: { qual: string; min: number; label: string };
  /** 显示用的满分，默认 100 */
  fullMark?: number;
  /** 倒扣分 */
  negative?: boolean;
  intro: string;
  final?: boolean;
}

export const CONTESTS: ContestDef[] = [
  {
    id: "province",
    name: "省天文竞赛",
    short: "省赛",
    month: 2,
    week: 3,
    nights: 0,
    sections: [
      { attr: "knowledge", weight: 0.5, label: "选择题", game: "quiz" },
      { attr: "theory", weight: 0.3, label: "计算题", game: "calc" },
      { attr: "observe", weight: 0.2, label: "星图题", game: "chart", dome: true },
    ],
    awards: [
      { name: "一等奖", min: 64, fame: 6, money: 300, qual: "final" },
      { name: "二等奖", min: 52, fame: 3, money: 0 },
      { name: "三等奖", min: 40, fame: 1, money: 0 },
    ],
    intro: "省赛一等奖可以直接推送 CNAO 决赛，省得春天再去预赛里被倒扣分。",
  },
  {
    id: "prelim",
    name: "CNAO 预赛",
    short: "预赛",
    month: 6,
    week: 3,
    nights: 0,
    negative: true,
    fullMark: 120,
    sections: [
      { attr: "knowledge", weight: 0.55, label: "选择题", game: "quiz" },
      { attr: "theory", weight: 0.45, label: "计算选择题", game: "calc" },
    ],
    awards: [{ name: "晋级决赛", min: 52, fame: 3, money: 0, qual: "final" }],
    intro: "35 道四选一，答对加四分，答错扣四分。监考老师念完考场纪律，第一题就是冥王星。",
  },
  {
    id: "final",
    name: "CNAO 决赛",
    short: "决赛",
    month: 8,
    week: 1,
    requires: "final",
    nights: 2,
    sections: [
      { attr: "theory", weight: 0.45, label: "理论笔试", game: "calc" },
      { attr: "observe", weight: 0.3, label: "观测", game: "chart", outdoor: true },
      { attr: "practice", weight: 0.25, label: "实测", game: "curve" },
    ],
    awards: [
      { name: "一等奖", min: 75, fame: 12, money: 1200 },
      { name: "二等奖", min: 65, fame: 7, money: 500 },
      { name: "三等奖", min: 55, fame: 4, money: 0 },
      { name: "鼓励奖", min: 45, fame: 1, money: 0 },
    ],
    extraQual: { qual: "camp", min: 80, label: "国家集训队" },
    intro: "五天，一座新城市，一车竞赛生。最后一晚的观测考试，全看老天赏不赏脸。",
  },
  {
    id: "camp",
    name: "国家集训队选拔",
    short: "集训",
    month: 10,
    week: 1,
    requires: "camp",
    schoolCap: 2,
    nights: 1,
    sections: [
      { attr: "theory", weight: 0.5, label: "理论", game: "calc" },
      { attr: "practice", weight: 0.35, label: "数据分析", game: "curve" },
      { attr: "observe", weight: 0.15, label: "天象厅", game: "chart", dome: true },
    ],
    awards: [{ name: "入选国家队", min: 84, fame: 15, money: 2000, qual: "team" }],
    intro: "封闭集训一周。官方选拔标准里写着：团队精神和生活自理能力。",
  },
  {
    id: "ioaa",
    name: "IOAA 国际天文与天体物理奥赛",
    short: "IOAA",
    month: 11,
    week: 2,
    requires: "team",
    nights: 2,
    final: true,
    sections: [
      { attr: "theory", weight: 0.4, label: "Theory", game: "calc" },
      { attr: "observe", weight: 0.25, label: "Observation", game: "chart", outdoor: true },
      { attr: "practice", weight: 0.35, label: "Data Analysis", game: "curve" },
    ],
    awards: [
      { name: "金牌", min: 90, fame: 30, money: 6000 },
      { name: "银牌", min: 84, fame: 20, money: 3000 },
      { name: "铜牌", min: 77, fame: 12, money: 1500 },
      { name: "荣誉提名", min: 69, fame: 6, money: 500 },
    ],
    intro: "开幕式上各国领队交换徽章。领队们今晚要通宵把题目译成中文。",
  },
];

export const CONTEST_MAP: Record<string, ContestDef> = Object.fromEntries(CONTESTS.map((c) => [c.id, c]));

export function contestAt(month: number, week: number) {
  return CONTESTS.find((c) => c.month === month && c.week === week);
}

export const MEDALS = ["金牌", "银牌", "铜牌", "荣誉提名"];
