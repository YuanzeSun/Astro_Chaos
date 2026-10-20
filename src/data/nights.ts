import type { Attr } from "../engine/types";

export interface NightOutcome {
  text: string;
  stress?: number;
  morale?: number;
  bonus?: Partial<Record<Attr, number>>;
  fame?: number;
}

export interface NightOption {
  id: string;
  label: string;
  /** 只在这些比赛的夜里出现 */
  contests?: string[];
  chance?: number;
  win: NightOutcome;
  lose?: NightOutcome;
}

/** 赛期的夜晚：比赛前一晚怎么过。 */
export const NIGHTS: NightOption[] = [
  { id: "review", label: "赛前串讲", win: { text: "把公式过了一遍。大家都觉得自己又行了。", bonus: { theory: 1.5 }, stress: 3 } },
  { id: "sleep", label: "强制十点睡觉", win: { text: "收手机，关灯。第二天所有人都精神抖擞。", stress: -10 } },
  {
    id: "werewolf",
    label: "通宵狼人杀",
    chance: 0.6,
    win: { text: "和别的省队打成了一片，第二天考场上互相点头致意。", stress: -6, morale: 4 },
    lose: { text: "打到四点。第二天考理论的时候，眼前的公式都在跳舞。", stress: 4, bonus: { theory: -1.5 } },
  },
  {
    id: "gossip",
    label: "去走廊打听情报",
    chance: 0.5,
    win: { text: "隔壁屋的说今年观测考梅西耶天体。押中了！", bonus: { observe: 2 } },
    lose: { text: "情报是假的。还被拉着听了一小时别人的错题。", stress: 3 },
  },
  {
    id: "localFood",
    label: "出门吃当地夜宵",
    chance: 0.75,
    win: { text: "当地的夜宵很好吃。大家吃得很开心。", stress: -6, morale: 3 },
    lose: { text: "吃坏肚子了。第二天考场上频频举手。", stress: 6 },
  },
  {
    id: "sidereal",
    label: "背考试当天的恒星时",
    win: { text: "零时恒星时背熟了，时角换算能省五分钟。", bonus: { theory: 1, observe: 1 } },
  },
  {
    id: "zenithDrill",
    label: "望远镜拆装特训",
    contests: ["final", "ioaa"],
    win: { text: "天顶镜、目镜、寻星镜，闭着眼睛也能装好。", bonus: { observe: 2 } },
  },
  {
    id: "calculator",
    label: "检查计算器",
    chance: 0.7,
    win: { text: "检查出一台带编程功能的，及时换掉了。差点就进不去考场。", bonus: { theory: 1 } },
    lose: { text: "都没问题。但有人发现自己的计算器还在角度制和弧度制之间犹豫。", bonus: { theory: 0.5 } },
  },
  {
    id: "hotelLi",
    label: "去大堂转转",
    chance: 0.5,
    win: { text: "大堂里好像是那位做天文视频的李老师！他问大家有没有一键三连。有，当然有。", morale: 6, fame: 2 },
    lose: { text: "大堂里只有一群在讨论球面三角的家长。", stress: 2 },
  },
  {
    id: "rival",
    label: "和陆老师叙旧",
    chance: 0.5,
    win: { text: "陆老师喝多了，透露他们今年押的是双星轨道。你默默记下了。", bonus: { theory: 1 } },
    lose: { text: "陆老师讲了一晚上他们社新买的赤道仪。你回去失眠了。", stress: 4, morale: -3 },
  },
  {
    id: "aruba",
    label: "阿鲁巴大师挑战",
    chance: 0.8,
    win: { text: "传统项目。大家笑到喘不过气，关系更亲密了。", stress: -8, morale: 5 },
    lose: { text: "有人扭到了腰，第二天弯着腰进了考场。", stress: 4, morale: 2 },
  },
  {
    id: "localSky",
    label: "去看看当地的夜空",
    chance: 0.55,
    win: { text: "这里的天比家里黑多了。大家提前熟悉了地平线和方位。", bonus: { observe: 2 } },
    lose: { text: "阴天。阴天教徒表示：不是我干的。", stress: 2 },
  },
  {
    id: "laundry",
    label: "生活自理特训",
    contests: ["camp"],
    win: { text: "洗衣服，叠被子，煮泡面。选拔标准里那一项稳了。", bonus: { practice: 1 }, stress: -2 },
  },
  {
    id: "culture",
    label: "文化之夜：快板念二十八宿",
    contests: ["ioaa"],
    win: { text: "“角亢氐房心尾箕！”外国选手跟着打拍子。中国队成了当晚的明星。", morale: 6, fame: 3 },
  },
  {
    id: "translate",
    label: "通宵帮领队校对译题",
    contests: ["ioaa"],
    win: { text: "你校对到凌晨四点，抓出两个翻译错误。学生们拿到了更准确的题。", bonus: { theory: 1.5, practice: 1 }, morale: -2 },
  },
  {
    id: "english",
    label: "突击天文英语",
    contests: ["ioaa"],
    win: { text: "declination, right ascension, culmination。观测答题要用英文，至少不会卡在单词上了。", bonus: { observe: 1.5 } },
  },
];
