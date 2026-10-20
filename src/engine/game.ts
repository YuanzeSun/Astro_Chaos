import { between, chance, clamp, newSeed, pick, rand, sample, weighted } from "./rng";
import type { DraftState, GameState, Pending, WeekSlot } from "./types";
import { absoluteWeek, gradeOf, isSummerBreak, isWinterBreak, MONTHS, schoolWeek, YEARS, WEEKS } from "./calendar";
import { active, addGrades, addStress, ATTR_LABEL, ATTRS, createStudent, hasTrait, outdoorScale, train } from "./students";
import { enroll, MAX_ACTIVE, recruitOne } from "./roster";
import { actualWeather, moonPhase, outdoorFactor, rollWeather, skyEventFor } from "./sky";
import { react, say, system } from "./chat";
import { openChoice, pickChoiceEvent, pickPassive, resolveChoice, CHOICE_MAP } from "./events";
import { finishContest, newRivalStudent, openContest } from "./contests";
import { ACTIVITIES, ACTIVITY_MAP, type Activity } from "../data/activities";
import { CONTEST_MAP, contestAt } from "../data/contests";
import { SHOP_MAP } from "../data/shop";
import { SKY_EVENT_MAP, WEATHER } from "../data/sky";
import { PITCHES } from "../data/names";
import { STORY } from "../data/npcs";
import { decideEnding } from "./endings";
import { BALANCE } from "./balance";

export { MAX_ACTIVE };

export function newGame(seed = newSeed()): GameState {
  const g: GameState = {
    version: 3,
    seed,
    rng: seed,
    year: 1,
    month: 0,
    week: 0,
    phase: "plan",
    money: BALANCE.startMoney,
    gear: 55,
    morale: 55,
    fame: 20,
    items: [],
    students: [],
    slots: [],
    chat: [],
    chatSeq: 0,
    pending: null,
    queue: [],
    flags: {},
    cooldowns: {},
    stats: {},
    contestBuff: 0,
    rival: { coach: "陆老师", student: "", quals: [], offset: 0 },
    unlocked: [],
    clock: 0,
  };
  g.rival.offset = between(g, -4, 4);
  newRivalStudent(g);
  for (const line of STORY) system(g, line);
  setupMonth(g, false);
  g.pending = openDraft(g, 4, 7);
  return g;
}

// —— 招新 ——

export function openDraft(g: GameState, picks: number, count: number): DraftState {
  const pitches = sample(g, PITCHES, count);
  const candidates = Array.from({ length: count }, (_, i) => ({ student: createStudent(g, g.year), pitch: pitches[i % pitches.length] }));
  return { kind: "draft", picks, candidates, chosen: [] };
}

export function toggleDraft(g: GameState, id: string) {
  const d = g.pending;
  if (d?.kind !== "draft") return;
  if (d.chosen.includes(id)) d.chosen = d.chosen.filter((x) => x !== id);
  else if (d.chosen.length < d.picks) d.chosen.push(id);
}

export function confirmDraft(g: GameState) {
  const d = g.pending;
  if (d?.kind !== "draft" || d.chosen.length === 0) return;
  for (const id of d.chosen) {
    const c = d.candidates.find((x) => x.student.id === id);
    if (c) enroll(g, c.student);
  }
  if (!g.history?.length) recordHistory(g, 0);
  g.pending = null;
  nextPending(g);
}

// —— 月度 ——

function setupMonth(g: GameState, grant = true) {
  const prev = g.slots.map((s) => s.activity);
  g.slots = Array.from({ length: WEEKS }, (_, w): WeekSlot => {
    const clock = absoluteWeek(g.year, g.month, w);
    const moon = moonPhase(g, clock);
    const contest = contestAt(g.month, w);
    return {
      activity: contest ? null : (prev[w] ?? null),
      forecast: rollWeather(g, g.month),
      moon,
      sky: skyEventFor(g, g.month, w, moon),
      contest: contest?.id,
    };
  });
  g.offer = rollOffer(g);
  for (const slot of g.slots) {
    if (slot.activity && (!canUse(g, ACTIVITY_MAP[slot.activity]) || !offered(g, slot.activity))) slot.activity = null;
  }
  g.week = 0;
  g.clock = absoluteWeek(g.year, g.month, 0);
  g.phase = "plan";
  if (grant) {
    const amount = Math.round(BALANCE.grantBase + g.fame * BALANCE.grantPerFame);
    g.money += amount;
    system(g, `学校拨款 ${amount} 元。`);
  }
  const sky = g.slots.map((s) => s.sky).filter(Boolean);
  for (const id of sky) system(g, `天象预告：${SKY_EVENT_MAP[id!].name}。`, "info");
}

