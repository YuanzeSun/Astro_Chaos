import type { GameState } from "../engine/types";
import { SHOP } from "./shop";

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  test: (g: GameState) => boolean;
}

const honors = (g: GameState) => g.students.flatMap((s) => s.honors);
const activeCount = (g: GameState) => g.students.filter((s) => s.status === "active").length;
const withTrait = (g: GameState, t: string) => g.students.filter((s) => s.status === "active" && s.traits.includes(t)).length;
const games = (g: GameState) => (g.pending?.kind === "contest" ? g.pending.games : []);

export const ACHIEVEMENTS: Achievement[] = [
  { id: "gold", name: "国歌响起", desc: "拿到 IOAA 金牌。", test: (g) => honors(g).some((h) => h.award === "金牌") },
  { id: "medal", name: "国旗升起来了", desc: "拿到任意一块 IOAA 奖牌。", test: (g) => honors(g).some((h) => ["金牌", "银牌", "铜牌"].includes(h.award)) },
  { id: "coach", name: "优秀辅导员", desc: "学生在 CNAO 决赛拿到一等奖。", test: (g) => Boolean(g.flags.coachTitle) },
  { id: "camp", name: "门里面", desc: "把学生送进国家集训队。", test: (g) => Boolean(g.flags.campReached) },
  { id: "dome", name: "天象厅常驻", desc: "三场比赛的观测考试因为天气改去天象厅。", test: (g) => (g.stats.domeSwitch ?? 0) >= 3 },
  { id: "cult", name: "阴天教会", desc: "社里同时有两个阴天教徒。", test: (g) => withTrait(g, "cloudCult") >= 2 },
  { id: "rainout", name: "晴天钟骗了我", desc: "户外活动累计泡汤十次。", test: (g) => (g.stats.rainouts ?? 0) >= 10 },
  { id: "messier", name: "一百一十个", desc: "完成一次梅西耶马拉松。", test: (g) => Boolean(g.flags.messierDone) },
  { id: "betelgeuse", name: "它真的爆了", desc: "赌赢参宿四。", test: (g) => Boolean(g.flags.betelgeuse) },
  { id: "comet", name: "彗星像猫", desc: "在户外看到一颗大彗星。", test: (g) => Boolean(g.flags["saw:comet"]) },
  { id: "aurora", name: "北方的天红了", desc: "在户外看到低纬极光。", test: (g) => Boolean(g.flags["saw:aurora"]) },
  { id: "eclipse", name: "红月亮", desc: "在户外看到月全食。", test: (g) => Boolean(g.flags["saw:lunarEclipse"]) },
  { id: "gear", name: "天文穷三代", desc: "买下器材店里的所有东西。", test: (g) => SHOP.every((i) => g.items.includes(i.id)) },
  { id: "debt", name: "负债经营", desc: "社团账户跌破负一千。", test: (g) => (g.flags.lowestMoney ?? 0) <= -1000 },
  { id: "full", name: "满员", desc: "同时有八名在社社员。", test: (g) => activeCount(g) >= 8 },
  { id: "dinosaur", name: "古生物也在考纲里", desc: "算一算马门溪龙能看见几等星。", test: (g) => Boolean(g.flags.dinosaur) },
  { id: "physics", name: "物竞难民收容所", desc: "收留一名物竞转来的学生。", test: (g) => Boolean(g.flags.physicsRecruit) },
  { id: "dean", name: "主任也来看土星", desc: "让教导主任成为天文社的粉丝。", test: (g) => Boolean(g.flags.deanFan) },
  { id: "rival", name: "已读，回复", desc: "在 IOAA 上压过陆老师的学生。", test: (g) => Boolean(g.flags.beatRivalFinal) },
  { id: "negative", name: "选错的同学请立即交卷", desc: "在倒扣分的押题里拿到负分。", test: (g) => games(g).some((x) => x.kind === "quiz-neg" && x.wrong > x.correct) },
  { id: "chart", name: "活地图", desc: "星图押题全对。", test: (g) => games(g).some((x) => x.kind === "chart" && x.correct === x.total) },
  { id: "calc", name: "卡西欧附体", desc: "计算押题全对。", test: (g) => games(g).some((x) => x.kind === "calc" && x.correct === x.total) },
  { id: "noQuit", name: "一个都不能少", desc: "三年里没有一个人退社。", test: (g) => g.phase === "ending" && g.students.every((s) => s.status === "active" || s.status === "graduated") },
];

export function newAchievements(g: GameState, unlocked: string[]): string[] {
  return ACHIEVEMENTS.filter((a) => !unlocked.includes(a.id) && a.test(g)).map((a) => a.id);
}
