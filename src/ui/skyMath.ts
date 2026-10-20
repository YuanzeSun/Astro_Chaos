const R = Math.PI / 180;

export const LATITUDE = 32;

/** 晚上九点左右的地方恒星时（度）。学年从 9 月开始，每月约东移 30°。 */
export function eveningLst(month: number, week: number) {
  return (309 + month * 30 + week * 7) % 360;
}

export function sunRa(month: number, week: number) {
  return (180 + month * 30 + week * 7 - 8) % 360;
}

export function eclipticDec(ra: number) {
  return 23.44 * Math.sin(ra * R);
}

export function altAz(ra: number, dec: number, lst: number, lat = LATITUDE) {
  const H = (lst - ra) * R;
  const d = dec * R;
  const p = lat * R;
  const sinAlt = Math.sin(p) * Math.sin(d) + Math.cos(p) * Math.cos(d) * Math.cos(H);
  const alt = Math.asin(sinAlt);
  // 方位角从南点起算，向西为正
  const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(p) - Math.tan(d) * Math.cos(p));
  return { alt: alt / R, az: az / R };
}

/** 球极投影，用于星图题。东在左，西在右。 */
export function stereo(ra: number, dec: number, ra0: number, dec0: number) {
  const dra = (ra - ra0) * R;
  const d = dec * R;
  const d0 = dec0 * R;
  const cosc = Math.sin(d0) * Math.sin(d) + Math.cos(d0) * Math.cos(d) * Math.cos(dra);
  const k = 2 / (1 + cosc);
  const x = -k * Math.cos(d) * Math.sin(dra);
  const y = k * (Math.cos(d0) * Math.sin(d) - Math.sin(d0) * Math.cos(d) * Math.cos(dra));
  return { x: x / R, y: y / R, visible: cosc > 0 };
}

/** B−V 色指数映射到大致的颜色。 */
export function starColor(bv: number) {
  if (bv < 0) return "#cfe0ff";
  if (bv < 0.3) return "#eef3ff";
  if (bv < 0.6) return "#fff8ea";
  if (bv < 1.0) return "#ffe6c2";
  if (bv < 1.4) return "#ffd2a1";
  return "#ffb98a";
}

export function starRadius(mag: number, scale = 1) {
  return Math.max(0.35, (4.6 - mag) * 0.55) * scale;
}

/** 星图题用：纸面上的星点要大一些才看得清。 */
export function chartRadius(mag: number) {
  return Math.min(5.2, Math.max(1, (5.6 - mag) * 1.1));
}
