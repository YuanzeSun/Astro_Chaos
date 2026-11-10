import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Settings } from "../src/ui/Settings";
import { PLAYBACK_SPEEDS } from "../src/ui/playback";

describe("推进速度设置", () => {
  it.each(PLAYBACK_SPEEDS)("正确展示 %s 倍速的选中状态", (speed) => {
    const html = renderToStaticMarkup(createElement(Settings, {
      profile: { achievements: [], endings: [], runs: 0 },
      speed,
      onSpeed: () => {},
      aiOn: false,
      onAi: () => {},
      onRestart: () => {},
      onClose: () => {},
    }));
    const group = html.match(/aria-label="推进速度">(.*?)<\/div>/)?.[1];
    expect(group).toBeDefined();
    const labels = ["慢速", "正常", "快速"];
    PLAYBACK_SPEEDS.forEach((value, index) => {
      expect(group).toContain(`aria-pressed="${value === speed}">${labels[index]}</button>`);
    });
    expect(html).toContain("可以在页面上方暂停推进");
  });
});
