// The game's only use of a model: a few group-chat lines about the month that just went by.

import { z } from "zod";
import type { LlmGateway } from "./llm/gateway";

const SYSTEM = [
  "你在给一个中文搞笑养成游戏《天文闹赛》写群聊台词。玩家是高中天文社的指导老师，带学生打天文奥赛（省赛、CNAO 预赛和决赛、国家集训队、IOAA）。",
  "群里的人：社员们（每人有几个性格特性），以及偶尔冒泡的教导主任、班主任、校长、隔壁实验中学的陆老师。",
  "根据这个月发生的事，写 2 到 4 条群聊消息。要求：口语、短（每条不超过 30 个字）、贴合说话人的特性、带一点天文圈或竞赛圈的梗；不要说教，不要给玩家建议，不要编造游戏里没发生的大事。",
  "speaker 必须是给出的社员姓名，或者“教导主任”“班主任”“校长”“陆老师”之一。",
].join("\n");

const Lines = z.object({
  lines: z.array(z.object({ speaker: z.string(), text: z.string() })),
});

const SCHEMA = {
  type: "object",
  properties: {
    lines: {
      type: "array",
      items: {
        type: "object",
        properties: { speaker: { type: "string" }, text: { type: "string" } },
        required: ["speaker", "text"],
        additionalProperties: false,
      },
    },
  },
  required: ["lines"],
  additionalProperties: false,
};

export const BanterBody = z.object({ digest: z.string().min(2).max(8000) });

export async function banter(gateway: LlmGateway, digest: string) {
  const result = await gateway.call({
    system: [{ text: SYSTEM, cache: true }],
    user: digest,
    maxTokens: 16000,
    effort: "low",
    json: { name: "banter", schema: SCHEMA },
  });
  if (result.refused) return [];
  const start = result.text.indexOf("{");
  const end = result.text.lastIndexOf("}");
  if (start < 0 || end < start) return [];
  let raw: unknown;
  try {
    raw = JSON.parse(result.text.slice(start, end + 1));
  } catch {
    return [];
  }
  const parsed = Lines.safeParse(raw);
  if (!parsed.success) return [];
  return parsed.data.lines
    .map((l) => ({ speaker: l.speaker.trim(), text: l.text.trim().slice(0, 60) }))
    .filter((l) => l.speaker && l.text)
    .slice(0, 4);
}
