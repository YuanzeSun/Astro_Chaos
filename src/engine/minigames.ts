import { pick, rand, sample, shuffle } from "./rng";
import type { Rng } from "./rng";
import { QUIZ } from "../data/quiz";
import sky from "../data/sky.json";
import type { GameKind } from "../data/contests";

export interface SkyFigure {
  type: "sky";
  ra: number;
  dec: number;
  fov: number;
  lines: string | null;
  marker?: { ra: number; dec: number };
  dome?: boolean;
}

export interface PlotFigure {
  type: "plot";
  points: [number, number][];
  xLabel: string;
  yLabel: string;
  invertY?: boolean;
}

export interface Question {
  kind: GameKind;
  prompt: string;
  options: string[];
  answer: number;
  explain: string;
  figure?: SkyFigure | PlotFigure;
}

export interface Difficulty {
  level: 1 | 2 | 3;
  dome?: boolean;
}

const fmt = (v: number, digits = 0) => {
  const s = v.toFixed(digits);
  return digits ? s.replace(/\.?0+$/, "") : s;
};

/** 正确答案 + 干扰项，去重后打乱。 */
function withOptions(g: Rng, correct: string, wrong: string[]): { options: string[]; answer: number } {
  const unique = [...new Set(wrong.filter((w) => w !== correct))].slice(0, 3);
  let filler = 1;
  while (unique.length < 3) unique.push(`${correct}（${filler++}）`);
  const options = shuffle(g, [correct, ...unique]);
  return { options, answer: options.indexOf(correct) };
}

// —— 常识 ——

export function quizQuestions(g: Rng, count: number): Question[] {
  return sample(g, QUIZ, count).map((item) => {
    const order = shuffle(g, [0, 1, 2, 3]);
    return {
      kind: "quiz",
      prompt: item.q,
      options: order.map((i) => item.options[i]),
      answer: order.indexOf(item.answer),
      explain: item.explain,
    };
  });
}

// —— 计算 ——

type CalcGen = (g: Rng) => Question;

const calc = (g: Rng, prompt: string, correct: string, wrong: string[], explain: string): Question => ({
  kind: "calc",
  prompt,
  explain,
  ...withOptions(g, correct, wrong),
});

