import { simulate, smartPolicy, randomPolicy } from "../tests/sim";

const runs = Number(process.argv[2] ?? 200);
for (const [name, policy, skill] of [
  ["认真教练 + 押题一半", smartPolicy, 0.5],
  ["认真教练 + 押题全对", smartPolicy, 1],
  ["乱排课", randomPolicy, 0.5],
] as const) {
  const endings: Record<string, number> = {};
  const honors: Record<string, number> = {};
  let quits = 0;
  let money = 0;
  for (let i = 0; i < runs; i++) {
    const r = simulate(1000 + i, policy, skill);
    endings[r.ending] = (endings[r.ending] ?? 0) + 1;
    for (const h of r.best) honors[h] = (honors[h] ?? 0) + 1;
    quits += r.quits;
    money += r.money;
  }
  console.log(`\n== ${name}（${runs} 局）`);
  console.log("结局", Object.entries(endings).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${((v / runs) * 100).toFixed(0)}%`).join("  "));
  console.log("出现过的荣誉", Object.entries(honors).sort().map(([k, v]) => `${k} ${((v / runs) * 100).toFixed(0)}%`).join("  "));
  console.log("平均退社", (quits / runs).toFixed(2), "期末经费", Math.round(money / runs));
}
