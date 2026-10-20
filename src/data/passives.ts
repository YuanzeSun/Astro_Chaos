import type { EventCtx, PassiveEvent } from "../engine/eventTypes";
import type { Student } from "../engine/types";
import { ACTIVITY_MAP } from "./activities";

const has = (s: Student, t: string) => s.traits.includes(t);
const act = (ctx: EventCtx) => (ctx.slot.activity ? ACTIVITY_MAP[ctx.slot.activity] : undefined);
const clearish = (ctx: EventCtx) => ctx.slot.weather === "clear" || ctx.slot.weather === "fair";
const inMonths = (ctx: EventCtx, ...months: number[]) => months.includes(ctx.g.month);

export const PASSIVE_EVENTS: PassiveEvent[] = [
  { id: "dumbbell", text: "社团的望远镜被体育生借去当哑铃举，送修花了三百。", fx: { money: -300, gear: -8 }, tone: "bad", cooldown: 30 },
  { id: "crystalBall", text: "{a}用社团经费买了一颗水晶球，说是“辅助观星”。", actor: (s) => has(s, "astrology"), fx: { money: -200, morale: 2 }, tone: "warn", once: true },
  { id: "softwareUpdate", text: "Stellarium 更新了，终于修好了中文星名的显示。", fx: { attrs: { observe: 0.6 } }, tone: "good", cooldown: 20, when: (ctx) => ctx.g.items.includes("stellarium") },
  { id: "noHomework", text: "全校无作业日。大家第一次在天黑前就到了楼顶。", fx: { stress: -6 }, tone: "good", cooldown: 16 },
  { id: "perfectNight", text: "罕见的一夜：透明度和视宁度同时在线。", when: (ctx) => ctx.slot.weather === "clear" && Boolean(act(ctx)?.outdoor), fx: { attrs: { observe: 1.2 }, morale: 3 }, tone: "good", cooldown: 6 },
  { id: "oldPapers", text: "毕业的学长回来，留下一箱十几年前的训练题。", fx: { attrs: { theory: 1 } }, tone: "good", cooldown: 24 },
  { id: "mascot", text: "社团吉祥物（一只玩偶，可能是熊）被学生会没收了，理由是“过于可爱”。", fx: { morale: -4 }, tone: "bad", once: true },
  { id: "flatEarthers", text: "有人在活动室门口发传单，宣传地球是平的。{a}和对方辩论了一节课。", fx: { stress: 3, attrs: { knowledge: 0.5 } }, tone: "warn", cooldown: 30 },
  { id: "comicCon", text: "{a}在漫展上摆摊用星座给人算命，赚了三百块外快。", actor: (s) => has(s, "astrology") || has(s, "socialite"), fx: { money: 300 }, tone: "good", cooldown: 30 },
  { id: "dance", text: "社员们在艺术节上跳了一支《星际穿越》主题舞，天文社出圈了。", fx: { fame: 4, morale: 3 }, tone: "good", once: true },
  { id: "richTreat", text: "{a}的家长听说社里经费紧张，转来了一笔赞助。", actor: (s) => has(s, "rich"), fx: { money: 1000 }, tone: "good", cooldown: 16 },
  { id: "akioi", text: "{a}在群里分享当年 NOIP 的经历，大家听得津津有味，然后开始焦虑。", actor: (s) => has(s, "coder"), fx: { attrs: { practice: 0.5 }, stress: 2 }, tone: "info", once: true },
  { id: "phoneSun", text: "有人用手机对着太阳拍了一分钟，镜头烧出了一个紫点。大家集体复习了一遍安全规范。", fx: { attrs: { knowledge: 0.4 } }, tone: "warn", once: true },
  { id: "argument", text: "刷题派和观测派在群里吵了起来，主题是“天文到底是不是物理的一个分支”。", fx: { morale: -4 }, tone: "bad", cooldown: 20 },
  { id: "professor", text: "一位大学天文系老师路过学校，被拉进活动室讲了一小时恒星演化。", fx: { attrs: { theory: 0.8, knowledge: 1 } }, tone: "good", cooldown: 30 },
  { id: "donation", text: "一位老校友捐来一台旧折射镜，镜筒上还贴着九十年代的贴纸。", fx: { gear: 10 }, tone: "good", once: true },
  { id: "blackout", text: "全校停电。楼顶第一次看到了银河。", when: (ctx) => clearish(ctx), fx: { attrs: { observe: 1 }, morale: 5 }, tone: "good", once: true },
  { id: "typhoon", text: "台风天，全市停课。大家在家里看了一天纪录片。", when: (ctx) => inMonths(ctx, 0, 9, 10, 11), fx: { stress: -6, attrs: { knowledge: 0.4 } }, tone: "info", cooldown: 30 },
  { id: "apod", text: "{a}拍的星云上了每日一天文图！群里炸了。", actor: (s) => has(s, "astrophoto"), when: (ctx) => ctx.g.items.includes("mount"), fx: { fame: 10, morale: 8 }, tone: "good", once: true },
  { id: "midAutumn", text: "中秋节，全社在楼顶赏月吃月饼，顺便用望远镜看了环形山。", when: (ctx) => inMonths(ctx, 0, 1) && ctx.slot.moon === 2, fx: { morale: 5, attrs: { knowledge: 0.3 } }, tone: "good", cooldown: 40 },
  { id: "aiOrion", text: "有人用 AI 画了一张猎户座海报，腰带画成了四颗星。全社花了一节课找茬。", fx: { attrs: { knowledge: 0.4 }, morale: 2 }, tone: "info", once: true },
  { id: "budgetCut", text: "学校经费压缩，社团拨款被砍了一截。", fx: { money: -300 }, tone: "bad", cooldown: 30 },
  { id: "alumni", text: "进过国家队的学长回校做报告，讲 IOAA 观测考试那晚的云。", fx: { attrs: { theory: 0.6 }, morale: 4 }, tone: "good", cooldown: 40 },
  { id: "thermos", text: "有人把保温杯落在楼顶，第二天被保洁阿姨当成陨石交到了保卫处。", fx: { fame: 1, morale: 2 }, tone: "info", once: true },
  { id: "magazine", text: "社里订的《天文爱好者》到了，{a}在新闻栏里发现了一道眼熟的预赛题。", fx: { attrs: { knowledge: 0.6 } }, tone: "good", cooldown: 16 },
  { id: "dinosaur", text: "{a}在网上看到一道题：用马门溪龙的瞳孔估算它能看到几等星。全社算了一下午。", fx: { attrs: { theory: 0.5, knowledge: 0.5 } }, tone: "info", once: true },
  { id: "sleepClass", text: "{a}昨晚观测到三点，今天数学课睡着了，被拍照发进了家长群。", actor: (s) => has(s, "nightOwl") || has(s, "sleepy"), fx: { self: { grades: -3 } }, tone: "warn", cooldown: 16 },
  { id: "crankPaper", text: "{a}写了一篇《论暗物质即以太》，投给了某期刊。编辑部回信很客气。", actor: (s) => has(s, "crank"), fx: { self: { stress: -3 } }, tone: "info", once: true },
  { id: "cloudApp", text: "晴天钟显示今晚全绿。实际上，今晚全阴。", when: (ctx) => ctx.slot.forecast === "clear" && ["overcast", "rain"].includes(ctx.slot.weather ?? ""), fx: { morale: -2 }, tone: "bad", cooldown: 8 },
  { id: "lostChart", text: "保洁阿姨把社团的全天星图当废纸收走了。只剩一张南天的。", fx: { attrs: { observe: -0.5 } }, tone: "bad", once: true },
  { id: "eyeExam", text: "{a}去配了新眼镜，第一次看清了昴星团有七颗星。", actor: (s) => has(s, "astigmatism"), fx: { self: { removeTrait: "astigmatism" } }, tone: "good", once: true },
  { id: "groupRename", text: "{a}把群名改成了“今晚晴吗”。从此每晚七点都有人在群里问。", actor: (s) => has(s, "socialite"), fx: { morale: 2 }, tone: "info", once: true },
  { id: "noBaosongNews", text: "新闻里说，天文竞赛结果不作为招生依据。群里安静了一下午，然后有人发了一句：用爱发电。", fx: { morale: -2 }, tone: "info", once: true },
  { id: "qiaoYingzi", text: "某部电视剧里，女主角说她想去南大天文系。第二天，社里收到了一份入社申请。", fx: { recruit: true }, tone: "good", once: true },
];
