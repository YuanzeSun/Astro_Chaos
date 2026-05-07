import {
  ATTRS,
  ATTR_LABELS,
  MONTHS,
  WEEKS_PER_MONTH,
  MAX_YEARS,
  WEATHER,
  SURNAMES,
  NAMES,
  TRAITS,
  TRAINING_PLANS,
  EVENTS,
  CONTESTS,
  CAMP_ACTIONS,
  STORY_BEATS,
} from "./gameData.js";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const roll = (min, max) => min + Math.random() * (max - min);
const choice = (items) => items[Math.floor(Math.random() * items.length)];

function weightedChoice(items, getWeight = (item) => item.weight) {
  const total = items.reduce((sum, item) => sum + Math.max(0, getWeight(item)), 0);
  let cursor = Math.random() * total;
  for (const item of items) {
    cursor -= Math.max(0, getWeight(item));
    if (cursor <= 0) return item;
  }
  return items[items.length - 1];
}

function sample(items, count) {
  const pool = [...items];
  const result = [];
  while (pool.length && result.length < count) {
    const index = Math.floor(Math.random() * pool.length);
    result.push(pool.splice(index, 1)[0]);
  }
  return result;
}

function grade(value) {
  if (value >= 94) return "S+";
  if (value >= 88) return "S";
  if (value >= 82) return "A";
  if (value >= 74) return "B";
  if (value >= 66) return "C";
  if (value >= 55) return "D";
  if (value >= 42) return "E";
  return "F";
}

function attrLabel(attr) {
  return ATTR_LABELS[attr] || attr;
}

function createStudent() {
  const student = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    name: `${choice(SURNAMES)}${choice(NAMES)}`,
    attrs: Object.fromEntries(ATTRS.map((attr) => [attr, roll(13, 28)])),
    growth: Object.fromEntries(ATTRS.map((attr) => [attr, roll(0.82, 1.07)])),
    stress: roll(14, 30),
    stressScale: roll(0.96, 1.18),
    status: "active",
    honors: [],
    sponsor: 0,
    luck: 0,
    variance: 0.1,
    resilience: 0,
    cloudAffinity: false,
    traits: [],
  };

  const traitCount = weightedChoice([
    { count: 1, weight: 42 },
    { count: 2, weight: 44 },
    { count: 3, weight: 14 },
  ]).count;

  for (const trait of sample(TRAITS, traitCount)) {
    student.traits.push({ id: trait.id, name: trait.name, desc: trait.desc });
    trait.apply(student);
  }

  for (const attr of ATTRS) {
    student.attrs[attr] = clamp(student.attrs[attr], 5, 99);
  }

  return student;
}

function createInitialState(studentCount = 6) {
  const students = Array.from({ length: studentCount }, createStudent);
  const sponsor = students.reduce((sum, student) => sum + (student.sponsor || 0), 0);
  return {
    year: 1,
    monthIndex: 0,
    week: 1,
    money: 1800 + sponsor,
    equipment: 58,
    morale: 45,
    weather: WEATHER[0],
    students,
    logs: [
      ...STORY_BEATS.map((text) => makeLog("开局", text)),
      sponsor ? makeLog("赞助", `有家长赞助了 ${sponsor} 元启动资金。`) : null,
    ].filter(Boolean),
    availablePlans: [],
    contestResults: null,
    gameOver: false,
    victory: false,
    aiEnabled: true,
    aiBusy: false,
    aiLines: [],
    aiEvent: null,
    aiSettings: {
      token: "",
      baseUrl: "",
      model: "gpt-5.4",
      wireApi: "responses",
      mode: "events",
    },
    seenContests: [],
    selectedPlanId: null,
  };
}

function makeLog(type, text, tone = "neutral") {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    type,
    text,
    tone,
    stamp: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
  };
}

function dateLabel(state) {
  return `第 ${state.year} 年 ${MONTHS[state.monthIndex]} 月 第 ${state.week} 周`;
}

function activeStudents(state) {
  return state.students.filter((student) => student.status === "active");
}

function addLog(state, type, text, tone = "neutral") {
  state.logs.unshift(makeLog(type, text, tone));
  state.logs = state.logs.slice(0, 18);
}

