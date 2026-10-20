/** 学年从 9 月开始，到次年 8 月结束。 */
export const MONTHS = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8] as const;
export const WEEKS = 4;
export const YEARS = 3;
export const TOTAL_WEEKS = YEARS * MONTHS.length * WEEKS;

export const GRADE_NAMES = ["高一", "高二", "高三"];
export const CN_NUM = ["零", "一", "二", "三", "四"];

export const calendarMonth = (monthIndex: number) => MONTHS[monthIndex];

export function absoluteWeek(year: number, month: number, week: number) {
  return ((year - 1) * MONTHS.length + month) * WEEKS + week;
}

export function dateLabel(year: number, month: number, week?: number) {
  const base = `第${CN_NUM[year]}年 ${MONTHS[month]}月`;
  return week === undefined ? base : `${base} 第${CN_NUM[week + 1]}周`;
}

export function gradeOf(enrollYear: number, year: number) {
  return year - enrollYear + 1;
}

export function gradeName(enrollYear: number, year: number) {
  return GRADE_NAMES[gradeOf(enrollYear, year) - 1] ?? "毕业生";
}

/** 学校里的固定节点：考试周、假期。 */
export const SCHOOL_WEEKS: Record<string, { month: number; week: number; label: string; kind: "exam" | "holiday" }> = {
  midterm1: { month: 2, week: 1, label: "期中考试", kind: "exam" },
  final1: { month: 4, week: 2, label: "期末考试", kind: "exam" },
  midterm2: { month: 7, week: 1, label: "期中考试", kind: "exam" },
  final2: { month: 10, week: 0, label: "期末考试", kind: "exam" },
};

export function schoolWeek(month: number, week: number) {
  return Object.values(SCHOOL_WEEKS).find((s) => s.month === month && s.week === week);
}

export const isWinterBreak = (month: number) => month === 5;
export const isSummerBreak = (month: number) => month === 10 || month === 11;

/** 从当前绝对周数起，找下一场比赛。 */
export function nextContest<T extends { month: number; week: number }>(contests: T[], clock: number): { contest: T; weeks: number } | null {
  let best: { contest: T; weeks: number } | null = null;
  for (const c of contests) {
    for (let y = 1; y <= YEARS; y++) {
      const at = absoluteWeek(y, c.month, c.week);
      if (at < clock) continue;
      if (!best || at - clock < best.weeks) best = { contest: c, weeks: at - clock };
      break;
    }
  }
  return best;
}