const CALC: Record<string, CalcGen> = {
  culmination(g) {
    const lat = 22 + Math.floor(rand(g) * 24);
    const dec = -20 + Math.floor(rand(g) * (lat + 15));
    const h = 90 - lat + dec;
    return calc(
      g,
      `在北纬 ${lat}° 的地方，赤纬 ${dec}° 的恒星上中天时，地平高度是多少？`,
      `${h}°`,
      [`${90 - lat - dec}°`, `${lat + dec}°`, `${90 + lat - dec}°`, `${h + 10}°`],
      `南中天时 h = 90° − φ + δ = ${h}°。`,
    );
  },
  kepler(g) {
    const a = pick(g, [4, 9, 16, 25, 36]);
    const p = Math.round(a ** 1.5);
    return calc(
      g,
      `一颗小行星绕太阳运行，轨道半长轴 ${a} AU，它的公转周期约为多少年？`,
      `${p} 年`,
      [`${a * a} 年`, `${a} 年`, `${Math.round(Math.sqrt(a))} 年`, `${p * 2} 年`],
      `开普勒第三定律 P² = a³，P = ${a}^1.5 = ${p}。`,
    );
  },
  modulus(g) {
    const mu = pick(g, [0, 5, 10, 15]);
    const M = pick(g, [-5, -2, 0, 1, 3, 4]);
    const m = M + mu;
    const d = 10 ** (mu / 5 + 1);
    const show = (x: number) => (x >= 1000 ? `${fmt(x / 1000)} kpc` : `${fmt(x)} pc`);
    return calc(
      g,
      `某恒星视星等 ${m}，绝对星等 ${M}，忽略星际消光，它距离我们大约多远？`,
      show(d),
      [show(d * 10), show(d / 10 >= 1 ? d / 10 : d * 100), show(d * 100)],
      `m − M = 5 lg d − 5，d = 10^((${mu}+5)/5) = ${fmt(d)} pc。`,
    );
  },
  parallax(g) {
    const p = pick(g, [0.5, 0.25, 0.1, 0.05, 0.02, 0.01]);
    const d = 1 / p;
    return calc(
      g,
      `一颗恒星的周年视差为 ${p}″，它的距离是多少秒差距？`,
      `${fmt(d)} pc`,
      [`${fmt(p)} pc`, `${fmt(d * 3.26, 1)} pc`, `${fmt(d * 10)} pc`, `${fmt(d / 2, 1)} pc`],
      `d = 1/p = ${fmt(d)} pc，换成光年约 ${fmt(d * 3.26, 1)}。`,
    );
  },
  ratio(g) {
    const dm = pick(g, [2.5, 5, 7.5, 10]);
    const r = 10 ** (dm / 2.5);
    const show = (x: number) => (x >= 10000 ? `${fmt(x / 10000)} 万倍` : `${fmt(x)} 倍`);
    return calc(
      g,
      `两颗星的视星等相差 ${dm} 等，亮度相差多少倍？`,
      show(r),
      [show(dm * 2.5), show(r / 10 >= 2 ? r / 10 : r * 100), show(r * 10), `${fmt(dm * 2)} 倍`],
      `亮度比 = 10^(0.4 Δm) = ${fmt(r)}。`,
    );
  },
  wien(g) {
    const T = pick(g, [2900, 3600, 5800, 7250, 10000, 29000]);
    const lam = Math.round(2.9e6 / T);
    return calc(
      g,
      `一颗表面温度约 ${T} K 的恒星，辐射最强的波长大约是多少？`,
      `${lam} nm`,
      [`${Math.round(lam * 2)} nm`, `${Math.round(lam / 2)} nm`, `${Math.round(T / 10)} nm`],
      `维恩位移定律 λmax ≈ 2.9×10⁶ nm·K / T。`,
    );
  },
  hourAngle(g) {
    const lst = Math.floor(rand(g) * 24);
    const ra = Math.floor(rand(g) * 24);
    const ha = (lst - ra + 24) % 24;
    const h = (v: number) => `${(v + 24) % 24}h`;
    return calc(
      g,
      `当地恒星时为 ${lst}h，某星赤经为 ${ra}h，这颗星的时角是？`,
      h(ha),
      [h(ra - lst), h(lst + ra), h(ha + 12), h(ha + 2)],
      `时角 = 恒星时 − 赤经。`,
    );
  },
  synodic(g) {
    const planet = pick(g, [
      { name: "火星", P: 1.88, S: 2.14 },
      { name: "木星", P: 11.86, S: 1.09 },
      { name: "土星", P: 29.46, S: 1.04 },
      { name: "金星", P: 0.615, S: 1.6 },
    ]);
    return calc(
      g,
      `${planet.name}的公转周期约 ${planet.P} 年，它的会合周期约为多少年？`,
      `${planet.S} 年`,
      [`${fmt(planet.P + 1, 2)} 年`, `${fmt(Math.abs(planet.P - 1), 2)} 年`, `${fmt(planet.P / 2, 2)} 年`],
      `1/S = |1 − 1/P|。`,
    );
  },
  magnify(g) {
    const F = pick(g, [600, 900, 1000, 1200, 2000]);
    const f = pick(g, [10, 20, 25, 40]);
    return calc(
      g,
      `焦距 ${F} mm 的望远镜，配 ${f} mm 的目镜，放大率是多少？`,
      `${F / f} 倍`,
      [`${F * f} 倍`, `${fmt(f / F, 3)} 倍`, `${F / f / 2} 倍`, `${(F / f) * 2} 倍`],
      `放大率 = 物镜焦距 / 目镜焦距。`,
    );
  },
  aperture(g) {
    const [a, b] = pick(g, [[200, 100], [300, 100], [400, 200], [100, 50], [500, 100]]);
    const r = (a / b) ** 2;
    return calc(
      g,
      `口径 ${a} mm 的望远镜，聚光本领是 ${b} mm 望远镜的几倍？`,
      `${r} 倍`,
      [`${a / b} 倍`, `${r * 2} 倍`, `${(a / b) ** 3} 倍`],
      `聚光本领和口径的平方成正比。`,
    );
  },
  hubble(g) {
    const d = pick(g, [50, 100, 200, 300]);
    const v = 70 * d;
    return calc(
      g,
      `取哈勃常数 70 km/s/Mpc，距离 ${d} Mpc 的星系退行速度约为？`,
      `${v} km/s`,
      [`${v / 10} km/s`, `${v * 10} km/s`, `${Math.round(d / 70)} km/s`],
      `v = H₀d。`,
    );
  },
  peppa(g) {
    // 地球上 v² = 2gh，星球上 v² = 2GM/R；密度相同时 g ∝ R，所以 R = √(h·R⊕)
    const R = Math.sqrt(6.371e6);
    const M = (4 / 3) * Math.PI * R ** 3 * 5514;
    const lead = "小猪佩奇在地球上踩泥巴，能让泥巴飞 1 m 高。它来到一颗和地球密度相同的小星球，用力一踩，泥巴直冲云霄，刚好飞离星球，再也没有回来。";
    if (rand(g) < 0.5) {
      return calc(g, `${lead}这颗星球的半径约为？`, `${fmt(R / 1000, 1)} km`, ["25 km", "250 m", "80 km", "6400 km"], "地球上 v² = 2gh，星球上逃逸速度 v² = 2GM/R。密度相同时表面重力和半径成正比，化简得 R = √(h·R⊕) ≈ 2.5 km。CNAO 决赛真题。");
    }
    const mant = (M / 1e14).toFixed(1);
    return calc(g, `${lead}这颗星球的质量约为？`, `${mant}×10¹⁴ kg`, [`${mant}×10¹¹ kg`, `${mant}×10¹⁷ kg`, "6.0×10²⁴ kg"], "先求半径 R = √(h·R⊕) ≈ 2.5 km，再乘上地球的密度：M = 4/3·πR³ρ ≈ 3.7×10¹⁴ kg。CNAO 决赛真题。");
  },
  dinosaur(g) {
    const D = pick(g, [14, 28, 35, 70]);
    const dm = 5 * Math.log10(D / 7);
    return calc(
      g,
      `人眼瞳孔张到 7 mm 时，肉眼极限星等约 6 等。假设马门溪龙的瞳孔有 ${D} mm，它的极限星等约为？`,
      `${fmt(6 + dm, 1)} 等`,
      [`${fmt(6 + dm / 2, 1)} 等`, `${fmt(6 + D / 7, 1)} 等`, "6 等"],
      `聚光本领和瞳孔面积成正比，Δm = 5 lg(${D}/7) ≈ ${fmt(dm, 1)}。真题里不会告诉你恐龙的瞳孔有多大。`,
    );
  },
  threeBody(g) {
    const [num, den] = pick(g, [[9, 10], [4, 5], [99, 100]] as const);
    const ratio = den / (den - num);
    const dm = 5 * Math.log10(ratio);
    return calc(
      g,
      `三体舰队飞向太阳系，飞到全程的 ${num}/${den} 时出了故障，停在原地。和出发时相比，舰队看到的太阳亮了多少个星等？`,
      `${fmt(dm, 1)} 个星等`,
      [`${fmt(dm / 2, 1)} 个星等`, `${fmt(dm * 2, 1)} 个星等`, `${fmt(dm + 2.5, 1)} 个星等`],
      `离太阳的距离变成原来的 1/${ratio}，亮度变成 ${ratio * ratio} 倍，Δm = 5 lg ${ratio} ≈ ${fmt(dm, 1)}。预赛真题改编。`,
    );
  },
};