function applyStudentStress(student, amount) {
  if (student.status !== "active") return false;
  const adjusted = amount * student.stressScale * (1 - student.resilience);
  student.stress = clamp(student.stress + adjusted, 0, 120);
  if (student.stress > 108 && Math.random() < clamp((student.stress - 98) / 42, 0.14, 0.76)) {
    student.status = "quit";
    return true;
  }
  return false;
}

function applyAttr(student, attr, amount, factor = 1) {
  if (student.status !== "active") return;
  const growth = amount > 0 ? student.growth[attr] || 1 : 1;
  student.attrs[attr] = clamp(student.attrs[attr] + amount * growth * factor, 0, 100);
}

function applyEffects(state, effects, targetStudents = activeStudents(state), factor = 1) {
  const quitters = [];
  if (!effects) return quitters;

  if (effects.money) {
    state.money += Math.round(effects.money * factor);
  }
  if (effects.equipment) {
    state.equipment = clamp(state.equipment + effects.equipment * factor, 0, 100);
  }
  if (effects.morale) {
    state.morale = clamp(state.morale + effects.morale * factor, 0, 100);
  }

  for (const student of targetStudents) {
    if (effects.attrs) {
      for (const [attr, amount] of Object.entries(effects.attrs)) {
        applyAttr(student, attr, amount, factor);
      }
    }
    if (effects.stress) {
      const quit = applyStudentStress(student, effects.stress * factor);
      if (quit) quitters.push(student);
    }
    if (effects.luck) {
      student.luck += effects.luck * factor;
    }
  }

  return quitters;
}

function selectWeather(state) {
  const cloudCultists = activeStudents(state).filter((student) => student.cloudAffinity).length;
  state.weather = weightedChoice(WEATHER, (weather) => {
    if (weather.name === "阴天") return weather.weight + cloudCultists * 9;
    if (weather.name === "大雨") return weather.weight + cloudCultists * 2;
    return weather.weight;
  });
}

function refreshPlans(state) {
  const baseCount = state.equipment > 75 ? 6 : 5;
  state.availablePlans = sample(TRAINING_PLANS, baseCount);
  if (!state.availablePlans.some((plan) => plan.id === "rest")) {
    state.availablePlans.push(TRAINING_PLANS.find((plan) => plan.id === "rest"));
  }
  const eventPlan = createEventPlanForWeek(state);
  if (eventPlan) state.availablePlans.push(eventPlan);
  state.selectedPlanId = state.availablePlans[0]?.id || null;
}

