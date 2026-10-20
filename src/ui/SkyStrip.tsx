import { memo, useEffect, useRef, useState } from "react";
import sky_ from "../data/sky.json";
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

/** 星星、星座连线、月亮画在一张画布上：两千多颗星如果都是 DOM 节点，页面别处一动就会拖慢。 */
function SkyCanvas({ month, week, moon, lightPollution, dome }: { month: number; week: number; moon: MoonPhase; lightPollution: boolean; dome: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: Math.round(e.contentRect.width), h: Math.round(e.contentRect.height) }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || !size || !size.w || !size.h) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    el.width = Math.round(size.w * dpr);
    el.height = Math.round(size.h * dpr);
    const ctx = el.getContext("2d");
    if (!ctx) return;
    // 和 SVG 的 preserveAspectRatio="xMidYMax slice" 对齐，好跟前景的楼对上
    const k = Math.max(size.w / W, size.h / H);
    ctx.setTransform(dpr * k, 0, 0, dpr * k, (dpr * (size.w - W * k)) / 2, dpr * (size.h - H * k));

    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#0a1525");
    sky.addColorStop(0.75, "#13233b");
    sky.addColorStop(1, lightPollution ? "#4a3a2c" : "#22324a");
    ctx.fillStyle = sky;
    ctx.fillRect(-W, -H, W * 3, H * 2);
    if (dome) return;

    const lst = eveningLst(month, week);
    ctx.strokeStyle = "rgba(159, 180, 214, 0.16)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (const segs of Object.values(sky_.lines) as number[][][][]) {
      for (const seg of segs) {
        let pen = false;
        for (const [ra, dec] of seg) {
          const { alt, az } = altAz(ra, dec, lst);
          if (alt < 0 || Math.abs(az) > AZ_SPAN) {
            pen = false;
            continue;
          }
          const p = project(alt, az);
          if (pen) ctx.lineTo(p.x, p.y);
          else ctx.moveTo(p.x, p.y);
          pen = true;
        }
      }
    }
    ctx.stroke();

    for (const [ra, dec, mag, bv] of sky_.stars as number[][]) {
      const { alt, az } = altAz(ra, dec, lst);
      if (alt < 1 || Math.abs(az) > AZ_SPAN) continue;
      const p = project(alt, az);
      const fade = Math.min(1, alt / 14);
      ctx.globalAlpha = (0.45 + 0.55 * fade) * (mag < 4 ? 1 : 0.7);
      ctx.fillStyle = starColor(bv);
      ctx.beginPath();
      ctx.arc(p.x, p.y, starRadius(mag, 0.95), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (moon === 0) return;
    const ra = (sunRa(month, week) + [0, 90, 180, 270][moon]) % 360;
    const { alt, az } = altAz(ra, eclipticDec(ra), lst);
    if (alt < 3 || Math.abs(az) > AZ_SPAN) return;
    const { x, y } = project(alt, az);
    const r = 11;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 5);
    glow.addColorStop(0, "rgba(244, 239, 224, 0.22)");
    glow.addColorStop(1, "rgba(244, 239, 224, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(x - r * 5, y - r * 5, r * 10, r * 10);
    ctx.fillStyle = "#28374e";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f4efe0";
    ctx.beginPath();
    if (moon === 2) ctx.arc(x, y, r, 0, Math.PI * 2);
    else {
      // 上弦亮在西侧（右），下弦亮在东侧（左）
      const right = moon === 1;
      ctx.arc(x, y, r, -Math.PI / 2, Math.PI / 2, !right);
      ctx.ellipse(x, y, 1, r, 0, Math.PI / 2, -Math.PI / 2, !right);
    }
    ctx.fill();
  }, [size, month, week, moon, lightPollution, dome]);

  return <canvas ref={ref} className="sky-strip" role="img" aria-label="今晚的夜空" />;
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
    <SkyCanvas month={month} week={week} moon={moon} lightPollution={lightPollution} dome={dome} />
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
