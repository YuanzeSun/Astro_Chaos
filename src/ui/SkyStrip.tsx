import { memo, useMemo } from "react";
import sky from "../data/sky.json";
import type { MoonPhase, WeatherId } from "../engine/types";
import { altAz, eclipticDec, eveningLst, starColor, starRadius, sunRa } from "./skyMath";

const W = 1200;
const H = 230;
const HORIZON = 196;
const AZ_SPAN = 120; // 左右各 120°，以正南为中心
const ALT_TOP = 78;

const project = (alt: number, az: number) => ({
  x: W / 2 + (az / AZ_SPAN) * (W / 2),
  y: HORIZON - (alt / ALT_TOP) * (HORIZON - 8),
});

interface Props {
  month: number;
  week: number;
  weather: WeatherId;
  moon: MoonPhase;
  lightPollution: boolean;
  dome: boolean;
}

function Stars({ month, week }: { month: number; week: number }) {
  const lst = eveningLst(month, week);
  const stars = useMemo(
    () =>
      (sky.stars as number[][])
        .map(([ra, dec, mag, bv]) => {
          const { alt, az } = altAz(ra, dec, lst);
          if (alt < 1 || Math.abs(az) > AZ_SPAN) return null;
          const p = project(alt, az);
          // 低空大气消光
          const fade = Math.min(1, alt / 14);
          return { ...p, r: starRadius(mag, 0.95), c: starColor(bv), o: (0.45 + 0.55 * fade) * (mag < 4 ? 1 : 0.7) };
        })
        .filter(Boolean) as { x: number; y: number; r: number; c: string; o: number }[],
    [lst],
  );
  const lines = useMemo(() => {
    const out: string[] = [];
    for (const segs of Object.values(sky.lines) as number[][][][]) {
      for (const seg of segs) {
        let d = "";
        let pen = false;
        for (const [ra, dec] of seg) {
          const { alt, az } = altAz(ra, dec, lst);
          if (alt < 0 || Math.abs(az) > AZ_SPAN) {
            pen = false;
            continue;
          }
          const p = project(alt, az);
          d += `${pen ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
          pen = true;
        }
        if (d) out.push(d);
      }
    }
    return out.join("");
  }, [lst]);
  return (
    <g>
      <path d={lines} stroke="#9fb4d6" strokeOpacity="0.16" strokeWidth="0.8" fill="none" />
      {stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={s.c} opacity={s.o} />
      ))}
    </g>
  );
}

function Moon({ month, week, phase }: { month: number; week: number; phase: MoonPhase }) {
  if (phase === 0) return null;
  const elong = [0, 90, 180, 270][phase];
  const ra = (sunRa(month, week) + elong) % 360;
  const { alt, az } = altAz(ra, eclipticDec(ra), eveningLst(month, week));
  if (alt < 3 || Math.abs(az) > AZ_SPAN) return null;
  const p = project(alt, az);
  const r = 11;
  // 上弦亮在西侧（右），下弦亮在东侧（左）
  const lit = phase === 2 ? null : phase === 1 ? 1 : -1;
  return (
    <g>
      <circle cx={p.x} cy={p.y} r={r * 5} fill="url(#moonGlow)" />
      <circle cx={p.x} cy={p.y} r={r} fill="#28374e" />
      {lit === null ? (
        <circle cx={p.x} cy={p.y} r={r} fill="#f4efe0" />
      ) : (
        <path d={`M${p.x} ${p.y - r} A${r} ${r} 0 0 ${lit > 0 ? 1 : 0} ${p.x} ${p.y + r} A1 ${r} 0 0 ${lit > 0 ? 0 : 1} ${p.x} ${p.y - r}Z`} fill="#f4efe0" />
      )}
    </g>
  );
}

function Skyline({ lightPollution }: { lightPollution: boolean }) {
  // 教学楼、楼顶小圆顶、几棵树、一盏钠灯
  const windows = [];
  for (let i = 0; i < 18; i++) {
    const x = 470 + (i % 9) * 22;
    const y = HORIZON - 34 + Math.floor(i / 9) * 14;
    if ((i * 7) % 5 === 0) windows.push(<rect key={i} x={x} y={y} width="9" height="6" fill="#f0a944" opacity="0.75" />);
  }
  return (
    <g>
      <rect x="0" y={HORIZON} width={W} height={H - HORIZON} fill="#070e19" />
      <path
        d={`M0 ${HORIZON + 4} Q 120 ${HORIZON - 14} 210 ${HORIZON - 2} T 380 ${HORIZON - 6} L 380 ${HORIZON + 6} Z`}
        fill="#070e19"
      />
      <rect x="455" y={HORIZON - 44} width="215" height="48" fill="#070e19" />
      <rect x="600" y={HORIZON - 54} width="34" height="12" fill="#070e19" />
      <path d={`M598 ${HORIZON - 54} a19 19 0 0 1 38 0 Z`} fill="#0b1524" stroke="#1d2c44" />
      <rect x="614" y={HORIZON - 72} width="5" height="18" fill="#122036" />
      {windows}
      <circle cx="730" cy={HORIZON - 16} r="20" fill="#070e19" />
      <circle cx="755" cy={HORIZON - 24} r="24" fill="#070e19" />
      <circle cx="782" cy={HORIZON - 12} r="16" fill="#070e19" />
      <rect x="880" y={HORIZON - 64} width="3" height="66" fill="#0b1524" />
      <circle cx="881" cy={HORIZON - 66} r={lightPollution ? 90 : 60} fill="url(#sodium)" />
      <circle cx="881" cy={HORIZON - 66} r="3" fill="#ffc46b" />
      <path d={`M960 ${HORIZON + 2} Q 1060 ${HORIZON - 18} 1200 ${HORIZON - 8} L1200 ${HORIZON + 6} Z`} fill="#070e19" />
    </g>
  );
}

const COVER: Record<WeatherId, number> = { clear: 0, fair: 2, cloudy: 5, overcast: 9, rain: 10 };

/** 云和雨放在 SVG 外面的单独图层：模糊只画一次，飘动交给合成器。 */
function Weather({ weather }: { weather: WeatherId }) {
  const cover = COVER[weather];
  if (!cover) return null;
  const clouds = Array.from({ length: cover }, (_, i) => ({
    left: ((i * 397) % 1300) / 12 - 12,
    top: (30 + ((i * 131) % 130)) / 2.3 - 14,
    width: (300 + ((i * 53) % 240)) / 12,
    height: (68 + ((i * 17) % 52)) / 2.3,
  }));
  return (
    <div className={`sky-weather ${weather}`} aria-hidden="true">
      <div className="sky-clouds">
        {clouds.map((c, i) => (
          <span key={i} style={{ left: `${c.left}%`, top: `${c.top}%`, width: `${c.width}%`, height: `${c.height}%` }} />
        ))}
      </div>
      {weather === "overcast" || weather === "rain" ? <div className="sky-overcast" /> : null}
      {weather === "rain" ? (
        <div className="sky-rain">
          <div />
        </div>
      ) : null}
    </div>
  );
}

export const SkyStrip = memo(function SkyStrip({ month, week, weather, moon, lightPollution, dome }: Props) {
  return (
    <>
    <svg className="sky-strip" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" role="img" aria-label="今晚的夜空">
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0a1525" />
          <stop offset="0.75" stopColor="#13233b" />
          <stop offset="1" stopColor={lightPollution ? "#4a3a2c" : "#22324a"} />
        </linearGradient>
        <radialGradient id="moonGlow">
          <stop offset="0" stopColor="#f4efe0" stopOpacity="0.22" />
          <stop offset="1" stopColor="#f4efe0" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill="url(#skyGrad)" />
      {dome ? null : <Stars month={month} week={week} />}
      {dome ? null : <Moon month={month} week={week} phase={moon} />}
    </svg>
    {dome ? null : <Weather weather={weather} />}
    <svg className="sky-strip" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <radialGradient id="sodium">
          <stop offset="0" stopColor="#f0a944" stopOpacity="0.45" />
          <stop offset="1" stopColor="#f0a944" stopOpacity="0" />
        </radialGradient>
      </defs>
      <Skyline lightPollution={lightPollution} />
    </svg>
    </>
  );
});