function createEventPlanForWeek(state) {
  const candidates = EVENTS.filter((event) => {
    if (event.requiresWeather && !event.requiresWeather.includes(state.weather.name)) return false;
    if (event.minStress) {
      const avgStress = average(activeStudents(state).map((student) => student.stress));
      if (avgStress < event.minStress) return false;
    }
    const equipmentProtection = event.id === "scope_damage" ? clamp(state.equipment / 180, 0, 0.42) : 0;
    return Math.random() < event.probability * 1.8 - equipmentProtection;
  });
  const event = candidates[0];
  if (!event) return null;
  const effects = normalizeAiEffects(event.effects);
  const cost = Math.max(0, -effects.money);
  if (cost) effects.money = 0;
  return {
    id: `event-${event.id}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: event.actionName || `处理${event.title}`,
    type: "突发",
    cost,
    stress: effects.stress,
    gains: effects.attrs,
    money: effects.money,
    morale: effects.morale,
    equipment: effects.equipment,
    desc: event.text,
    normalEvent: {
      ...event,
      effects,
    },
  };
}

function startWeek(state) {
  if (state.gameOver) return;
  selectWeather(state);
  refreshPlans(state);

  if (state.week === 1) {
    const grant = 280 + Math.round(state.morale * 1.15);
    state.money += grant;
    addLog(state, "经费", `收到校方拨款 ${grant} 元。`);
  }

  const quitters = [];
  for (const student of activeStudents(state)) {
    if (applyStudentStress(student, state.weather.stress)) quitters.push(student);
  }

  addLog(state, "天气", `${dateLabel(state)}，天气 ${state.weather.name}。`);
  if (quitters.length) {
    addLog(state, "退社", `${quitters.map((student) => student.name).join("、")} 被本周天气和压力压垮，离开了社团。`, "bad");
  }
  checkGameEnd(state);
}

function describeGains(gains = {}) {
  const parts = Object.entries(gains).map(([attr, value]) => `${attrLabel(attr)} ${value > 0 ? "+" : ""}${value.toFixed(1)}`);
  return parts.length ? parts.join(" / ") : "无属性变化";
}

function applyPlanGains(state, plan, factor) {
  for (const student of activeStudents(state)) {
    for (const [attr, amount] of Object.entries(plan.gains || {})) {
      applyAttr(student, attr, amount, factor);
    }
  }
}

function maybeRecruitStudent(state, plan) {
  if (!plan.recruitChance || activeStudents(state).length >= 10) return;
  const scarcityBonus = Math.max(0, 6 - activeStudents(state).length) * 0.08;
  const moraleBonus = Math.max(0, state.morale - 55) / 220;
  const chance = clamp(plan.recruitChance + scarcityBonus + moraleBonus, 0, 0.9);
  if (Math.random() < chance) {
    const student = createStudent();
    student.stress = Math.max(4, student.stress - 6);
    state.students.push(student);
    if (student.sponsor) state.money += student.sponsor;
    addLog(state, "招新", `${student.name} 加入天文社。${student.sponsor ? `家长赞助 ${student.sponsor} 元。` : ""}`, "good");
  } else {
    addLog(state, "招新", "宣讲很热闹，但没人当场入社。", "neutral");
  }
}

function executePlan(state, planId) {
  if (state.gameOver) return { ok: false, reason: "游戏已结束。" };
  const plan = state.availablePlans.find((item) => item.id === planId);
  if (!plan) return { ok: false, reason: "这个计划不在本周选项里。" };
  if (plan.aiEvent) return executeAiEventPlan(state, plan);
  if (plan.normalEvent) return executeNormalEventPlan(state, plan);
  if (state.money < plan.cost) {
    addLog(state, "资金不足", `${plan.name} 需要 ${plan.cost} 元，当前资金不足。`, "bad");
    return { ok: false, reason: "资金不足。" };
  }

  state.contestResults = null;
  state.money -= plan.cost;

  let factor = 1;
  if (plan.weatherSensitive) {
    factor *= state.weather.observe;
    const hasCloudAffinity = activeStudents(state).some((student) => student.cloudAffinity);
    if (hasCloudAffinity && ["阴天", "大雨"].includes(state.weather.name)) factor *= 1.18;
  }
  if (state.equipment < 35 && ["观测", "实测"].includes(plan.type)) factor *= 0.85;
  if (state.morale > 70) factor *= 1.08;
  if (state.morale < 35) factor *= 0.9;

  applyPlanGains(state, plan, factor);
  const quitters = applyEffects(state, {
    stress: plan.stress,
    money: plan.money || 0,
    morale: plan.morale || 0,
    equipment: plan.equipment || 0,
  });
  maybeRecruitStudent(state, plan);

  state.morale = clamp(state.morale + (plan.stress < 0 ? 1.5 : -0.5), 0, 100);
  addLog(
    state,
    "活动",
    `${plan.name}：${describeGains(plan.gains)}，压力 ${plan.stress > 0 ? "+" : ""}${plan.stress}。`,
    plan.stress > 10 ? "warn" : "good",
  );

  if (quitters.length) {
    addLog(state, "退社", `${quitters.map((student) => student.name).join("、")} 顶不住压力退社了。`, "bad");
  }

  runDueContest(state);
  advanceTime(state);
  checkGameEnd(state);
  if (!state.gameOver) startWeek(state);
  return { ok: true };
}

function executeAiEventPlan(state, plan) {
  if (state.money < plan.cost) {
    addLog(state, "资金不足", `${plan.name} 需要 ${plan.cost} 元，当前资金不足。`, "bad");
    return { ok: false, reason: "资金不足。" };
  }
  state.contestResults = null;
  if (plan.cost) state.money -= plan.cost;
  const event = plan.aiEvent;
  const result = applyAiEvent(state, event);
  if (!result.ok) return result;

  runDueContest(state);
  advanceTime(state);
  checkGameEnd(state);
  if (!state.gameOver) startWeek(state);
  return { ok: true };
}

function executeNormalEventPlan(state, plan) {
  if (state.money < plan.cost) {
    addLog(state, "资金不足", `${plan.name} 需要 ${plan.cost} 元，当前资金不足。`, "bad");
    return { ok: false, reason: "资金不足。" };
  }
  state.contestResults = null;
  const event = plan.normalEvent;
  const effects = normalizeAiEffects(event.effects);
  if (plan.cost) state.money -= plan.cost;
  const quitters = applyEffects(state, effects);
  addLog(state, event.title, event.text, effects.stress > 0 || effects.money < 0 || effects.equipment < 0 ? "warn" : "good");
  if (quitters.length) {
    addLog(state, "退社", `${quitters.map((student) => student.name).join("、")} 因连续压力离开社团。`, "bad");
  }
  runDueContest(state);
  advanceTime(state);
  checkGameEnd(state);
  if (!state.gameOver) startWeek(state);
  return { ok: true };
}

function normalizeAiEffects(effects = {}) {
  const attrs = {};
  for (const attr of ATTRS) {
    const value = Number(effects.attrs?.[attr] ?? 0);
    if (Number.isFinite(value) && value !== 0) attrs[attr] = clamp(value, -4, 4);
  }
  return {
    attrs,
    stress: clamp(Number(effects.stress ?? 0), -10, 10),
    money: clamp(Number(effects.money ?? 0), -900, 900),
    morale: clamp(Number(effects.morale ?? 0), -10, 10),
    equipment: clamp(Number(effects.equipment ?? 0), -12, 12),
  };
}

function aiEventTargets(state, event) {
  const target = String(event?.target || "").trim();
  if (!target) return activeStudents(state);
  const matched = activeStudents(state).filter((student) => student.name === target);
  return matched.length ? matched : activeStudents(state);
}

function applyAiEvent(state, event) {
  if (!event || state.gameOver) return { ok: false, reason: "没有可执行的 AI 事件。" };
  const title = String(event.title || "AI 事件").slice(0, 18);
  const text = String(event.text || "AI 生成了一个突发状况。").slice(0, 90);
  const effects = normalizeAiEffects(event.effects);
  if (event.kind === "passive") repairPassiveEffects(effects);
  const targetStudents = aiEventTargets(state, event);
  const quitters = applyEffects(state, effects, targetStudents);
  state.aiEvent = null;
  addLog(state, title, text, effects.stress > 0 || effects.money < 0 || effects.equipment < 0 ? "warn" : "good");
  if (quitters.length) {
    addLog(state, "退社", `${quitters.map((student) => student.name).join("、")} 因突发事件离开社团。`, "bad");
  }
  checkGameEnd(state);
  return { ok: true };
}

function addAiEventPlan(state, event) {
  if (!event || state.gameOver) return;
  const title = String(event.title || "AI 事件").slice(0, 18);
  const text = String(event.text || "AI 生成了一个可选状况。").slice(0, 90);
  const effects = normalizeAiEffects(event.effects);
  if (looksLikePassiveEvent(title, text)) {
    applyAiEvent(state, { ...event, kind: "passive", title, text, effects });
    return;
  }
  if (!hasEffectBenefit(effects)) repairOptionalEffects(effects);
  let cost = Math.max(0, -effects.money);
  if (cost) effects.money = 0;
  if (!cost) cost = estimateOptionalEventCost(effects);
  state.availablePlans = state.availablePlans.filter((plan) => !plan.aiEvent);
  state.availablePlans.push({
    id: `ai-event-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: `处理${title}`,
    type: "AI事件",
    cost,
    stress: effects.stress,
    gains: effects.attrs,
    money: effects.money,
    morale: effects.morale,
    equipment: effects.equipment,
    desc: text,
    aiEvent: {
      ...event,
      kind: "optional",
      title,
      text,
      effects,
    },
  });
}

