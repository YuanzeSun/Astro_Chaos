import { chance, clamp, rand, sample, pick } from "./rng";
import type { Attr, ContestResultRow, GameState, PendingContest, Student } from "./types";
import { CONTEST_MAP, type ContestDef } from "../data/contests";
import { NIGHTS, type NightOption } from "../data/nights";
import { active, addStress, byId, traitsOf } from "./students";
import { rollWeather, moonPhase, outdoorFactor } from "./sky";
import { react, say, system } from "./chat";
import { GIVEN_NAMES, SURNAMES } from "../data/names";
import { WEATHER } from "../data/sky";
import { BALANCE } from "./balance";

export function gauss(g: GameState) {
  const u = Math.max(1e-9, rand(g));
  const v = rand(g);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function eligible(g: GameState, def: ContestDef): Student[] {
  const team = active(g);
  return def.requires ? team.filter((s) => s.quals.includes(def.requires!)) : team;
}

export function openContest(g: GameState, def: ContestDef): PendingContest | null {
  const participants = eligible(g, def);
  if (!participants.length) return null;
  let venue: PendingContest["venue"] = "field";
  let weather: PendingContest["weather"];
  if (def.sections.some((s) => s.outdoor)) {
    // 考试必阴天：比赛夜的云量额外 +1
    weather = rollWeather(g, def.month, 1);
    if (outdoorFactor(weather, moonPhase(g, g.clock)) === 0) {
      venue = "dome";
      system(g, `${def.short}观测考试那晚，${WEATHER[weather].name}。改天象厅。`, "warn");
      react(g, "dome", 1, participants);
    }
  }
  return {
    kind: "contest",
    contestId: def.id,
    venue,
    weather,
    participants: participants.map((s) => s.id),
    bonus: {},
    played: [],
    nights: def.nights,
    nightOptions: def.nights ? nightChoices(g, def.id).map((n) => n.id) : [],
    nightLog: [],
    games: [],
  };
}

export function nightChoices(g: GameState, contestId: string): NightOption[] {
  const pool = NIGHTS.filter((n) => !n.contests || n.contests.includes(contestId));
  return sample(g, pool, 3);
}

export function resolveNight(g: GameState, p: PendingContest, optionId: string): string {
  const option = NIGHTS.find((n) => n.id === optionId);
  if (!option || p.nights <= 0 || !p.nightOptions.includes(optionId)) return "";
  const ok = option.chance === undefined || rand(g) < option.chance;
  const out = ok || !option.lose ? option.win : option.lose;
  for (const id of p.participants) {
    const s = byId(g, id);
    if (s && out.stress) addStress(s, out.stress);
  }
  if (out.morale) g.morale = clamp(g.morale + out.morale, 0, 100);
  if (out.fame) g.fame = clamp(g.fame + out.fame, 0, 100);
  for (const [a, v] of Object.entries(out.bonus ?? {}) as [Attr, number][]) p.bonus[a] = (p.bonus[a] ?? 0) + v;
  p.nights -= 1;
  p.nightLog.push(`${option.label}：${out.text}`);
  p.nightOptions = p.nights > 0 ? nightChoices(g, p.contestId).map((n) => n.id) : [];
  return out.text;
}

export function recordGame(p: PendingContest, attr: Attr, kind: string, correct: number, wrong: number, total: number, bonus: number) {
  p.bonus[attr] = (p.bonus[attr] ?? 0) + bonus;
  p.played.push(attr);
  p.games.push({ kind, correct, wrong, total });
}

const sumTrait = (s: Student, key: "luck" | "variance" | "dome") => traitsOf(s).reduce((sum, t) => sum + (t[key] ?? 0), 0);

export function sectionScore(g: GameState, s: Student, def: ContestDef, attr: Attr, p: PendingContest) {
  const sec = def.sections.find((x) => x.attr === attr)!;
  const inDome = sec.dome || (sec.outdoor && p.venue === "dome");
  let base = s.attrs[attr];
  if (attr === "observe" && inDome) base = 0.6 * s.attrs.observe + 0.4 * s.attrs.knowledge + sumTrait(s, "dome");
  if (attr === "observe" && !inDome) base += (g.gear - 50) * 0.05;
  if (attr === "theory" && g.items.includes("calculators")) base += 1.5;
  const noise = gauss(g) * (5 + sumTrait(s, "variance") - (g.items.includes("dino") ? 1 : 0));
  const stress = Math.max(0, s.stress - 55) * 0.25;
  const morale = (g.morale - 50) * 0.04;
  return clamp(base + noise + sumTrait(s, "luck") - stress + morale + (p.bonus[attr] ?? 0) + g.contestBuff, 0, 100);
}

/** 对手学校的王牌，随时间变强。 */
export function rivalPower(g: GameState) {
  return rivalAt(g, g.clock);
}

export function rivalAt(g: GameState, clock: number) {
  return 36 + clock * 0.36 + g.rival.offset;
}

/** 不算运气、押题和天气的期望成绩，给走势图用。 */
export function projectedScore(def: ContestDef, attrs: Student["attrs"], stress: number, morale: number) {
  let score = 0;
  for (const sec of def.sections) {
    let base = attrs[sec.attr];
    if (sec.attr === "observe" && sec.dome) base = 0.6 * attrs.observe + 0.4 * attrs.knowledge;
    score += base * sec.weight;
  }
  return Math.max(0, Math.min(100, score - Math.max(0, stress - 55) * 0.25 + (morale - 50) * 0.04));
}

export function finishContest(g: GameState, p: PendingContest): ContestResultRow[] {
  const def = CONTEST_MAP[p.contestId];
  const rows: ContestResultRow[] = p.participants
    .map((id) => byId(g, id))
    .filter((s): s is Student => Boolean(s))
    .map((s) => {
      const sections: Partial<Record<Attr, number>> = {};
      let score = 0;
      for (const sec of def.sections) {
        const v = sectionScore(g, s, def, sec.attr, p);
        sections[sec.attr] = v;
        score += v * sec.weight;
      }
      return { studentId: s.id, name: s.name, sections, score, award: null, qualifies: false };
    })
    .sort((a, b) => b.score - a.score);

  let capped = 0;
  for (const row of rows) {
    const s = byId(g, row.studentId)!;
    const award = def.awards.find((a) => row.score >= a.min);
    if (award?.qual && def.schoolCap !== undefined && capped >= def.schoolCap) {
      row.award = null;
    } else if (award) {
      row.award = award.name;
      if (award.qual) {
        capped += 1;
        row.qualifies = true;
        if (!s.quals.includes(award.qual)) s.quals.push(award.qual);
      }
      g.fame = clamp(g.fame + award.fame, 0, 100);
      g.money += Math.round(award.money * BALANCE.awardMoney);
      s.honors.push({ year: g.year, contest: def.id, award: award.name, score: row.score });
    }
    if (def.extraQual && row.score >= def.extraQual.min && row.award === def.awards[0].name) {
      row.qualifies = true;
      g.flags.campReached = (g.flags.campReached ?? 0) + 1;
      if (!s.quals.includes(def.extraQual.qual)) s.quals.push(def.extraQual.qual);
    }
    addStress(s, row.award ? 1 : 9);
  }

  // 对手
  const rivalScore = clamp(rivalPower(g) + gauss(g) * 4, 0, 100);
  const rivalIn = !def.requires || g.rival.quals.includes(def.requires);
  if (rivalIn) {
    const award = def.awards.find((a) => rivalScore >= a.min);
    if (award?.qual) g.rival.quals.push(award.qual);
    if (def.extraQual && rivalScore >= def.extraQual.min) g.rival.quals.push(def.extraQual.qual);
    p.rival = { name: g.rival.student, score: rivalScore, award: award?.name ?? null };
  }

  p.results = rows;
  g.contestLog ??= [];
  g.contestLog.push({
    t: (g.year - 1) * 12 + g.month + 1,
    year: g.year,
    contest: def.id,
    best: rows[0]?.score ?? 0,
    bestName: rows[0]?.name ?? "",
    rival: p.rival?.score ?? null,
    award: rows[0]?.award ?? null,
  });
  g.contestBuff = 0;
  g.stats.contests = (g.stats.contests ?? 0) + 1;
  if (p.venue === "dome" && def.sections.some((s) => s.outdoor)) g.stats.domeSwitch = (g.stats.domeSwitch ?? 0) + 1;

  const winners = rows.filter((r) => r.award);
  const best = rows[0];
  if (winners.length) {
    g.morale = clamp(g.morale + 4 + winners.length, 0, 100);
    system(g, `${def.name}：${winners.map((r) => `${r.name}${r.award}`).join("，")}。`, "good");
    const voice = def.final && winners.some((w) => w.award !== "荣誉提名") ? "medal" : "pass";
    react(g, voice, Math.min(2, winners.length), winners.map((w) => byId(g, w.studentId)!));
  } else {
    g.morale = clamp(g.morale - 5, 0, 100);
    system(g, `${def.name}：颗粒无收。最高分是${best.name}。`, "bad");
    react(g, "fail", 1, rows.map((r) => byId(g, r.studentId)!));
  }
  const qualified = rows.filter((r) => r.qualifies && def.extraQual && byId(g, r.studentId)!.quals.includes(def.extraQual.qual));
  if (def.extraQual && qualified.length) {
    system(g, `${qualified.map((r) => r.name).join("、")}入选${def.extraQual.label}！`, "good");
  }
  if (def.id === "final" && rows.some((r) => r.award === "一等奖")) {
    if (!g.flags.coachTitle) say(g, "principal", "恭喜！你被评为本届决赛“优秀辅导员”。学校会在橱窗里贴你的照片。");
    g.flags.coachTitle = (g.flags.coachTitle ?? 0) + 1;
  }
  if (chance(g, 0.3)) {
    say(g, "torpedo", pick(g, [
      "这届题太简单了，用微积分十秒秒杀。",
      "你们学校这个成绩，建议来我们这报个班。",
      "今年命题组水平不行，我已经写信给北京天文馆了。",
      "这道题用雪比切夫不等式一眼就出来了。",
      "考得好的那几个，以前都听过我的课。",
    ]));
  }
  if (p.rival) {
    if (best && best.score > p.rival.score) {
      g.stats.beatRival = (g.stats.beatRival ?? 0) + 1;
      if (def.final) g.flags.beatRivalFinal = 1;
      say(g, "rival", pick(g, ["后生可畏啊。", "这次算你们赢。", "你们社今年有点东西。"]));
    } else {
      say(g, "rival", pick(g, ["承让承让。", "下次一起去冷湖啊！", "我们家孩子也就是运气好。"]));
    }
  }
  for (const r of rows) {
    const award = r.award ?? "";
    if (["金牌", "银牌", "铜牌"].includes(award)) g.stats[`medal:${award}`] = (g.stats[`medal:${award}`] ?? 0) + 1;
  }
  return rows;
}

export function displayScore(def: ContestDef, v: number) {
  return (v * (def.fullMark ?? 100)) / 100;
}

export function newRivalStudent(g: GameState) {
  g.rival.student = `${pick(g, SURNAMES)}${pick(g, GIVEN_NAMES)}`;
  g.rival.quals = [];
}