const CALC_BY_LEVEL: Record<number, string[]> = {
  1: ["kepler", "parallax", "ratio", "magnify", "aperture", "culmination", "threeBody"],
  2: ["culmination", "kepler", "modulus", "parallax", "ratio", "wien", "hourAngle", "magnify", "hubble", "peppa", "dinosaur", "threeBody"],
  3: ["culmination", "modulus", "wien", "hourAngle", "synodic", "hubble", "ratio", "peppa", "dinosaur"],
};

export function calcQuestions(g: Rng, count: number, level: number): Question[] {
  return sample(g, CALC_BY_LEVEL[level], count).map((id) => CALC[id](g));
}

// —— 星图 ——

interface Constellation {
  id: string;
  zh: string;
  rank: number;
  ra: number;
  dec: number;
}

const CONSTELLATIONS = (sky.constellations as Constellation[]).filter((c) => sky.lines[c.id as keyof typeof sky.lines]);

/** 中国中纬度看得到、又有点名气的星座。 */
const FAMOUS = new Set([
  "Ori", "UMa", "UMi", "Cas", "Cyg", "Lyr", "Aql", "Sco", "Sgr", "Leo", "Gem", "Tau", "Aur", "CMa",
  "CMi", "Boo", "Vir", "Peg", "And", "Per", "Cep", "Dra", "Her", "CrB", "Cru", "Cen", "Crv", "Del",
  "Ari", "Cnc", "Lib", "Oph", "Cet", "Lep", "Hya", "Cap", "Aqr", "Psc", "PsA", "Eri", "Col", "Car",
]);

