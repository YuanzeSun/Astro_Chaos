const ATTRS = ["theory", "observe", "practice", "culture"];

const ATTR_LABELS = {
  theory: "理论",
  observe: "观测",
  practice: "实测",
  culture: "常识",
};

const MONTHS = [8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7];
const WEEKS_PER_MONTH = 4;
const MAX_YEARS = 3;

const WEATHER = [
  { name: "晴朗", emoji: "☀️", weight: 30, observe: 1.15, stress: -1 },
  { name: "少云", emoji: "🌤️", weight: 26, observe: 1.05, stress: 0 },
  { name: "多云", emoji: "☁️", weight: 20, observe: 0.92, stress: 1 },
  { name: "阴天", emoji: "🌥️", weight: 16, observe: 0.78, stress: 2 },
  { name: "大雨", emoji: "🌧️", weight: 8, observe: 0.55, stress: 4 },
];

const SURNAMES = [
  "张", "王", "李", "赵", "刘", "陈", "杨", "黄", "吴", "徐", "孙", "马", "朱",
  "胡", "林", "郭", "何", "高", "罗", "郑", "梁", "谢", "宋", "唐", "许", "邓",
  "冯", "曹", "彭", "曾", "肖", "田", "董", "潘", "袁", "于", "蒋", "蔡", "余",
  "杜", "叶", "范", "韩", "金", "邱", "姜", "覃",
];

const NAMES = [
  "子涵", "思源", "嘉琪", "浩然", "语晨", "雨泽", "若溪", "俊熙", "睿航", "奕辰",
  "晨曦", "书瑶", "芷若", "欣怡", "诗琪", "浩宇", "怡然", "嘉懿", "沐阳", "子墨",
  "星辰", "明轩", "皓轩", "嘉豪", "之恒", "泽楷", "钰琪", "凌云", "嘉禾", "乐瑶",
];

const TRAITS = [
  {
    id: "theorist",
    name: "理论奇才",
    desc: "理论起点高，理论训练收益更高。",
    apply(student) {
      student.attrs.theory = Math.max(student.attrs.theory, 58);
      student.growth.theory *= 1.25;
    },
  },
  {
    id: "photographer",
    name: "天文摄影砖家",
    desc: "观测起点高，但实测处理慢。",
    apply(student) {
      student.attrs.observe = Math.max(student.attrs.observe, 58);
      student.growth.practice *= 0.85;
    },
  },
  {
    id: "data",
    name: "数据大师",
    desc: "实测起点高，数据类活动收益更好。",
    apply(student) {
      student.attrs.practice = Math.max(student.attrs.practice, 55);
      student.growth.practice *= 1.2;
    },
  },
  {
    id: "popularizer",
    name: "科普达人",
    desc: "常识起点高，减压活动也能学到东西。",
    apply(student) {
      student.attrs.culture = Math.max(student.attrs.culture, 55);
      student.growth.culture *= 1.15;
    },
  },
  {
    id: "rich",
    name: "富二代",
    desc: "入社带来赞助，抗压能力略强。",
    apply(student) {
      student.stressScale *= 0.82;
      student.sponsor = 950;
    },
  },
  {
    id: "fragile",
    name: "玻璃心",
    desc: "压力更敏感，但理论学习快。",
    apply(student) {
      student.stressScale *= 1.35;
      student.growth.theory *= 1.25;
    },
  },
  {
    id: "cloud",
    name: "阴天教徒",
    desc: "更容易遇到阴天，但阴天观测惩罚较小。",
    apply(student) {
      student.cloudAffinity = true;
    },
  },
  {
    id: "lucky",
    name: "欧皇",
    desc: "比赛波动更偏正向。",
    apply(student) {
      student.luck += 0.12;
    },
  },
  {
    id: "unlucky",
    name: "非酋",
    desc: "比赛波动更偏负向，但低谷会增加韧性。",
    apply(student) {
      student.luck -= 0.12;
      student.resilience += 0.08;
    },
  },
  {
    id: "sleepy",
    name: "嗜睡体质",
    desc: "压力恢复更快，训练收益略低。",
    apply(student) {
      student.stressScale *= 0.76;
      for (const attr of ATTRS) student.growth[attr] *= 0.92;
    },
  },
  {
    id: "debater",
    name: "口胡大师",
    desc: "常识很好，但大型比赛发挥略不稳定。",
    apply(student) {
      student.attrs.culture = Math.max(student.attrs.culture, 52);
      student.variance += 0.04;
    },
  },
  {
    id: "scatter",
    name: "散光",
    desc: "观测学习较慢，实测不受影响。",
    apply(student) {
      student.growth.observe *= 0.78;
    },
  },
];

