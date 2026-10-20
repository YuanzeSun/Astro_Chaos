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
  /** 每个月都能选 */
  basic?: boolean;
  /** 只在这些月份出现（学年月份，9 月是 0） */
  months?: number[];
  /** 本月有这些天象时才出现 */
  sky?: string[];
  /** 进随机池的权重；不写就是 1 */
  weight?: number;
  /** 一个月里最多排一周 */
  once?: boolean;
}

export const ACTIVITIES: Activity[] = [
  // 理论
  { id: "pastPapers", basic: true, name: "刷真题", cat: "理论", cost: 20, stress: 7, grades: -1.5, gains: { theory: 3.2, knowledge: 0.6 }, desc: "历年国决真题，越刷越觉得自己不会。" },
  { id: "sphereTrig", basic: true, name: "球面三角特训", cat: "理论", cost: 0, stress: 9, grades: -1, gains: { theory: 3.8, observe: 0.5 }, desc: "正弦公式、余弦公式、四联公式，背完再说。" },
  { id: "lecture", name: "请研究生讲课", cat: "理论", cost: 320, stress: 3, grades: -0.5, gains: { theory: 2.8, knowledge: 1.4 }, morale: 1, desc: "讲了两个小时，前十分钟大家都听懂了。" },
  { id: "textbook", name: "啃大学教材", cat: "理论", cost: 120, stress: 6, grades: -1, gains: { theory: 3.0, practice: 0.9 }, desc: "一千四百页的天体物理，读完能拿来防身。" },
  // 观测
  { id: "fieldTrip", name: "郊外观测", cat: "观测", cost: 180, stress: 2, grades: -1, gains: { observe: 4.2, practice: 0.8 }, outdoor: true, gear: -2, desc: "背着望远镜坐两小时车，祈祷天别阴。" },
  { id: "rooftop", basic: true, name: "楼顶观测", cat: "观测", cost: 0, stress: 1, grades: -0.5, gains: { observe: 2.6, knowledge: 0.4 }, outdoor: true, gear: -1, desc: "光污染拉满，木星还是看得见的。" },
  { id: "starHop", basic: true, name: "认星训练", cat: "观测", cost: 0, stress: 3, grades: -0.5, gains: { observe: 2.3, knowledge: 1.0 }, desc: "对着星图认星座，认到看什么都像猎户座。" },
  { id: "planetarium", name: "天象厅包场", cat: "观测", cost: 450, stress: 0, grades: 0, gains: { observe: 3.0, knowledge: 1.4 }, morale: 2, desc: "天象厅永远是晴天，就是星星有点假。" },
  { id: "moonWatch", name: "月面观测", cat: "观测", cost: 0, stress: 0, grades: -0.5, gains: { observe: 2.2, knowledge: 1.2 }, outdoor: true, moonLoving: true, morale: 1, desc: "满月是深空党的敌人，却是月面党的节日。" },
  { id: "deepSky", name: "深空巡天", cat: "观测", cost: 180, stress: 2, grades: -1, gains: { observe: 5.4, practice: 0.8 }, outdoor: true, gear: -2, requires: "dob", desc: "八寸道布森在手，梅西耶天体随便找。" },
  { id: "astroPhoto", name: "通宵拍星", cat: "观测", cost: 120, stress: 4, grades: -1.5, gains: { observe: 3.2, practice: 3.2 }, outdoor: true, fame: 1, gear: -3, requires: "mount", desc: "拍一夜，处理一周，发朋友圈三秒。" },
  { id: "solar", name: "太阳观测", cat: "观测", cost: 0, stress: 1, grades: 0, gains: { observe: 2.4, knowledge: 1.4 }, outdoor: true, daytime: true, requires: "baader", desc: "巴德膜贴好了吗？再检查一遍。" },
  // 实测
  { id: "dataLab", basic: true, name: "数据处理", cat: "实测", cost: 0, stress: 6, grades: -1, gains: { practice: 3.4, theory: 0.6 }, desc: "Excel 拟合测光数据，误差棒比数据点还长。" },
  { id: "errorDrill", name: "误差分析特训", cat: "实测", cost: 0, stress: 8, grades: -1, gains: { practice: 3.8, theory: 0.8 }, desc: "有效数字错一位，整题零分。" },
  { id: "python", name: "Python 速成", cat: "实测", cost: 0, stress: 5, grades: -0.5, gains: { practice: 3.0, theory: 0.4 }, desc: "从 print('hello') 一路学到 curve_fit。" },
  { id: "photometry", name: "变星测光", cat: "实测", cost: 80, stress: 4, grades: -1, gains: { practice: 4.6, observe: 1.2 }, outdoor: true, gear: -2, requires: "camera", desc: "给一颗变星测一整晚光变曲线。" },
  // 常识
  { id: "magazine", basic: true, name: "读《天文爱好者》", cat: "常识", cost: 30, stress: -1, grades: 0, gains: { knowledge: 2.6 }, morale: 0.5, desc: "边角的新闻，可能就是明年的常识题。" },
  { id: "quizBank", basic: true, name: "背常识题库", cat: "常识", cost: 0, stress: 4, grades: -0.5, gains: { knowledge: 3.4 }, desc: "冥王星哪年被降级的？2006 年，背。" },
  { id: "documentary", name: "看纪录片", cat: "常识", cost: 0, stress: -4, grades: 0, gains: { knowledge: 1.8 }, morale: 2, desc: "看到第三集，睡倒一片。" },
  { id: "history", name: "天文史研读", cat: "常识", cost: 0, stress: 2, grades: 0, gains: { knowledge: 2.6, theory: 0.6 }, desc: "从浑天仪一路读到郭守敬望远镜。" },
  // 休整
  { id: "rest", basic: true, name: "整周休息", cat: "休整", cost: 0, stress: -14, grades: 1, gains: {}, morale: 3, desc: "什么都不干，也是一种训练。" },
  { id: "werewolf", name: "通宵狼人杀", cat: "休整", cost: 0, stress: -9, grades: -1, gains: { knowledge: 0.4 }, morale: 5, desc: "预言家：我验了北极星，是好人。" },
  { id: "hotpot", name: "社团聚餐", cat: "休整", cost: 300, stress: -11, grades: 0, gains: {}, morale: 7, desc: "锅里涮的是毛肚，嘴里聊的是黑洞。" },
  { id: "selfStudy", basic: true, name: "回班自习", cat: "休整", cost: 0, stress: -2, grades: 6, gains: {}, morale: -1, desc: "班主任欣慰地点了点头。" },
  // 社务
  { id: "recruit", name: "招新宣讲", cat: "社务", cost: 150, stress: 1, grades: 0, gains: { knowledge: 0.4 }, special: "recruit", desc: "海报上放一张银河照片，骗……招来新人。" },
  { id: "sponsor", basic: true, name: "拉赞助", cat: "社务", cost: 0, stress: 3, grades: 0, gains: {}, special: "sponsor", desc: "在家长群里发一封声情并茂的赞助申请。" },
  { id: "repair", basic: true, name: "维修器材", cat: "社务", cost: 200, stress: 1, grades: 0, gains: { practice: 0.8 }, gear: 18, desc: "赤道仪不跟踪了，拆开一看，电池没电。" },
  { id: "outreach", name: "公众观测夜", cat: "社务", cost: 100, stress: 2, grades: 0, gains: { observe: 1.0, knowledge: 0.6 }, outdoor: true, fame: 6, money: 220, morale: 3, gear: -1, desc: "给路人看土星环，收获一百声“哇”。" },
  { id: "popsci", name: "进班科普", cat: "社务", cost: 0, stress: 2, grades: 0, gains: { knowledge: 1.4 }, fame: 3, desc: "给初中部讲大爆炸，被问外星人到底存不存在。" },

  // —— 季节和限定 ——
  { id: "lenghu", name: "国庆远征冷湖", cat: "观测", cost: 1500, stress: -4, grades: 0, gains: { observe: 8.5, practice: 2.2, knowledge: 1.2 }, outdoor: true, morale: 6, gear: -4, months: [1], once: true, desc: "青海冷湖，国内最好的天文台址之一。坐两天火车，看到的银河能投下影子。" },
  { id: "midAutumn", name: "中秋赏月", cat: "休整", cost: 80, stress: -8, grades: 0, gains: { knowledge: 1.2, observe: 1 }, outdoor: true, moonLoving: true, morale: 5, months: [0, 1], once: true, desc: "月饼、望远镜和环形山。有人问月饼上的图案是哪个月海。" },
  { id: "winterSky", name: "冬夜看猎户座", cat: "观测", cost: 60, stress: 3, grades: -0.5, gains: { observe: 4.4, knowledge: 1 }, outdoor: true, months: [3, 4, 5], desc: "冬季星空最热闹的时候，前提是手指还在。" },
  { id: "hometownSky", name: "回老家看星", cat: "观测", cost: 0, stress: -8, grades: 0, gains: { observe: 3.6, knowledge: 0.8 }, outdoor: true, morale: 3, months: [5], once: true, desc: "过年回乡下，没有路灯，抬头就是银河。顺便躲开二姨。" },
  { id: "winterCamp", name: "寒假集训营", cat: "理论", cost: 900, stress: 10, grades: 0, gains: { theory: 5, practice: 2, knowledge: 1 }, months: [5], desc: "封闭一周，上午讲题，下午考试，晚上订正。" },
  { id: "mockExam", name: "预赛模考", cat: "常识", cost: 60, stress: 7, grades: -0.5, gains: { knowledge: 3.4, theory: 2 }, months: [5, 6], desc: "按真实赛制，答错倒扣。考完有人的分数是负的。" },
  { id: "examReview", name: "期末复习周", cat: "休整", cost: 0, stress: 4, grades: 9, gains: {}, months: [3, 4, 9, 10], desc: "望远镜收起来，五三拿出来。" },
  { id: "deptOpenDay", name: "大学天文系开放日", cat: "常识", cost: 120, stress: -2, grades: 0, gains: { knowledge: 2.4, theory: 1.4 }, morale: 4, months: [7, 8], once: true, desc: "教授说：天文系不怎么看星星，主要看数据。" },
  { id: "xinglong", name: "兴隆观测站参观", cat: "观测", cost: 800, stress: 0, grades: 0, gains: { observe: 4.8, practice: 3, knowledge: 1 }, outdoor: true, morale: 4, months: [10, 11], once: true, desc: "去看郭守敬望远镜。值班的老师让大家摸了摸圆顶。" },
  { id: "summerCamp", name: "暑期天文夏令营", cat: "理论", cost: 1200, stress: 4, grades: 0, gains: { theory: 3, observe: 3, practice: 3, knowledge: 2 }, morale: 4, months: [10, 11], desc: "全国各地的竞赛生住在一起，白天听课，晚上打狼人杀。" },
  { id: "graduation", name: "毕业生欢送会", cat: "休整", cost: 200, stress: -10, grades: 0, gains: { knowledge: 0.4 }, morale: 7, months: [9], once: true, desc: "高三的学长学姐要走了。有人把望远镜盖子签满了名字。" },
  { id: "meteorWatch", name: "流星雨守夜", cat: "观测", cost: 40, stress: -6, grades: -1, gains: { observe: 3.2, knowledge: 1.2 }, outdoor: true, morale: 4, sky: ["perseids", "geminids", "quadrantids"], once: true, desc: "铺好防潮垫，裹好睡袋，躺着数流星。" },
  { id: "planetariumTalk", name: "天文馆讲座", cat: "常识", cost: 100, stress: -2, grades: 0, gains: { knowledge: 2.8, theory: 0.8 }, morale: 2, weight: 0.6, desc: "讲的是系外行星。提问环节，有人问能不能移民过去。" },
  { id: "alumniTalk", name: "学长回校讲题", cat: "理论", cost: 0, stress: 3, grades: 0, gains: { theory: 2.8, knowledge: 1 }, morale: 2, weight: 0.6, desc: "进过国家队的学长回来了，讲了一道他当年没做出来的题。" },
  { id: "observatoryNight", name: "借天文台的望远镜", cat: "观测", cost: 300, stress: 1, grades: -1, gains: { observe: 5.2, practice: 1.6 }, outdoor: true, morale: 3, weight: 0.4, once: true, desc: "大学天文台空出来一晚，一米口径，看什么都很震撼。" },
  { id: "bojiangClass", name: "蹭啵酱天文的公开课", cat: "实测", cost: 0, stress: 3, grades: 0, gains: { practice: 1.8, knowledge: 0.4 }, morale: 2, weight: 0.4, desc: "听两个小时，挑出十一处错误。误差分析练得不错。" },
];

export const ACTIVITY_MAP: Record<string, Activity> = Object.fromEntries(ACTIVITIES.map((a) => [a.id, a]));

export const CATEGORIES: Category[] = ["理论", "观测", "实测", "常识", "休整", "社务"];

/** 不是每个月都有的活动，界面上标一下 */
export const isSpecial = (a: Activity) => Boolean(a.months || a.sky || (a.weight !== undefined && a.weight < 1));