const FAMOUS_STARS: Record<string, string> = {
  天狼: "天狼星", 老人: "老人星", 大角: "大角星", 织女一: "织女星", 河鼓二: "牛郎星", 天津四: "天津四",
  参宿四: "参宿四", 参宿七: "参宿七", 毕宿五: "毕宿五", 心宿二: "心宿二", 角宿一: "角宿一",
  轩辕十四: "轩辕十四", 北河三: "北河三", 北河二: "北河二", 南河三: "南河三", 五车二: "五车二",
  北落师门: "北落师门", 勾陈一: "北极星", 南门二: "南门二", 十字架二: "十字架二", 水委一: "水委一",
  天枢: "天枢", 开阳: "开阳", 大陵五: "大陵五",
};

const angularDistance = (ra1: number, dec1: number, ra2: number, dec2: number) => {
  const r = Math.PI / 180;
  const c = Math.sin(dec1 * r) * Math.sin(dec2 * r) + Math.cos(dec1 * r) * Math.cos(dec2 * r) * Math.cos((ra1 - ra2) * r);
  return Math.acos(Math.min(1, Math.max(-1, c))) / r;
};

/** 用连线顶点算星座的中心和角大小，比星表里的标注点更准。 */
function lineFrame(id: string) {
  const pts = ((sky.lines as Record<string, number[][][]>)[id] ?? []).flat();
  const r = Math.PI / 180;
  let x = 0;
  let y = 0;
  let z = 0;
  for (const [ra, dec] of pts) {
    x += Math.cos(dec * r) * Math.cos(ra * r);
    y += Math.cos(dec * r) * Math.sin(ra * r);
    z += Math.sin(dec * r);
  }
  const ra = ((Math.atan2(y, x) / r) + 360) % 360;
  const dec = Math.atan2(z, Math.hypot(x, y)) / r;
  const extent = Math.max(...pts.map(([a, d]) => angularDistance(a, d, ra, dec)));
  return { ra, dec, fov: Math.min(64, Math.max(22, extent * 2.6)) };
}

function constellationQuestion(g: Rng, level: number, dome: boolean): Question {
  const pool = CONSTELLATIONS.filter((c) => FAMOUS.has(c.id) && c.dec > -55);
  const target = pick(g, pool);
  const others = CONSTELLATIONS.filter((c) => c.id !== target.id);
  // 难度越高，干扰项越是邻居
  const sorted = [...others].sort(
    (a, b) => angularDistance(a.ra, a.dec, target.ra, target.dec) - angularDistance(b.ra, b.dec, target.ra, target.dec),
  );
  const near = level === 1 ? sample(g, others.filter((c) => FAMOUS.has(c.id)), 3) : sample(g, sorted.slice(0, level === 2 ? 8 : 5), 3);
  const { options, answer } = withOptions(g, target.zh, near.map((c) => c.zh));
  const frame = lineFrame(target.id);
  const withLines = level === 1 || (level === 2 && rand(g) < 0.5);
  return {
    kind: "chart",
    prompt: withLines ? "连线画出来的是哪个星座？" : "图中央这片星空是哪个星座？",
    options,
    answer,
    explain: `${target.zh}（${target.id}）。`,
    figure: { type: "sky", ra: frame.ra, dec: frame.dec, fov: frame.fov, lines: withLines ? target.id : null, dome },
  };
}

function starQuestion(g: Rng, dome: boolean): Question {
  const bright = sky.brightStars.filter((s) => FAMOUS_STARS[s.zh] && s.dec > -50);
  const target = pick(g, bright);
  const names = [...new Set(Object.values(FAMOUS_STARS))].filter((n) => n !== FAMOUS_STARS[target.zh]);
  const { options, answer } = withOptions(g, FAMOUS_STARS[target.zh], sample(g, names, 3));
  return {
    kind: "chart",
    prompt: "圈出来的这颗亮星叫什么？",
    options,
    answer,
    explain: `${FAMOUS_STARS[target.zh]}，视星等 ${target.mag}。`,
    figure: { type: "sky", ra: target.ra, dec: target.dec, fov: 40, lines: target.c, marker: { ra: target.ra, dec: target.dec }, dome },
  };
}

