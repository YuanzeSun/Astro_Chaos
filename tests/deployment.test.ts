import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("在线版和本地部署", () => {
  it.each([undefined, "false", "true"])("构建标志 %s 正确控制 AI 入口和已保存的开关", async (flag) => {
    vi.stubEnv("VITE_GITHUB_PAGES", flag);
    vi.stubGlobal("localStorage", { getItem: () => "on" });
    const { aiEnabled } = await import("../src/ai/client");
    const { Settings } = await import("../src/ui/Settings");
    const html = renderToStaticMarkup(createElement(Settings, {
      profile: { achievements: [], endings: [], runs: 0 },
      speed: 1,
      onSpeed: () => {},
      aiOn: false,
      onAi: () => {},
      onRestart: () => {},
      onClose: () => {},
    }));

    if (flag === "true") {
      expect(aiEnabled()).toBe(false);
      expect(html).toContain("在线版不支持 AI 群友");
      expect(html).toContain("在本地运行");
      expect(html).not.toContain('aria-label="AI 群友"');
    } else {
      expect(aiEnabled()).toBe(true);
      expect(html).toContain('aria-label="AI 群友"');
      expect(html).not.toContain("在线版不支持 AI 群友");
    }
  });
});
