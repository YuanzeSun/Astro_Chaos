import { useMemo } from "react";
import sky from "../data/sky.json";
import type { SkyFigure } from "../engine/minigames";
import { stereo, chartRadius } from "./skyMath";

const SIZE = 420;

export function SkyChart({ fig }: { fig: SkyFigure }) {
  const k = SIZE / 2 / (fig.fov / 2);
  const map = (ra: number, dec: number) => {
    const p = stereo(ra, dec, fig.ra, fig.dec);
    return { x: SIZE / 2 + p.x * k, y: SIZE / 2 - p.y * k, visible: p.visible };
  };
  const stars = useMemo(
    () =>
      (sky.stars as number[][])
        .map(([ra, dec, mag]) => ({ ...map(ra, dec), mag }))
        .filter((s) => s.visible && s.x > -10 && s.x < SIZE + 10 && s.y > -10 && s.y < SIZE + 10),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fig.ra, fig.dec, fig.fov],
  );
  const lines = useMemo(() => {
    if (!fig.lines) return "";
    const segs = (sky.lines as Record<string, number[][][]>)[fig.lines] ?? [];
    return segs
      .map((seg) =>
        seg
          .map(([ra, dec], i) => {
            const p = map(ra, dec);
            return `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
          })
          .join(""),
      )
      .join("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fig.lines, fig.ra, fig.dec, fig.fov]);
  const marker = fig.marker ? map(fig.marker.ra, fig.marker.dec) : null;
  const dome = fig.dome;
  const ink = dome ? "#f2f4f6" : "#1d2533";
  return (
    <svg className="figure" viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="星图">
      <defs>
        <clipPath id="chartClip">
          <circle cx={SIZE / 2} cy={SIZE / 2} r={SIZE / 2 - 4} />
        </clipPath>
      </defs>
      <circle cx={SIZE / 2} cy={SIZE / 2} r={SIZE / 2 - 4} fill={dome ? "#0b1424" : "#f7f8f5"} stroke={dome ? "#2a3a55" : "#9aa3ad"} />
      <g clipPath="url(#chartClip)">
        {lines ? <path d={lines} stroke={dome ? "#8fb3e8" : "#5d6676"} strokeWidth="1.6" fill="none" opacity="0.75" /> : null}
        {stars.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={chartRadius(s.mag)} fill={ink} />
        ))}
        {marker ? <circle cx={marker.x} cy={marker.y} r="13" fill="none" stroke="#c8322b" strokeWidth="2" /> : null}
      </g>
      {dome ? null : (
        <>
          <text x={SIZE / 2} y="18" textAnchor="middle" fontSize="12" fill="#5d6676">
            北
          </text>
          <text x="10" y={SIZE / 2 + 4} fontSize="12" fill="#5d6676">
            东
          </text>
        </>
      )}
    </svg>
  );
}