/** 这个月的活动：基础的都有；买了器材的都有；季节和天象的按月份出；其余随机抽几个。 */
const ROTATING = 6;

function rollOffer(g: GameState): string[] {
  const skies = new Set(g.slots.map((s) => s.sky).filter(Boolean));
  const keep: string[] = [];
  const pool: Activity[] = [];
  for (const a of ACTIVITIES) {
    if (a.basic) keep.push(a.id);
    else if (a.requires && g.items.includes(a.requires)) keep.push(a.id);
    else if (a.sky) {
      if (a.sky.some((id) => skies.has(id))) keep.push(a.id);
    } else if (a.months) {
      if (a.months.includes(g.month)) keep.push(a.id);
    } else if (!a.requires) pool.push(a);
  }
  // 九月是招新季
  if (g.month === 0) keep.push("recruit");
  const rest = pool.filter((a) => !keep.includes(a.id));
  const picked: string[] = [];
  while (picked.length < ROTATING && rest.length) {
    const a = weighted(g, rest, (x) => x.weight ?? 1);
    if (!a) break;
    picked.push(a.id);
    rest.splice(rest.indexOf(a), 1);
  }
  const offer = new Set([...keep, ...picked]);
  return ACTIVITIES.filter((a) => offer.has(a.id)).map((a) => a.id);
}

export const offered = (g: GameState, id: string) => !g.offer || g.offer.includes(id);

export function canUse(g: GameState, a: Activity | undefined) {
  if (!a) return false;
  return !a.requires || g.items.includes(a.requires);
}

export function setActivity(g: GameState, week: number, id: string | null) {
  if (g.phase !== "plan") return;
  const slot = g.slots[week];
  if (!slot || slot.contest) return;
  if (id && (!canUse(g, ACTIVITY_MAP[id]) || !offered(g, id))) return;
  const a = id ? ACTIVITY_MAP[id] : undefined;
  if (a?.once && g.slots.some((s, i) => i !== week && s.activity === id)) return;
  slot.activity = id;
}

export function plannedCost(g: GameState) {
  return g.slots.reduce((sum, s) => sum + (s.activity ? ACTIVITY_MAP[s.activity].cost : 0), 0);
}

export function startMonth(g: GameState) {
  if (g.phase !== "plan" || g.pending) return;
  g.phase = "running";
  g.week = 0;
  g.monthBase = snapshot(g);
  g.monthStart = Object.fromEntries(active(g).map((s) => [s.id, { ...s.attrs }]));
}

function snapshot(g: GameState) {
  const team = active(g);
  const avg = (f: (s: (typeof team)[number]) => number) => team.reduce((sum, s) => sum + f(s), 0) / Math.max(1, team.length);
  return {
    attrs: { theory: avg((s) => s.attrs.theory), observe: avg((s) => s.attrs.observe), practice: avg((s) => s.attrs.practice), knowledge: avg((s) => s.attrs.knowledge) },
    stress: avg((s) => s.stress),
    money: g.money,
  };
}

/** 这一笔记在第几个月的月底；开学那一笔是 0。 */
export const monthT = (year: number, month: number) => (year - 1) * MONTHS.length + month + 1;

export function recordHistory(g: GameState, t: number) {
  const team = active(g);
  if (!team.length) return;
  g.history ??= [];
  if (g.history.some((p) => p.t === t)) return;
  const avg = (f: (s: (typeof team)[number]) => number) => team.reduce((sum, s) => sum + f(s), 0) / team.length;
  g.history.push({
    t,
    year: g.year,
    month: g.month,
    team: { theory: avg((s) => s.attrs.theory), observe: avg((s) => s.attrs.observe), practice: avg((s) => s.attrs.practice), knowledge: avg((s) => s.attrs.knowledge) },
    stress: avg((s) => s.stress),
    money: g.money,
    morale: g.morale,
    fame: g.fame,
    members: Object.fromEntries(team.map((s) => [s.id, { attrs: { ...s.attrs }, stress: s.stress }])),
  });
}

