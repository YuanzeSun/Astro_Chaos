import type { Attrs } from "../engine/types";

export type Category = "理论" | "观测" | "实测" | "常识" | "休整" | "社务";

export interface Activity {
  id: string;
  name: string;
  cat: Category;
  cost: number;
  stress: number;
  grades: number;
  gains: Partial<Attrs>;
  desc: string;
  outdoor?: boolean;
  /** 白天的户外活动，不受月相影响 */
  daytime?: boolean;
  moonLoving?: boolean;
  morale?: number;
  fame?: number;
  money?: number;
  gear?: number;
  requires?: string;
  special?: "recruit" | "sponsor";
}

export const ACTIVITIES: Activity[] = [
  // 理论
  { id: "pastPapers", name: "刷真题", cat: "理论", cost: 20, stress: 7, grades: -1.5, gains: { theory: 3.2, knowledge: 0.6 }, desc: "历年国决真题，越刷越觉得自己不会。" },
  { id: "sphereTrig", name: "球面三角特训", cat: "理论", cost: 0, stress: 9, grades: -1, gains: { theory: 3.8, observe: 0.5 }, desc: "正弦公式、余弦公式、四联公式，背完再说。" },
  { id: "lecture", name: "请研究生讲课", cat: "理论", cost: 320, stress: 3, grades: -0.5, gains: { theory: 2.8, knowledge: 1.4 }, morale: 1, desc: "讲了两个小时，前十分钟大家都听懂了。" },
  { id: "textbook", name: "啃大学教材", cat: "理论", cost: 120, stress: 6, grades: -1, gains: { theory: 3.0, practice: 0.9 }, desc: "一千四百页的天体物理，读完能拿来防身。" },
  // 观测
  { id: "fieldTrip", name: "郊外观测", cat: "观测", cost: 180, stress: 2, grades: -1, gains: { observe: 4.2, practice: 0.8 }, outdoor: true, gear: -2, desc: "背着望远镜坐两小时车，祈祷天别阴。" },
  { id: "rooftop", name: "楼顶观测", cat: "观测", cost: 0, stress: 1, grades: -0.5, gains: { observe: 2.6, knowledge: 0.4 }, outdoor: true, gear: -1, desc: "光污染拉满，木星还是看得见的。" },
  { id: "starHop", name: "认星训练", cat: "观测", cost: 0, stress: 3, grades: -0.5, gains: { observe: 2.3, knowledge: 1.0 }, desc: "对着星图认星座，认到看什么都像猎户座。" },
  { id: "planetarium", name: "天象厅包场", cat: "观测", cost: 450, stress: 0, grades: 0, gains: { observe: 3.0, knowledge: 1.4 }, morale: 2, desc: "天象厅永远是晴天，就是星星有点假。" },
  { id: "moonWatch", name: "月面观测", cat: "观测", cost: 0, stress: 0, grades: -0.5, gains: { observe: 2.2, knowledge: 1.2 }, outdoor: true, moonLoving: true, morale: 1, desc: "满月是深空党的敌人，却是月面党的节日。" },
  { id: "deepSky", name: "深空巡天", cat: "观测", cost: 180, stress: 2, grades: -1, gains: { observe: 5.4, practice: 0.8 }, outdoor: true, gear: -2, requires: "dob", desc: "八寸道布森在手，梅西耶天体随便找。" },
  { id: "astroPhoto", name: "通宵拍星", cat: "观测", cost: 120, stress: 4, grades: -1.5, gains: { observe: 3.2, practice: 3.2 }, outdoor: true, fame: 1, gear: -3, requires: "mount", desc: "拍一夜，处理一周，发朋友圈三秒。" },
  { id: "solar", name: "太阳观测", cat: "观测", cost: 0, stress: 1, grades: 0, gains: { observe: 2.4, knowledge: 1.4 }, outdoor: true, daytime: true, requires: "baader", desc: "巴德膜贴好了吗？再检查一遍。" },
  // 实测
  { id: "dataLab", name: "数据处理", cat: "实测", cost: 0, stress: 6, grades: -1, gains: { practice: 3.4, theory: 0.6 }, desc: "Excel 拟合测光数据，误差棒比数据点还长。" },
  { id: "errorDrill", name: "误差分析特训", cat: "实测", cost: 0, stress: 8, grades: -1, gains: { practice: 3.8, theory: 0.8 }, desc: "有效数字错一位，整题零分。" },
  { id: "python", name: "Python 速成", cat: "实测", cost: 0, stress: 5, grades: -0.5, gains: { practice: 3.0, theory: 0.4 }, desc: "从 print('hello') 一路学到 curve_fit。" },
  { id: "photometry", name: "变星测光", cat: "实测", cost: 80, stress: 4, grades: -1, gains: { practice: 4.6, observe: 1.2 }, outdoor: true, gear: -2, requires: "camera", desc: "给一颗变星测一整晚光变曲线。" },
  // 常识
  { id: "magazine", name: "读《天文爱好者》", cat: "常识", cost: 30, stress: -1, grades: 0, gains: { knowledge: 2.6 }, morale: 0.5, desc: "边角的新闻，可能就是明年的常识题。" },
  { id: "quizBank", name: "背常识题库", cat: "常识", cost: 0, stress: 4, grades: -0.5, gains: { knowledge: 3.4 }, desc: "冥王星哪年被降级的？2006 年，背。" },
  { id: "documentary", name: "看纪录片", cat: "常识", cost: 0, stress: -4, grades: 0, gains: { knowledge: 1.8 }, morale: 2, desc: "看到第三集，睡倒一片。" },
  { id: "history", name: "天文史研读", cat: "常识", cost: 0, stress: 2, grades: 0, gains: { knowledge: 2.6, theory: 0.6 }, desc: "从浑天仪一路读到郭守敬望远镜。" },
  // 休整
  { id: "rest", name: "整周休息", cat: "休整", cost: 0, stress: -14, grades: 1, gains: {}, morale: 3, desc: "什么都不干，也是一种训练。" },
  { id: "werewolf", name: "通宵狼人杀", cat: "休整", cost: 0, stress: -9, grades: -1, gains: { knowledge: 0.4 }, morale: 5, desc: "预言家：我验了北极星，是好人。" },
  { id: "hotpot", name: "社团聚餐", cat: "休整", cost: 300, stress: -11, grades: 0, gains: {}, morale: 7, desc: "锅里涮的是毛肚，嘴里聊的是黑洞。" },
  { id: "selfStudy", name: "回班自习", cat: "休整", cost: 0, stress: -2, grades: 6, gains: {}, morale: -1, desc: "班主任欣慰地点了点头。" },
  // 社务
  { id: "recruit", name: "招新宣讲", cat: "社务", cost: 150, stress: 1, grades: 0, gains: { knowledge: 0.4 }, special: "recruit", desc: "海报上放一张银河照片，骗……招来新人。" },
  { id: "sponsor", name: "拉赞助", cat: "社务", cost: 0, stress: 3, grades: 0, gains: {}, special: "sponsor", desc: "在家长群里发一封声情并茂的赞助申请。" },
  { id: "repair", name: "维修器材", cat: "社务", cost: 200, stress: 1, grades: 0, gains: { practice: 0.8 }, gear: 18, desc: "赤道仪不跟踪了，拆开一看，电池没电。" },
  { id: "outreach", name: "公众观测夜", cat: "社务", cost: 100, stress: 2, grades: 0, gains: { observe: 1.0, knowledge: 0.6 }, outdoor: true, fame: 6, money: 220, morale: 3, gear: -1, desc: "给路人看土星环，收获一百声“哇”。" },
  { id: "popsci", name: "进班科普", cat: "社务", cost: 0, stress: 2, grades: 0, gains: { knowledge: 1.4 }, fame: 3, desc: "给初中部讲大爆炸，被问外星人到底存不存在。" },
];

export const ACTIVITY_MAP: Record<string, Activity> = Object.fromEntries(ACTIVITIES.map((a) => [a.id, a]));

export const CATEGORIES: Category[] = ["理论", "观测", "实测", "常识", "休整", "社务"];