function looksLikePassiveEvent(title, text) {
  const combined = `${title}${text}`;
  const passiveWords = ["坏", "损坏", "故障", "断电", "丢失", "生病", "受伤", "争执", "事故", "翻出", "捡到"];
  return passiveWords.some((word) => combined.includes(word));
}

function repairOptionalEffects(effects) {
  effects.attrs.culture = Math.max(effects.attrs.culture || 0, 1);
  effects.stress = Math.max(effects.stress || 0, 1);
}

function repairPassiveEffects(effects) {
  if (!hasEffectBenefit(effects)) effects.attrs.culture = Math.max(effects.attrs.culture || 0, 1);
  if (!hasEffectPenalty(effects)) effects.stress = Math.max(effects.stress || 0, 1);
}

function hasEffectBenefit(effects) {
  const attrValues = Object.values(effects.attrs || {});
  return (
    attrValues.some((value) => Number(value) > 0) ||
    effects.money > 0 ||
    effects.morale > 0 ||
    effects.equipment > 0 ||
    effects.stress < 0
  );
}

function hasEffectPenalty(effects) {
  const attrValues = Object.values(effects.attrs || {});
  return (
    attrValues.some((value) => Number(value) < 0) ||
    effects.money < 0 ||
    effects.morale < 0 ||
    effects.equipment < 0 ||
    effects.stress > 0
  );
}

