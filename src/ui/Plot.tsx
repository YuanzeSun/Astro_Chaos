import type { PlotFigure } from "../engine/minigames";

const W = 440;
const H = 260;
const PAD = { l: 52, r: 14, t: 14, b: 40 };

function ticks(min: number, max: number, n = 5) {
  const step = (max - min) / n;
  const mag = 10 ** Math.floor(Math.log10(step));
  const nice = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((m) => m >= step) ?? step;
  const out: number[] = [];
  for (let v = Math.ceil(min / nice) * nice; v <= max + 1e-9; v += nice) out.push(Number(v.toPrecision(6)));
  return out;
}

export function Plot({ fig }: { fig: PlotFigure }) {
  const xs = fig.points.map((p) => p[0]);
  const ys = fig.points.map((p) => p[1]);
  const xMin = Math.min(0, ...xs);
  const xMax = Math.max(...xs) * 1.04;
  const yPad = (Math.max(...ys) - Math.min(...ys)) * 0.15 || 1;
  const yMin = fig.yLabel.includes("速度") ? 0 : Math.min(...ys) - yPad;
  const yMax = Math.max(...ys) + yPad;
  const sx = (x: number) => PAD.l + ((x - xMin) / (xMax - xMin)) * (W - PAD.l - PAD.r);
  const sy = (y: number) => {
    const t = (y - yMin) / (yMax - yMin);
    return fig.invertY ? PAD.t + t * (H - PAD.t - PAD.b) : H - PAD.b - t * (H - PAD.t - PAD.b);
  };
  const fmt = (v: number) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : Number(v.toFixed(3)).toString());
  return (
    <svg className="figure" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="数据图">
      <rect x={PAD.l} y={PAD.t} width={W - PAD.l - PAD.r} height={H - PAD.t - PAD.b} fill="#f7f8f5" stroke="#9aa3ad" />
      {ticks(xMin, xMax).map((t) => (
        <g key={`x${t}`}>
          <line x1={sx(t)} x2={sx(t)} y1={H - PAD.b} y2={H - PAD.b + 4} stroke="#5d6676" />
          <text x={sx(t)} y={H - PAD.b + 16} textAnchor="middle" fontSize="11" fill="#5d6676">
            {fmt(t)}
          </text>
        </g>
      ))}
      {ticks(yMin, yMax, 4).map((t) => (
        <g key={`y${t}`}>
          <line x1={PAD.l - 4} x2={PAD.l} y1={sy(t)} y2={sy(t)} stroke="#5d6676" />
          <line x1={PAD.l} x2={W - PAD.r} y1={sy(t)} y2={sy(t)} stroke="#d5dad6" strokeDasharray="2 3" />
          <text x={PAD.l - 7} y={sy(t) + 4} textAnchor="end" fontSize="11" fill="#5d6676">
            {fmt(t)}
          </text>
        </g>
      ))}
      {fig.points.map(([x, y], i) => (
        <circle key={i} cx={sx(x)} cy={sy(y)} r="2.6" fill="#1d2533" />
      ))}
      <text x={(W + PAD.l) / 2} y={H - 6} textAnchor="middle" fontSize="12" fill="#1d2533">
        {fig.xLabel}
      </text>
      <text x="12" y={H / 2} textAnchor="middle" fontSize="12" fill="#1d2533" transform={`rotate(-90 12 ${H / 2})`}>
        {fig.yLabel}
      </text>
    </svg>
  );
}
