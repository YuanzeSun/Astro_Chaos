import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";

export interface Series {
  key: string;
  name: string;
  color: string;
  values: (number | null)[];
}

export interface XPoint {
  label: string;
  /** 轴上要不要写字 */
  tick?: string;
}

const PAD = { l: 40, r: 56, t: 10, b: 26 };

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(600);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(240, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

function niceTicks(min: number, max: number, count = 4) {
  const span = max - min || 1;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((m) => m >= raw) ?? raw;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 1000; v += step) ticks.push(Number(v.toPrecision(8)));
  return { lo, hi, ticks };
}

export function compact(v: number) {
  const a = Math.abs(v);
  if (a >= 10000) return `${(v / 10000).toFixed(a >= 100000 ? 0 : 1)}万`;
  if (a >= 1000) return `${(v / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return `${Math.round(v)}`;
}

function Legend({ series, kind = "line" }: { series: { name: string; color: string }[]; kind?: "line" | "dot" }) {
  if (series.length < 2) return null;
  return (
    <div className="legend">
      {series.map((s) => (
        <span key={s.name}>
          <i className={kind} style={{ background: s.color }} />
          {s.name}
        </span>
      ))}
    </div>
  );
}

function Tooltip({ x, width, children }: { x: number; width: number; children: ReactNode }) {
  const left = Math.min(Math.max(x + 12, 0), width - 150);
  return (
    <div className="chart-tip" style={{ left: x + 162 > width ? x - 162 : left }}>
      {children}
    </div>
  );
}

interface LineProps {
  title: string;
  series: Series[];
  x: XPoint[];
  height?: number;
  /** 固定的纵轴范围；不给就按数据算 */
  domain?: [number, number];
  format?: (v: number) => string;
  /** 在 0 处画一条稍重的线（经费会是负的） */
  zero?: boolean;
  /** 要提醒的区间，画成一条淡色带子 */
  band?: [number, number];
}

export function LineChart({ title, series, x, height = 200, domain, format = (v) => v.toFixed(1), zero, band }: LineProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const all = series.flatMap((s) => s.values.filter((v): v is number => v !== null));
  if (!all.length) return null;
  const { lo, hi, ticks } = domain ? { lo: domain[0], hi: domain[1], ticks: niceTicks(domain[0], domain[1]).ticks } : niceTicks(Math.min(...all, ...(zero ? [0] : [])), Math.max(...all, ...(zero ? [0] : [])));
  const pw = width - PAD.l - PAD.r;
  const ph = height - PAD.t - PAD.b;
  const sx = (i: number) => PAD.l + (x.length <= 1 ? pw / 2 : (i / (x.length - 1)) * pw);
  const sy = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo || 1)) * ph;

  const paths = series.map((s) => {
    let d = "";
    let pen = false;
    s.values.forEach((v, i) => {
      if (v === null) {
        pen = false;
        return;
      }
      d += `${pen ? "L" : "M"}${sx(i).toFixed(1)} ${sy(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  });

  // 线尾直接标名字；挤在一起就不标，交给图例
  const ends = series
    .map((s) => {
      let i = s.values.length - 1;
      while (i >= 0 && s.values[i] === null) i--;
      return i >= 0 ? { s, i, y: sy(s.values[i]!) } : null;
    })
    .filter((e): e is { s: Series; i: number; y: number } => Boolean(e));
  const sorted = [...ends].sort((a, b) => a.y - b.y);
  const crowded = sorted.some((e, k) => k > 0 && e.y - sorted[k - 1].y < 12);

  // 每个刻度大约要 44px；放不下就隔几个才写一个
  const tickIdx = x.flatMap((p, i) => (p.tick ? [i] : []));
  const every = Math.max(1, Math.ceil((tickIdx.length * 44) / (pw || 1)));
  const tickShown = (i: number) => tickIdx.indexOf(i) % every === 0;

  const indexAt = (clientX: number, el: Element) => {
    const rect = el.getBoundingClientRect();
    const px = clientX - rect.left;
    const i = Math.round(((px - PAD.l) / (pw || 1)) * (x.length - 1));
    return Math.max(0, Math.min(x.length - 1, i));
  };
  const onMove = (e: PointerEvent<SVGSVGElement>) => setHover(indexAt(e.clientX, e.currentTarget));
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key === "ArrowRight") setHover((h) => Math.min(x.length - 1, (h ?? -1) + 1));
    else if (e.key === "ArrowLeft") setHover((h) => Math.max(0, (h ?? x.length) - 1));
    else if (e.key === "Escape") setHover(null);
    else return;
    e.preventDefault();
  };

  return (
    <figure className="chart">
      <figcaption>{title}</figcaption>
      <Legend series={series} />
      <div className="chart-plot" ref={ref}>
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={title}
          tabIndex={0}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          onKeyDown={onKey}
          onBlur={() => setHover(null)}
        >
          {band ? <rect x={PAD.l} width={pw} y={sy(Math.min(band[1], hi))} height={sy(band[0]) - sy(Math.min(band[1], hi))} className="danger-band" /> : null}
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.l} x2={width - PAD.r} y1={sy(t)} y2={sy(t)} className={zero && t === 0 ? "axis" : "grid"} />
              <text x={PAD.l - 8} y={sy(t) + 4} textAnchor="end" className="tick">
                {compact(t)}
              </text>
            </g>
          ))}
          {x.map((p, i) =>
            p.tick && tickShown(i) ? (
              <text key={i} x={sx(i)} y={height - 8} textAnchor="middle" className="tick">
                {p.tick}
              </text>
            ) : null,
          )}
          {hover !== null ? <line x1={sx(hover)} x2={sx(hover)} y1={PAD.t} y2={PAD.t + ph} className="crosshair" /> : null}
          {series.map((s, k) => (
            <path key={s.key} d={paths[k]} stroke={s.color} className="series" />
          ))}
          {ends.map((e) => (
            <g key={e.s.key}>
              <circle cx={sx(e.i)} cy={e.y} r={4} fill={e.s.color} className="end-dot" />
              {!crowded && series.length > 1 ? (
                <text x={sx(e.i) + 8} y={e.y + 4} className="end-label">
                  {e.s.name}
                </text>
              ) : null}
            </g>
          ))}
          {hover !== null
            ? series.map((s) =>
                s.values[hover] !== null ? <circle key={s.key} cx={sx(hover)} cy={sy(s.values[hover]!)} r={4} fill={s.color} className="end-dot" /> : null,
              )
            : null}
        </svg>
        {hover !== null ? (
          <Tooltip x={sx(hover)} width={width}>
            <div className="tip-head">{x[hover].label}</div>
            {series.map((s) => (
              <div key={s.key} className="tip-row">
                <i style={{ background: s.color }} />
                <b>{s.values[hover] === null ? "—" : format(s.values[hover]!)}</b>
                <span>{s.name}</span>
              </div>
            ))}
          </Tooltip>
        ) : null}
      </div>
    </figure>
  );
}