export function chartQuestions(g: Rng, count: number, level: number, dome = false): Question[] {
  return Array.from({ length: count }, (_, i) => (i % 2 === 1 ? starQuestion(g, dome) : constellationQuestion(g, level, dome)));
}

// —— 读图 ——

function noise(g: Rng, amp: number) {
  return (rand(g) + rand(g) + rand(g) - 1.5) * amp;
}

function periodQuestion(g: Rng): Question {
  const P = pick(g, [2.5, 3.2, 4, 5.4, 6.8]);
  const base = 6 + rand(g) * 2;
  const points: [number, number][] = [];
  for (let i = 0; i < 46; i++) {
    const t = rand(g) * 4.2 * P;
    const phase = ((t / P) % 1 + 1) % 1;
    // 造父变星式的锯齿：快速变亮、缓慢变暗
    const shape = phase < 0.2 ? phase / 0.2 : 1 - (phase - 0.2) / 0.8;
    points.push([t, base - 0.8 * shape + noise(g, 0.08)]);
  }
  points.sort((a, b) => a[0] - b[0]);
  const { options, answer } = withOptions(g, `${P} 天`, [`${fmt(P / 2, 1)} 天`, `${fmt(P * 2, 1)} 天`, `${fmt(P * 1.5, 1)} 天`]);
  return {
    kind: "curve",
    prompt: "这颗变星的光变周期大约是多少？",
    options,
    answer,
    explain: `相邻两次极大之间约 ${P} 天。`,
    figure: { type: "plot", points, xLabel: "时间（天）", yLabel: "星等", invertY: true },
  };
}

function hubbleQuestion(g: Rng): Question {
  const H = pick(g, [50, 60, 70, 80]);
  const points: [number, number][] = [];
  for (let i = 0; i < 16; i++) {
    const d = 10 + rand(g) * 190;
    points.push([d, H * d * (1 + noise(g, 0.2))]);
  }
  const { options, answer } = withOptions(g, `${H} km/s/Mpc`, [50, 60, 70, 80, 90, 40].filter((h) => h !== H).slice(0, 3).map((h) => `${h} km/s/Mpc`));
  return {
    kind: "curve",
    prompt: "根据这些星系的距离和退行速度，哈勃常数大约是多少？",
    options,
    answer,
    explain: `斜率 v/d ≈ ${H}。`,
    figure: { type: "plot", points, xLabel: "距离（Mpc）", yLabel: "速度（km/s）" },
  };
}

function transitQuestion(g: Rng): Question {
  const ratio = pick(g, [0.05, 0.1, 0.15, 0.2]);
  const depth = ratio * ratio;
  const points: [number, number][] = [];
  for (let i = 0; i < 60; i++) {
    const t = i * 0.1;
    const inTransit = t > 2.2 && t < 3.8;
    points.push([t, 1 - (inTransit ? depth : 0) + noise(g, depth * 0.12)]);
  }
  const pct = fmt(depth * 100, 2);
  const { options, answer } = withOptions(
    g,
    `${ratio}`,
    [fmt(depth, 4), ...[0.05, 0.1, 0.15, 0.2, 0.3].filter((r) => r !== ratio).map(String)],
  );
  return {
    kind: "curve",
    prompt: `凌星时亮度下降约 ${pct}%。行星半径大约是恒星半径的多少倍？`,
    options,
    answer,
    explain: `深度 ≈ (Rp/R*)²，所以比值约为 √${fmt(depth, 4)} = ${ratio}。`,
    figure: { type: "plot", points, xLabel: "时间（小时）", yLabel: "相对亮度" },
  };
}

export function curveQuestions(g: Rng, count: number): Question[] {
  const gens = shuffle(g, [periodQuestion, hubbleQuestion, transitQuestion]);
  return Array.from({ length: count }, (_, i) => gens[i % gens.length](g));
}

export function questionsFor(g: Rng, kind: GameKind, level: number, dome = false): Question[] {
  switch (kind) {
    case "quiz":
      return quizQuestions(g, 4);
    case "calc":
      return calcQuestions(g, 3, level);
    case "chart":
      return chartQuestions(g, 3, level, dome);
    case "curve":
      return curveQuestions(g, 2);
  }
}

/** 押题小游戏的加成：倒扣分赛制下答错会变成负数。 */
export function minigameBonus(correct: number, wrong: number, total: number, negative = false) {
  const max = 6;
  if (negative) return ((correct - wrong) / total) * max;
  return (correct / total) * max;
}
