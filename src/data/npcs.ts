export const NPCS: Record<string, { name: string; hue: number; glyph: string }> = {
  me: { name: "我", hue: 205, glyph: "我" },
  dean: { name: "教导主任", hue: 0, glyph: "主" },
  homeroom: { name: "班主任", hue: 30, glyph: "班" },
  principal: { name: "校长", hue: 45, glyph: "校" },
  rival: { name: "陆老师（实验中学）", hue: 280, glyph: "陆" },
  parent: { name: "家长", hue: 60, glyph: "家" },
};

export const STORY = [
  "你是刚入职的地理老师。开学第一天，课表最后多了一行：天文社指导老师。",
  "上一任指导老师去南美追日全食，到现在也没回来。社团留给你一台镜片发霉的折射镜、一摞受潮的《天文爱好者》，和一张写着“今晚晴”的便利贴。",
  "校长说，天象厅一年的电费够装十台空调。三年内拿不出成绩，就改成高三自习室。",
  "隔壁实验中学的陆老师听说了，发来一条微信：“欢迎入坑！”",
];
