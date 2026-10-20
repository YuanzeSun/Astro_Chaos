import type { MoonPhase, WeatherId } from "../engine/types";

export const WEATHER: Record<WeatherId, { name: string; glyph: string; outdoor: number; stress: number }> = {
  clear: { name: "晴", glyph: "☀️", outdoor: 1.2, stress: -1 },
  fair: { name: "少云", glyph: "🌤️", outdoor: 1, stress: 0 },
  cloudy: { name: "多云", glyph: "⛅", outdoor: 0.6, stress: 0.5 },
  overcast: { name: "阴", glyph: "☁️", outdoor: 0, stress: 1.5 },
  rain: { name: "雨", glyph: "🌧️", outdoor: 0, stress: 2.5 },
};

/** 按学年月份（9 月起）给出 晴/少云/多云/阴/雨 的基础权重。 */
export const MONTH_WEATHER: number[][] = [
  [26, 24, 22, 14, 14],
  [34, 26, 18, 12, 10],
  [30, 24, 20, 16, 10],
  [30, 24, 20, 18, 8],
  [28, 22, 22, 20, 8],
  [24, 22, 22, 20, 12],
  [22, 22, 24, 18, 14],
  [20, 22, 24, 18, 16],
  [20, 22, 22, 18, 18],
  [14, 18, 22, 20, 26],
  [18, 20, 22, 16, 24],
  [22, 22, 22, 14, 20],
];

export interface SkyEvent {
  id: string;
  name: string;
  glyph: string;
  month?: number;
  week?: number;
  moon?: MoonPhase;
  chance?: number;
  once?: boolean;
  /** 当周户外活动的额外系数 */
  boost: number;
  line: string;
}

export const SKY_EVENTS: SkyEvent[] = [
  { id: "perseids", name: "英仙座流星雨", glyph: "☄️", month: 11, week: 1, boost: 1.5, line: "ZHR 一百，实际看到三颗，其中两颗是飞机。" },
  { id: "geminids", name: "双子座流星雨", glyph: "☄️", month: 3, week: 1, boost: 1.5, line: "零下五度，裹着睡袋数流星，数到第七颗手机冻关机了。" },
  { id: "quadrantids", name: "象限仪座流星雨", glyph: "☄️", month: 4, week: 0, boost: 1.3, line: "一个已经不存在的星座，下了一场流星雨。" },
  { id: "messier", name: "梅西耶马拉松", glyph: "🏃", month: 6, moon: 0, boost: 1.6, line: "一夜追完 110 个梅西耶天体，前提是天一直晴。" },
  { id: "lunarEclipse", name: "月全食", glyph: "🌘", moon: 2, chance: 0.04, once: true, boost: 1.4, line: "红月亮升起来了，朋友圈里全是糊成一团的手机照片。" },
  { id: "comet", name: "大彗星", glyph: "☄️", chance: 0.012, once: true, boost: 1.7, line: "彗星就像猫：有尾巴，而且想干嘛就干嘛。预报的亮度永远只是参考。" },
  { id: "marsOpposition", name: "火星冲日", glyph: "🔴", month: 2, chance: 0.35, once: true, boost: 1.3, line: "火星今晚最亮，社群里有人问是不是 UFO。" },
  { id: "aurora", name: "低纬极光", glyph: "🌌", chance: 0.006, once: true, boost: 1.5, line: "北方的天边红了一片，全国天文群同时炸了。" },
  { id: "supermoon", name: "超级月亮", glyph: "🌕", moon: 2, chance: 0.05, boost: 0.9, line: "新闻说是超级月亮，实际只比平时大了一点点，深空党集体沉默。" },
];

export const SKY_EVENT_MAP = Object.fromEntries(SKY_EVENTS.map((e) => [e.id, e]));