export interface PairPoint {
  label: string;
  tick: string;
  sub?: string;
  a: number | null;
  b: number | null;
  aNote?: string;
  bNote?: string;
}

/** 每场比赛两个点：我们和对手。比赛之间难度不同，所以不连线。 */
export function PairChart({ title, points, names, colors, height = 200, format = (v) => v.toFixed(1) }: {
  title: string;
  points: PairPoint[];
  names: [string, string];
  colors: [string, string];
  height?: number;
  format?: (v: number, i: number) => string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  if (!points.length) return null;
  const { lo, hi, ticks } = { lo: 0, hi: 100, ticks: [0, 25, 50, 75, 100] };
  const pw = width - PAD.l - 16;
  const ph = height - PAD.t - PAD.b - 12;
  const band = pw / points.length;
  const cx = (i: number) => PAD.l + band * (i + 0.5);
  const sy = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * ph;
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key === "ArrowRight") setHover((h) => Math.min(points.length - 1, (h ?? -1) + 1));
    else if (e.key === "ArrowLeft") setHover((h) => Math.max(0, (h ?? points.length) - 1));
    else if (e.key === "Escape") setHover(null);
    else return;
    e.preventDefault();
  };
  return (
    <figure className="chart">
      <figcaption>{title}</figcaption>
      <Legend series={names.map((n, i) => ({ name: n, color: colors[i] }))} kind="dot" />
      <div className="chart-plot" ref={ref}>
        <svg width={width} height={height} role="img" aria-label={title} tabIndex={0} onKeyDown={onKey} onBlur={() => setHover(null)} onPointerLeave={() => setHover(null)}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.l} x2={width - 16} y1={sy(t)} y2={sy(t)} className="grid" />
              <text x={PAD.l - 8} y={sy(t) + 4} textAnchor="end" className="tick">
                {t}
              </text>
            </g>
          ))}
          {points.map((p, i) => (
            <g key={i} onPointerEnter={() => setHover(i)}>
              <rect x={cx(i) - band / 2} y={PAD.t} width={band} height={ph} className={hover === i ? "hit on" : "hit"} />
              {p.a !== null && p.b !== null ? <line x1={cx(i)} x2={cx(i)} y1={sy(p.a)} y2={sy(p.b)} className="pair-link" /> : null}
              {p.b !== null ? <circle cx={cx(i)} cy={sy(p.b)} r={hover === i ? 5 : 4} fill={colors[1]} className="end-dot" /> : null}
              {p.a !== null ? <circle cx={cx(i)} cy={sy(p.a)} r={hover === i ? 5 : 4} fill={colors[0]} className="end-dot" /> : null}
              {band >= 30 ? (
                <text x={cx(i)} y={height - 20} textAnchor="middle" className="tick">
                  {p.tick}
                </text>
              ) : null}
              {band >= 30 && p.sub ? (
                <text x={cx(i)} y={height - 6} textAnchor="middle" className="tick faint">
                  {p.sub}
                </text>
              ) : null}
            </g>
          ))}
        </svg>
        {hover !== null ? (
          <Tooltip x={cx(hover)} width={width}>
            <div className="tip-head">{points[hover].label}</div>
            {([points[hover].a, points[hover].b] as (number | null)[]).map((v, k) => (
              <div key={k} className="tip-row">
                <i style={{ background: colors[k] }} />
                <b>{v === null ? "—" : format(v, hover)}</b>
                <span>{k === 0 ? points[hover].aNote ?? names[0] : points[hover].bNote ?? names[1]}</span>
              </div>
            ))}
          </Tooltip>
        ) : null}
      </div>
    </figure>
  );
}