const TRAINING_PLANS = [
  {
    id: "mock_exam",
    name: "模拟笔试",
    type: "训练",
    cost: 170,
    stress: 8,
    gains: { theory: 4.6, culture: 1.6 },
    desc: "稳定提升理论，压力中等。",
  },
  {
    id: "past_papers",
    name: "竞赛真题拆解",
    type: "训练",
    cost: 130,
    stress: 10,
    gains: { theory: 5.8, practice: 1.4 },
    desc: "短期冲分强，但容易累积压力。",
  },
  {
    id: "stargazing",
    name: "外出观测",
    type: "观测",
    cost: 560,
    stress: 4,
    gains: { observe: 6.2, culture: 1.4 },
    weatherSensitive: true,
    desc: "受天气影响大，晴天收益很高。",
  },
  {
    id: "meteor_watch",
    name: "流星雨守夜",
    type: "观测",
    cost: 490,
    stress: -4,
    gains: { observe: 4.2, culture: 2.0 },
    weatherSensitive: true,
    desc: "适合压压力，但天气不好会浪费机会。",
  },
  {
    id: "data_pipeline",
    name: "数据处理流水线",
    type: "实测",
    cost: 250,
    stress: 8,
    gains: { practice: 5.2, theory: 1.2 },
    desc: "强化实测和误差分析。",
  },
  {
    id: "orbit_code",
    name: "轨道计算马拉松",
    type: "实测",
    cost: 160,
    stress: 11,
    gains: { practice: 5.8, theory: 2.6 },
    desc: "高压高收益，适合赛前补短板。",
  },
  {
    id: "planetarium",
    name: "星象厅定位",
    type: "综合",
    cost: 360,
    stress: 5,
    gains: { observe: 3.6, culture: 3.4 },
    desc: "观测和常识兼顾。",
  },
  {
    id: "paper_repro",
    name: "复现论文图表",
    type: "综合",
    cost: 90,
    stress: 11,
    gains: { practice: 5.0, theory: 3.0 },
    desc: "便宜但很折磨。",
  },
  {
    id: "popular_science",
    name: "科普报告会",
    type: "恢复",
    cost: 220,
    stress: -6,
    gains: { culture: 4.4, theory: 1.0 },
    desc: "提升常识，同时缓解压力。",
  },
  {
    id: "movie",
    name: "观看纪录片",
    type: "恢复",
    cost: 150,
    stress: -8,
    gains: { culture: 3.2 },
    desc: "低风险恢复节奏。",
  },
  {
    id: "repair_scope",
    name: "维修望远镜",
    type: "管理",
    cost: 460,
    stress: 3,
    gains: { observe: 2.0, practice: 2.4 },
    desc: "提高设备状态，减少后续事故概率。",
    equipment: 8,
  },
  {
    id: "sponsor",
    name: "争取赞助",
    type: "管理",
    cost: 60,
    stress: 6,
    gains: { culture: 0.8 },
    money: 360,
    desc: "增加资金，训练收益有限。",
  },
  {
    id: "rest",
    name: "整周休整",
    type: "恢复",
    cost: 0,
    stress: -14,
    gains: {},
    morale: 5,
    desc: "没有知识收益，但能稳住队伍。",
  },
  {
    id: "recruit_talk",
    name: "招新宣讲",
    type: "管理",
    cost: 300,
    stress: 2,
    gains: { culture: 1.2 },
    morale: 2,
    recruitChance: 0.72,
    desc: "有机会招到新社员，队伍越小越稳定。",
  },
  {
    id: "filter_upgrade",
    name: "购置滤镜组",
    type: "管理",
    cost: 930,
    stress: 1,
    gains: { observe: 1.4, practice: 1.0 },
    equipment: 16,
    desc: "提高设备状态，长期降低观测事故风险。",
  },
  {
    id: "closed_camp",
    name: "校内模拟营",
    type: "综合",
    cost: 720,
    stress: 9,
    gains: { theory: 3.2, observe: 2.2, practice: 2.2, culture: 1.2 },
    morale: 1,
    desc: "昂贵但全面，适合关键比赛前整队提速。",
  },
  {
    id: "peer_teaching",
    name: "社员互讲",
    type: "恢复",
    cost: 0,
    stress: -3,
    gains: { theory: 1.8, culture: 2.2 },
    morale: 3,
    desc: "收益不爆炸，但能修复队伍状态。",
  },
];