function estimateOptionalEventCost(effects) {
  if (effects.money > 0) return 0;
  const attrGain = Object.values(effects.attrs || {}).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
  const benefit =
    attrGain * 90 +
    Math.max(0, -effects.stress) * 24 +
    Math.max(0, effects.morale) * 30 +
    Math.max(0, effects.equipment) * 68;
  return benefit >= 110 ? Math.round(benefit / 10) * 10 : 0;
}

function contestForCurrentWeek(state) {
  return CONTESTS.find((contest) => {
    if (contest.month !== MONTHS[state.monthIndex] || contest.week !== state.week) return false;
    if (contest.minYear && state.year < contest.minYear) return false;
    const key = `${state.year}-${contest.id}`;
    return !state.seenContests.includes(key);
  });
}

function runDueContest(state) {
  const contest = contestForCurrentWeek(state);
  if (!contest) return;
  runContest(state, contest);
  state.seenContests.push(`${state.year}-${contest.id}`);
}

function eligibleForContest(state, contest) {
  const students = activeStudents(state);
  if (!contest.requires) return students;
  return students.filter((student) => student.honors.includes(contest.requires));
}

function runContest(state, contest) {
  const eligible = eligibleForContest(state, contest);
  if (!eligible.length) {
    addLog(state, contest.name, `无人具备 ${contest.requires || "参赛"} 资格，自动弃权。`, "bad");
    if (contest.final) {
      state.gameOver = true;
      state.victory = false;
    }
    return;
  }

  if (contest.camp) {
    runCampActions(state, contest, eligible);
  }

  const weights = { ...contest.weights };
  if (["阴天", "大雨"].includes(state.weather.name)) {
    weights.observe *= 0.72;
    weights.practice *= 1.08;
  }

  const scored = eligible
    .map((student) => {
      const base = Object.entries(weights).reduce((sum, [attr, weight]) => sum + student.attrs[attr] * weight, 0);
      const stressPenalty = Math.max(0, student.stress - 55) * 0.24;
      const equipmentBonus = (state.equipment - 55) * 0.04;
      const moraleBonus = (state.morale - 50) * 0.05;
      const variance = roll(-student.variance, student.variance) + student.luck;
      const score = clamp((base - stressPenalty + equipmentBonus + moraleBonus) * (1 + variance), 0, 100);
      return { student, score };
    })
    .sort((a, b) => b.score - a.score);

  const quota = contest.quota || Math.max(1, Math.ceil(scored.length * contest.quotaRatio));
  const promoted = [];
  for (const [index, item] of scored.entries()) {
    const passed = index < quota && item.score >= contest.cutoff;
    item.passed = passed;
    applyStudentStress(item.student, contest.stress + (passed ? 2 : 6));
    if (passed) {
      promoted.push(item.student);
      if (!item.student.honors.includes(contest.honor)) item.student.honors.push(contest.honor);
    }
  }

  const best = scored[0];
  state.contestResults = {
    contest,
    scored: scored.map((item) => ({
      id: item.student.id,
      name: item.student.name,
      score: item.score,
      passed: item.passed,
      honors: [...item.student.honors],
    })),
  };

  addLog(
    state,
    contest.name,
    promoted.length
      ? `${promoted.length} 人晋级，最高分 ${best.student.name} ${best.score.toFixed(1)}。`
      : `无人晋级，最高分 ${best.student.name} ${best.score.toFixed(1)}。`,
    promoted.length ? "good" : "bad",
  );

  if (contest.final) {
    state.gameOver = true;
    state.victory = promoted.length > 0;
    addLog(
      state,
      "终局",
      state.victory ? `${promoted[0].name} 在 IOAA 拿到奖牌，新的时间线成立。` : "IOAA 未能获奖，三年培养计划结束。",
      state.victory ? "good" : "bad",
    );
  }
}

