// 从 d3-celestial（BSD-3-Clause, Olaf Frohn）数据生成游戏用的精简星表。
// 用法：node scripts/build-sky.mjs <d3-celestial/data 目录>
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2];
if (!dir) {
  console.error("用法：node scripts/build-sky.mjs <d3-celestial/data 目录>");
  process.exit(1);
}
const load = (name) => JSON.parse(readFileSync(join(dir, name), "utf8"));
const round = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;
const ra = (lon) => round((lon + 360) % 360);

const MAG_LIMIT = 5.2;
const stars = load("stars.6.json")
  .features.filter((f) => f.properties.mag <= MAG_LIMIT)
  .map((f) => [ra(f.geometry.coordinates[0]), round(f.geometry.coordinates[1]), round(f.properties.mag, 1), round(Number(f.properties.bv) || 0.6, 1)]);

const names = load("starnames.json");
const brightIds = load("stars.6.json")
  .features.filter((f) => f.properties.mag <= 2.6 && names[f.id]?.zh)
  .map((f) => ({
    zh: names[f.id].zh,
    c: names[f.id].c,
    ra: ra(f.geometry.coordinates[0]),
    dec: round(f.geometry.coordinates[1]),
    mag: round(f.properties.mag, 2),
  }));

const lines = Object.fromEntries(
  load("constellations.lines.json").features.map((f) => [
    f.id,
    f.geometry.coordinates.map((seg) => seg.map(([lon, lat]) => [ra(lon), round(lat)])),
  ]),
);

const constellations = load("constellations.json").features.map((f) => ({
  id: f.id,
  zh: f.properties.zh,
  rank: Number(f.properties.rank),
  ra: ra(f.geometry.coordinates[0]),
  dec: round(f.geometry.coordinates[1]),
}));

const out = { stars, brightStars: brightIds, constellations, lines };
writeFileSync(new URL("../src/data/sky.json", import.meta.url), JSON.stringify(out));
console.log(`stars ${stars.length}, bright ${brightIds.length}, constellations ${constellations.length}`);