const EVENTS = [
  {
    id: "software_update",
    title: "星图软件更新",
    actionName: "部署星图更新",
    probability: 0.08,
    text: "星图软件终于修好了中文字体和导出功能。",
    effects: { attrs: { practice: 1.6 }, stress: -2 },
  },
  {
    id: "cloud_week",
    title: "连续阴雨",
    actionName: "调整阴雨周计划",
    probability: 0.08,
    requiresWeather: ["阴天", "大雨"],
    text: "连续阴雨让观测计划很难推进。",
    effects: { attrs: { observe: -1.3 }, stress: 3 },
  },
  {
    id: "scope_damage",
    title: "设备事故",
    actionName: "抢修设备事故",
    probability: 0.055,
    text: "社团望远镜被借去活动后出现赤道仪故障。",
    effects: { money: -360, equipment: -7, stress: 2 },
  },
  {
    id: "old_papers",
    title: "旧题流出",
    actionName: "整理古早旧题",
    probability: 0.07,
    text: "学长翻出了几套古早训练题。",
    effects: { attrs: { theory: 1.8, culture: 0.8 }, stress: 2 },
  },
  {
    id: "public_night",
    title: "公众观测夜",
    actionName: "承办公共观测夜",
    probability: 0.06,
    text: "天文社办了一场公众观测夜，意外招来很多关注。",
    effects: { money: 260, attrs: { culture: 1.4, observe: 0.8 }, morale: 3 },
  },
  {
    id: "argument",
    title: "训练争执",
    actionName: "调停训练争执",
    probability: 0.06,
    text: "社员对该刷题还是该观测吵了一架。",
    effects: { stress: 5, morale: -3 },
  },
  {
    id: "clear_night",
    title: "绝佳夜空",
    actionName: "抓住绝佳夜空",
    probability: 0.055,
    requiresWeather: ["晴朗", "少云"],
    text: "罕见透明度和视宁度同时在线。",
    effects: { attrs: { observe: 2.2 }, stress: -3 },
  },
  {
    id: "teacher_visit",
    title: "名师串门",
    actionName: "接住名师串门",
    probability: 0.045,
    text: "路过的老师讲了一小时恒星演化，大家记了满满几页。",
    effects: { attrs: { theory: 1.4, culture: 1.8 } },
  },
  {
    id: "burnout",
    title: "疲劳反噬",
    actionName: "处理疲劳反噬",
    probability: 0.05,
    minStress: 72,
    text: "高压训练开始反噬，队伍效率下降。",
    effects: { attrs: { theory: -1.0, practice: -1.0 }, morale: -4 },
  },
];

const CONTESTS = [
  {
    id: "city",
    name: "市级预赛",
    month: 10,
    week: 4,
    weights: { theory: 0.34, observe: 0.18, practice: 0.08, culture: 0.4 },
    cutoff: 42,
    quotaRatio: 0.8,
    honor: "市队",
    stress: 7,
  },
  {
    id: "province",
    name: "省级复赛",
    month: 11,
    week: 4,
    requires: "市队",
    weights: { theory: 0.28, observe: 0.27, practice: 0.28, culture: 0.17 },
    cutoff: 50,
    quotaRatio: 0.65,
    honor: "省队",
    stress: 9,
    camp: true,
  },
  {
    id: "national_prelim",
    name: "CNAO 国初",
    month: 4,
    week: 4,
    weights: { theory: 0.48, observe: 0.1, practice: 0.12, culture: 0.3 },
    cutoff: 62,
    quota: 4,
    honor: "国初",
    stress: 9,
  },
  {
    id: "national_final",
    name: "CNAO 国决",
    month: 5,
    week: 4,
    requires: "国初",
    weights: { theory: 0.42, observe: 0.22, practice: 0.3, culture: 0.06 },
    cutoff: 76,
    quota: 3,
    honor: "国集",
    stress: 11,
    camp: true,
  },
  {
    id: "ioaa",
    name: "IOAA 国际赛",
    month: 8,
    week: 1,
    minYear: 2,
    requires: "国集",
    weights: { theory: 0.42, observe: 0.26, practice: 0.28, culture: 0.04 },
    cutoff: 82,
    quota: 1,
    honor: "IOAA",
    stress: 12,
    final: true,
  },
];

const CAMP_ACTIONS = [
  {
    id: "review",
    name: "赛前串讲",
    desc: "补齐理论框架。",
    effects: { attrs: { theory: 2.2, culture: 0.8 }, stress: 3 },
  },
  {
    id: "sleep",
    name: "强制睡觉",
    desc: "保状态，少一点临场爆炸。",
    effects: { stress: -8, morale: 2 },
  },
  {
    id: "instrument",
    name: "器材手感",
    desc: "熟悉星图和望远镜流程。",
    effects: { attrs: { observe: 1.8, practice: 1.2 }, stress: 2 },
  },
  {
    id: "gossip",
    name: "走廊情报",
    desc: "听来的消息真假参半。",
    effects: { attrs: { culture: 1.8 }, stress: 1, luck: 0.04 },
  },
  {
    id: "pep",
    name: "心理建设",
    desc: "让队伍相信自己能赢。",
    effects: { stress: -4, morale: 4 },
  },
];

const STORY_BEATS = [
  "天象厅的灯亮起，你发现自己成了高中天文社指导老师。",
  "这届社员并不完美，但每个人都有一点奇怪的闪光点。",
  "三年、有限经费、几场关键比赛，足够制造一场新的时间线。",
];

export {
  ATTRS,
  ATTR_LABELS,
  MONTHS,
  WEEKS_PER_MONTH,
  MAX_YEARS,
  WEATHER,
  SURNAMES,
  NAMES,
  TRAITS,
  TRAINING_PLANS,
  EVENTS,
  CONTESTS,
  CAMP_ACTIONS,
  STORY_BEATS,
};
