import { afterEach, describe, expect, it, vi } from "vitest";
import { parsePlayback, scheduleWeek } from "../src/ui/playback";

const running = { phase: "running", pending: null } as const;
afterEach(() => vi.useRealTimers());

describe("推进节奏", () => {
  it.each([null, "{", "null", "[]", '{"speed":0}', '{"speed":"2"}'])("无效偏好 %s 使用默认值", (raw) => {
    expect(parsePlayback(raw)).toEqual({ speed: 1, paused: false });
  });

  it("恢复速度与暂停状态，只接受布尔暂停值", () => {
    expect(parsePlayback('{"speed":2,"paused":true}')).toEqual({ speed: 2, paused: true });
    expect(parsePlayback('{"speed":0.5,"paused":"false"}')).toEqual({ speed: 0.5, paused: false });
  });

  it.each([0.5, 1, 2] as const)("%s 倍速每周只推进一次", (speed) => {
    vi.useFakeTimers();
    const tick = vi.fn();
    scheduleWeek(running, { speed, paused: false }, tick);
    vi.advanceTimersByTime(1400 / speed - 1);
    expect(tick).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(tick).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(10000);
    expect(tick).toHaveBeenCalledTimes(1);
  });

  it("暂停、排课、结局和等待事件时不推进", () => {
    vi.useFakeTimers();
    const tick = vi.fn();
    const playing = { speed: 1, paused: false } as const;
    scheduleWeek(running, { ...playing, paused: true }, tick);
    scheduleWeek({ phase: "plan", pending: null }, playing, tick);
    scheduleWeek({ phase: "ending", pending: null }, playing, tick);
    scheduleWeek({ phase: "running", pending: { kind: "draft", picks: 4, candidates: [], chosen: [] } }, playing, tick);
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(10000);
    expect(tick).not.toHaveBeenCalled();
  });

  it("暂停或切换速度时清理旧计时，继续后等待完整间隔", () => {
    vi.useFakeTimers();
    const tick = vi.fn();
    const cancel = scheduleWeek(running, { speed: 1, paused: false }, tick);
    vi.advanceTimersByTime(1000);
    cancel?.();
    scheduleWeek(running, { speed: 1, paused: true }, tick);
    vi.advanceTimersByTime(10000);
    expect(tick).not.toHaveBeenCalled();
    const cancelFast = scheduleWeek(running, { speed: 2, paused: false }, tick);
    vi.advanceTimersByTime(699);
    expect(tick).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(tick).toHaveBeenCalledTimes(1);
    cancelFast?.();
    expect(vi.getTimerCount()).toBe(0);
  });
});