function runCampActions(state, contest, eligible) {
  const actions = sample(CAMP_ACTIONS, 2);
  for (const action of actions) {
    const factor = contest.id === "national_final" ? 1.12 : 1;
    applyEffects(state, action.effects, eligible, factor);
    addLog(state, "赛中", `${contest.name}：${action.name}，${action.desc}`, "neutral");
  }
}

function advanceTime(state) {
  if (state.gameOver) return;
  state.week += 1;
  if (state.week > WEEKS_PER_MONTH) {
    state.week = 1;
    state.monthIndex += 1;
    if (state.monthIndex >= MONTHS.length) {
      state.monthIndex = 0;
      state.year += 1;
      for (const student of state.students) {
        student.honors = student.honors.filter((honor) => ["国集", "IOAA"].includes(honor));
      }
      addLog(state, "新学年", `第 ${state.year} 年开始，低级赛事荣誉清空。`);
    }
  }
}

function checkGameEnd(state) {
  if (state.gameOver) return;
  if (activeStudents(state).length === 0) {
    state.gameOver = true;
    state.victory = false;
    addLog(state, "终局", "所有社员都退社了。", "bad");
    return;
  }
  if (state.year > MAX_YEARS) {
    state.gameOver = true;
    state.victory = false;
    addLog(state, "终局", "三年期限已到，未能培养出 IOAA 选手。", "bad");
  }
}

function nextContest(state) {
  const currentIndex = (state.year - 1) * MONTHS.length * WEEKS_PER_MONTH + state.monthIndex * WEEKS_PER_MONTH + state.week;
  let best = null;
  for (let year = state.year; year <= MAX_YEARS; year++) {
    for (const contest of CONTESTS) {
      if (contest.minYear && year < contest.minYear) continue;
      const monthIndex = MONTHS.indexOf(contest.month);
      const contestIndex = (year - 1) * MONTHS.length * WEEKS_PER_MONTH + monthIndex * WEEKS_PER_MONTH + contest.week;
      if (contestIndex < currentIndex) continue;
      const distance = contestIndex - currentIndex;
      if (!best || distance < best.weeks) best = { ...contest, weeks: distance, year };
    }
  }
  return best;
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function teamStats(state) {
  const active = activeStudents(state);
  const attrs = Object.fromEntries(ATTRS.map((attr) => [attr, average(active.map((student) => student.attrs[attr]))]));
  return {
    activeCount: active.length,
    quitCount: state.students.length - active.length,
    avgStress: average(active.map((student) => student.stress)),
    avgMorale: state.morale,
    attrs,
    strongest: [...active].sort((a, b) => average(ATTRS.map((attr) => b.attrs[attr])) - average(ATTRS.map((attr) => a.attrs[attr])))[0] || null,
  };
}

function serializeForAi(state) {
  const stats = teamStats(state);
  const contest = nextContest(state);
  return {
    date: dateLabel(state),
    money: state.money,
    equipment: Math.round(state.equipment),
    morale: Math.round(state.morale),
    weather: state.weather.name,
    nextContest: contest ? `${contest.name}（${contest.weeks === 0 ? "本周" : `${contest.weeks} 周后`}）` : "无",
    activeCount: stats.activeCount,
    quitCount: stats.quitCount,
    avgStress: Math.round(stats.avgStress),
    avgAttrs: Object.fromEntries(Object.entries(stats.attrs).map(([attr, value]) => [attrLabel(attr), Math.round(value)])),
    recentLogs: state.logs.slice(0, 5).map((log) => `${log.type}: ${log.text}`),
    students: activeStudents(state).map((student) => ({
      name: student.name,
      stress: Math.round(student.stress),
      honors: student.honors,
      traits: student.traits.map((trait) => trait.name),
      attrs: Object.fromEntries(Object.entries(student.attrs).map(([attr, value]) => [attrLabel(attr), Math.round(value)])),
    })),
  };
}

export {
  ATTRS,
  ATTR_LABELS,
  TRAINING_PLANS,
  createInitialState,
  startWeek,
  executePlan,
  dateLabel,
  nextContest,
  teamStats,
  activeStudents,
  grade,
  attrLabel,
  serializeForAi,
  addLog,
  applyAiEvent,
  addAiEventPlan,
};