function monthSummary(g: GameState) {
  const base = g.monthBase;
  if (!base || !active(g).length) return;
  const now = snapshot(g);
  const sign = (v: number, d = 1) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(d)}`;
  const parts = ATTRS.map((a) => `${ATTR_LABEL[a]} ${sign(now.attrs[a] - base.attrs[a])}`);
  parts.push(`压力 ${sign(now.stress - base.stress, 0)}`);
  parts.push(`经费 ${sign(now.money - base.money, 0)}`);
  system(g, `${MONTHS[g.month]}月小结（人均）：${parts.join("　")}`, "info");
  g.monthBase = undefined;
}

/** 推进一步：跑一周，或在本月跑完后结算月底。界面在没有待处理弹窗时反复调用。 */
export function tick(g: GameState) {
  if (g.phase !== "running" || g.pending) return;
  if (g.week >= WEEKS) {
    endMonth(g);
    return;
  }
  runWeek(g, g.week);
  g.week += 1;
  nextPending(g);
}

function nextPending(g: GameState) {
  if (!g.pending && g.queue.length) g.pending = g.queue.shift()!;
}

function queue(g: GameState, p: Pending | null) {
  if (p) g.queue.push(p);
}

function runWeek(g: GameState, w: number) {
  const slot = g.slots[w];
  g.clock = absoluteWeek(g.year, g.month, w);

  if (slot.contest) {
    const def = CONTEST_MAP[slot.contest];
    const pending = openContest(g, def);
    if (pending) {
      slot.report = `${def.short}开考`;
      queue(g, pending);
      return;
    }
    slot.report = `${def.short}，没有人有资格参加`;
    if (def.requires) system(g, `${def.name}开赛了。我们没人进。`, "warn");
    slot.activity = "rest";
  }

  const recentGear = g.flags.newGear !== undefined && g.clock - g.flags.newGear <= 2;
  slot.weather = recentGear && chance(g, 0.5) ? rollWeather(g, g.month, 2) : actualWeather(g, g.month, slot.forecast);
  const weather = WEATHER[slot.weather];
  const a = ACTIVITY_MAP[slot.activity ?? "rest"];
  slot.activity = a.id;
  runActivity(g, slot, a);

  // 学校考试
  const exam = schoolWeek(g.month, w);
  if (exam?.kind === "exam") {
    system(g, `${exam.label}周。`, "info");
    for (const s of active(g)) addStress(s, 3);
    react(g, "exam", 1);
    const failing = active(g).filter((s) => s.grades < 45).sort((x, y) => x.grades - y.grades)[0];
    if (failing) queue(g, openChoice(g, slot, CHOICE_MAP.gradesCrisis, failing));
  }

  // 天气本身的压力
  for (const s of active(g)) {
    if (!hasTrait(s, "cloudCult")) addStress(s, weather.stress);
    addStress(s, g.items.includes("aircon") ? -5 : -3);
    if (!isWinterBreak(g.month) && !isSummerBreak(g.month)) addGrades(s, -0.4);
  }
  g.morale = clamp(g.morale + (g.morale > 50 ? -0.6 : 0.6), 0, 100);

  // 随机事件
  if (!g.queue.length && chance(g, BALANCE.choiceRate)) queue(g, pickChoiceEvent(g, slot));
  if (chance(g, BALANCE.passiveRate)) {
    const ev = pickPassive(g, slot);
    if (ev) system(g, ev.summary ? `${ev.text}（${ev.summary}）` : ev.text, ev.tone);
  }

  checkBreakdown(g, slot);
}

function runActivity(g: GameState, slot: WeekSlot, a: Activity) {
  const team = active(g);
  if (a.cost > 0 && g.money < a.cost) {
    system(g, `经费不够办「${a.name}」，改成了回班自习。`, "warn");
    return runActivity(g, slot, ACTIVITY_MAP.selfStudy);
  }
  g.money -= a.cost;
  const weather = WEATHER[slot.weather!];
  let factor = 1;
  let rainedOut = false;
  if (a.outdoor) {
    factor = a.daytime ? weather.outdoor : outdoorFactor(slot.weather!, slot.moon, a.moonLoving);
    if (slot.sky && !a.daytime) factor *= SKY_EVENT_MAP[slot.sky].boost;
    if (g.items.includes("observatory")) factor *= 1.2;
    if (g.items.includes("binoculars")) factor *= 1.08;
    if (a.id === "rooftop" && g.flags.lightPollution) factor *= 0.6;
    factor *= 0.7 + g.gear / 333;
    rainedOut = factor === 0;
  }
  if (["pastPapers"].includes(a.id) && g.items.includes("papers")) factor *= 1.25;
  if (["pastPapers", "quizBank"].includes(a.id) && g.items.includes("bojiang")) factor *= 0.9;
  if (["dataLab", "errorDrill"].includes(a.id) && g.items.includes("bojiang")) factor *= 1.12;
  if (a.id === "starHop" && g.items.includes("stellarium")) factor *= 1.2;
  if (a.cat === "实测") factor *= 0.8 + g.gear / 500;

  if (rainedOut) {
    g.money += Math.round(a.cost / 2);
    for (const s of team) {
      train(g, s, { observe: 0.6, knowledge: 0.8 });
      addStress(s, 1);
    }
    g.morale = clamp(g.morale - 2, 0, 100);
    g.stats.rainouts = (g.stats.rainouts ?? 0) + 1;
    slot.report = `${a.name} 泡汤`;
    system(g, `${weather.glyph} ${weather.name}。「${a.name}」泡汤了，大家在室内看了一晚上 Stellarium。`, "warn");
    react(g, "rainout", 1);
    return;
  }

  const winter = [3, 4, 5].includes(g.month);
  const summer = [9, 10, 11, 0].includes(g.month);
  for (const s of team) {
    const personal = a.outdoor ? outdoorScale(s) : 1;
    train(g, s, a.gains, factor * personal);
    let stress = a.stress;
    if (a.outdoor && !a.daytime && winter && !g.items.includes("warmers")) stress += 3;
    if (a.outdoor && !a.daytime && summer && !g.items.includes("repellent")) stress += 2;
    if (a.cat === "休整" && hasTrait(s, "grinder")) stress += 4;
    addStress(s, stress);
    addGrades(s, a.grades < 0 && (isWinterBreak(g.month) || isSummerBreak(g.month)) ? a.grades / 3 : a.grades);
  }
  if (a.morale) g.morale = clamp(g.morale + a.morale, 0, 100);
  if (a.fame) g.fame = clamp(g.fame + a.fame * (a.outdoor ? Math.min(1.5, factor) : 1), 0, 100);
  if (a.money) g.money += a.money;
  if (a.gear) g.gear = clamp(g.gear + (a.gear < 0 && g.items.includes("observatory") ? a.gear / 2 : a.gear), 0, 100);

  if (a.special === "recruit") {
    const socialite = team.some((s) => hasTrait(s, "socialite")) ? 0.15 : 0;
    const season = g.month <= 1 ? 1.4 : 0.8;
    if (rand(g) < (0.3 + g.fame / 220 + socialite) * season) recruitOne(g, "被宣讲打动，加入了天文社。");
    else system(g, "宣讲很热闹，没有人当场入社。");
  }
  if (a.special === "sponsor") {
    const bonus = (team.some((s) => hasTrait(s, "socialite")) ? 250 : 0) + (team.some((s) => hasTrait(s, "rich")) ? 400 : 0);
    const amount = Math.round(250 + g.fame * 9 + bonus + between(g, -100, 200));
    g.money += amount;
    system(g, `拉到赞助 ${amount} 元。`, "good");
  }

  if (a.outdoor && !a.daytime) {
    g.stats.nights = (g.stats.nights ?? 0) + 1;
    if (a.id === "astroPhoto") g.stats.photoNights = (g.stats.photoNights ?? 0) + 1;
    if (slot.sky) {
      const sky = SKY_EVENT_MAP[slot.sky];
      g.flags[`saw:${sky.id}`] = 1;
      system(g, `${sky.glyph} ${sky.name}：${sky.line}`, "good");
    }
  }
  slot.report = a.outdoor ? `${weather.glyph} ${a.name}` : a.name;
  if (a.outdoor && !a.daytime && factor >= 1) react(g, "clear", 1);
  else if (a.outdoor && factor < 0.8) react(g, "cloudy", 1);
  else if (a.stress >= 7 && chance(g, 0.4)) react(g, "grind", 1);
  else if (a.cat === "休整" && chance(g, 0.4)) react(g, "rest", 1);
}

function checkBreakdown(g: GameState, slot: WeekSlot) {
  for (const s of active(g)) {
    if (s.stress >= 112) {
      s.status = "quit";
      s.leftNote = "压力太大";
      system(g, `${s.name}退社了。群里只留下一句：对不起。`, "bad");
      continue;
    }
    if (s.stress >= 95 && !g.queue.some((p) => p.kind === "event" && p.actor === s.id)) {
      queue(g, openChoice(g, slot, CHOICE_MAP.breakdown, s));
      return;
    }
    if (s.stress >= 80 && chance(g, 0.15)) react(g, "stressed", 1, [s]);
  }
}

// —— 弹窗处理 ——

export function chooseOption(g: GameState, optionId: string) {
  const p = g.pending;
  if (p?.kind !== "event" || p.result) return;
  const slot = g.slots[Math.max(0, g.week - 1)] ?? g.slots[0];
  const res = resolveChoice(g, p, optionId, slot);
  if (!res) return;
  if (res.chat) for (const [who, text] of res.chat) say(g, who, text);
}

export function dismissEvent(g: GameState) {
  const p = g.pending;
  if (p?.kind !== "event" || !p.result) return;
  system(g, `【${p.title}】${p.result.text}${p.result.summary ? `（${p.result.summary}）` : ""}`, p.result.good ? "good" : "warn");
  g.pending = null;
  nextPending(g);
}

export function closeContest(g: GameState) {
  const p = g.pending;
  if (p?.kind !== "contest") return;
  if (!p.results) finishContest(g, p);
  g.pending = null;
  nextPending(g);
}

export function scoreContest(g: GameState) {
  const p = g.pending;
  if (p?.kind !== "contest" || p.results) return;
  finishContest(g, p);
}

// —— 商店 ——

export function buy(g: GameState, id: string) {
  const item = SHOP_MAP[id];
  if (!item || g.items.includes(id) || g.money < item.price) return false;
  if (item.needs && !g.items.includes(item.needs)) return false;
  g.money -= item.price;
  g.items.push(id);
  if (item.unlocks && g.offer && !g.offer.includes(item.unlocks)) g.offer = ACTIVITIES.filter((a) => g.offer!.includes(a.id) || a.id === item.unlocks).map((a) => a.id);
  if (item.price >= 300) g.flags.newGear = g.clock;
  system(g, `购入：${item.name}。`, "good");
  react(g, "buy", 1);
  return true;
}

// —— 月底与学年 ——

function endMonth(g: GameState) {
  monthSummary(g);
  recordHistory(g, monthT(g.year, g.month));
  if (g.money < 0 && g.flags.debtAt !== g.clock && active(g).length) {
    const ev = openChoice(g, g.slots[WEEKS - 1], CHOICE_MAP.debt, active(g)[0]);
    if (ev) {
      g.pending = ev;
      g.flags.debtAt = g.clock;
      g.stats.debts = (g.stats.debts ?? 0) + 1;
      g.flags.lowestMoney = Math.min(g.flags.lowestMoney ?? 0, g.money);
      // 处理完赤字再回来结算月底
      return;
    }
  }
  g.month += 1;
  if (g.month >= MONTHS.length) {
    yearEnd(g);
    if (g.phase === "ending") return;
  }
  if (!active(g).length && g.month !== 0) {
    finish(g);
    return;
  }
  setupMonth(g);
  if (g.month === 0) {
    const room = MAX_ACTIVE - active(g).length;
    if (room > 0) g.pending = openDraft(g, Math.min(room, active(g).length < 3 ? 3 : 2), 5);
  }
}

function yearEnd(g: GameState) {
  for (const s of active(g)) {
    if (gradeOf(s.enrollYear, g.year) >= 3) {
      s.status = "graduated";
      s.leftNote = "毕业";
      say(g, s.id, pick(g, ["毕业快乐！以后回来看星星。", "我会想念楼顶的。", "去大学继续看星星了。"]));
    }
  }
  if (g.year >= YEARS) {
    finish(g);
    return;
  }
  g.year += 1;
  g.month = 0;
  for (const s of g.students) s.quals = [];
  newRivalStudent(g);
  system(g, `新学年开始了。${g.year === YEARS ? "这是最后一年。校长又来量过天象厅了。" : ""}`, "info");
}

export function finish(g: GameState) {
  g.phase = "ending";
  g.ending = decideEnding(g);
  g.pending = null;
  g.queue = [];
}
