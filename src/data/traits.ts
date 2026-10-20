import type { Attr, Student } from "../engine/types";

export type Voice =
  | "join"
  | "clear"
  | "cloudy"
  | "rainout"
  | "stressed"
  | "pass"
  | "fail"
  | "medal"
  | "rest"
  | "grind"
  | "dome"
  | "buy"
  | "exam";

export interface Trait {
  id: string;
  name: string;
  desc: string;
  /** 互斥的特性 */
  excludes?: string[];
  rare?: boolean;
  init?: (s: Student) => void;
  growth?: Partial<Record<Attr, number>>;
  stressScale?: number;
  gradesScale?: number;
  /** 比赛发挥的平均偏移 */
  luck?: number;
  /** 比赛发挥的波动 */
  variance?: number;
  /** 户外活动额外系数 */
  outdoor?: number;
  /** 天象厅考试加成 */
  dome?: number;
  voice?: Partial<Record<Voice, string[]>>;
}

const atLeast = (s: Student, attr: Attr, v: number) => {
  s.attrs[attr] = Math.max(s.attrs[attr], v);
};

export const TRAITS: Trait[] = [
  {
    id: "cloudCult",
    name: "阴天教徒",
    desc: "所到之处，云量加一。阴天也不影响心情。",
    excludes: ["sunny"],
    voice: {
      join: ["大家好，听说这里经常阴天？"],
      cloudy: ["不是我干的。", "我只是路过一下……", "云是我叫来的，但我叫不走它。"],
      rainout: ["这次真不是我，我昨晚没许愿。", "（默默把头像换成了一朵云）"],
      clear: ["今天我请假了，所以晴了。"],
      dome: ["天象厅好啊，天象厅永远是晴天。"],
    },
  },
  {
    id: "sunny",
    name: "晴天娃娃",
    desc: "只要人在，云就让路。",
    excludes: ["cloudCult"],
    voice: {
      join: ["我来了，天就晴了。"],
      clear: ["看，我说什么来着。"],
      cloudy: ["今天法力不够……", "这片云是隔壁学校的。"],
    },
  },
  {
    id: "lucky",
    name: "欧皇",
    desc: "蒙的选择题都能蒙对。",
    excludes: ["unlucky"],
    luck: 4,
    voice: {
      pass: ["其实最后五道是蒙的。", "又是蒙对的一天。"],
      fail: ["欧气用在抽卡上了，失策。"],
    },
  },
  {
    id: "unlucky",
    name: "非酋",
    desc: "选择题蒙一个错一个，但越挫越勇。",
    excludes: ["lucky"],
    luck: -4,
    stressScale: 0.9,
    voice: {
      fail: ["习惯了，下一场。", "四选一我都能选到第五个。"],
      pass: ["？？？我过了？是不是改卷老师看错了"],
    },
  },
  {
    id: "physics",
    name: "物竞转来的",
    desc: "物竞没进省队，来天文降维打击。理论一骑绝尘，常识全靠蒙。",
    init: (s) => atLeast(s, "theory", 34),
    growth: { theory: 1.3, knowledge: 0.8 },
    voice: {
      join: ["物竞那边……别问了。"],
      grind: ["这题物竞初中就讲过。", "天文的力学就这？哦，球面三角啊，那没事了。"],
      fail: ["常识题考的什么啊，谁记得猎户座有几颗星。"],
    },
  },
  {
    id: "coder",
    name: "OI 转来的",
    desc: "数据处理全靠 Python，拟合一把梭。",
    init: (s) => atLeast(s, "practice", 32),
    growth: { practice: 1.35, observe: 0.9 },
    voice: {
      join: ["之前搞 OI 的，NOIP 退役了。"],
      grind: ["我写了个脚本，三秒拟合完。", "这误差棒我用 numpy 一行就画了。", "AK 了，下一题。"],
      fail: ["考场不让带电脑，这不公平。"],
    },
  },
  {
    id: "gearhead",
    name: "器材党",
    desc: "望远镜比人还多，照片一张没处理。观测强，实测慢。",
    init: (s) => atLeast(s, "observe", 32),
    growth: { observe: 1.15, practice: 0.8 },
    outdoor: 1.1,
    voice: {
      join: ["请问社里的赤道仪是什么型号的？"],
      buy: ["好耶！器材一时爽，一直器材一直爽。", "这个目镜我也想要一个。"],
      clear: ["今晚极轴我来对！"],
    },
  },
  {
    id: "astrophoto",
    name: "天文摄影砖家",
    desc: "拍的星空能上每日一天文图，就是不会算星等。",
    growth: { observe: 1.25, theory: 0.85 },
    outdoor: 1.15,
    voice: {
      clear: ["今晚视宁度在线，我去架相机了。", "叠加 200 张，明天出图。"],
      cloudy: ["云也挺好看的，拍延时吧。"],
    },
  },
  {
    id: "atlas",
    name: "星图活地图",
    desc: "闭着眼背得出 88 星座。天象厅考试如鱼得水。",
    init: (s) => atLeast(s, "observe", 30),
    growth: { observe: 1.15 },
    dome: 6,
    voice: {
      dome: ["天象厅？那我可就不困了。"],
      clear: ["抬头，那个是北落师门，这季节唯一亮的。"],
    },
  },
  {
    id: "talker",
    name: "口胡大师",
    desc: "天文常识储备惊人，一到考试就发挥失常。",
    init: (s) => atLeast(s, "knowledge", 36),
    growth: { knowledge: 1.2 },
    variance: 5,
    voice: {
      grind: ["你知道吗，其实太阳也是一颗星星。", "我给你们讲讲银心那个黑洞……"],
      fail: ["我会的都没考，考的我都会说。"],
    },
  },
  {
    id: "crank",
    name: "民科",
    desc: "总能提出惊世骇俗的理论。常识学得很慢。",
    growth: { knowledge: 0.6, theory: 1.1 },
    variance: 6,
    voice: {
      join: ["我有一个推翻相对论的想法，想跟大家分享。"],
      grind: ["我觉得暗物质就是以太。", "这道题标准答案错了，我能证明。"],
      fail: ["阅卷组不懂我的理论。"],
      pass: ["主流学界终于看见我了。"],
    },
  },
  {
    id: "grinder",
    name: "卷王",
    desc: "每晚只睡四小时，学什么都快，压力也大。",
    growth: { theory: 1.12, observe: 1.12, practice: 1.12, knowledge: 1.12 },
    stressScale: 1.2,
    voice: {
      grind: ["今天刷了三套真题，还差两套。", "凌晨两点，还有人在吗？"],
      rest: ["休息日？那我刷题了。"],
      stressed: ["没事，再卷一会儿……"],
    },
  },
  {
    id: "fragile",
    name: "玻璃心",
    desc: "非常敏感，容易退社，但理论学得飞快。",
    growth: { theory: 1.3 },
    stressScale: 1.45,
    voice: {
      stressed: ["我是不是不适合学天文……", "（撤回了一条消息）"],
      fail: ["……", "我去天台吹吹风。"],
    },
  },
  {
    id: "sleepy",
    name: "嗜睡体质",
    desc: "每天得睡够十小时。抗压很强，学得慢一点。",
    excludes: ["grinder", "nightOwl"],
    stressScale: 0.7,
    growth: { theory: 0.88, observe: 0.82, practice: 0.88, knowledge: 0.88 },
    voice: {
      clear: ["晴了吗？那我先睡一觉，三点叫我。"],
      rest: ["终于可以名正言顺地睡觉了。"],
      grind: ["zzz"],
    },
  },
  {
    id: "nightOwl",
    name: "夜猫子",
    desc: "白天睡觉，晚上发光。户外观测越熬越精神。",
    outdoor: 1.12,
    gradesScale: 1.2,
    voice: {
      clear: ["凌晨三点的银河才是真的银河。"],
      grind: ["上课睡着了，班主任拍了照发家长群。"],
    },
  },
  {
    id: "rich",
    name: "富二代",
    desc: "家里有矿。入社自带赞助，心态极好。",
    rare: true,
    stressScale: 0.85,
    voice: {
      join: ["我爸说社里缺什么跟他讲。"],
      buy: ["这个我家里有两台，明天带来。"],
      rainout: ["没事，下次包车去冷湖。"],
    },
  },
  {
    id: "topStudent",
    name: "学霸",
    desc: "竞赛和文化课两手都硬，班主任最放心的那个。",
    excludes: ["struggling"],
    gradesScale: 0.45,
    voice: {
      exam: ["期中？顺便考了个年级第三。"],
    },
  },
  {
    id: "struggling",
    name: "成绩告急",
    desc: "文化课岌岌可危，班主任已经盯上了。",
    excludes: ["topStudent"],
    gradesScale: 1.6,
    init: (s) => {
      s.grades = Math.min(s.grades, 52);
    },
    voice: {
      exam: ["家长会能不能不开……", "这次考砸了，我妈说再这样就不让来了。"],
    },
  },
  {
    id: "astigmatism",
    name: "散光",
    desc: "看星星都是一团。观测提升很慢，别的不受影响。",
    growth: { observe: 0.7 },
    voice: {
      clear: ["那颗是星星还是路灯？"],
      dome: ["天象厅的星星也是一团。"],
    },
  },
  {
    id: "astrology",
    name: "星座博主",
    desc: "坚信天文和占星是一家。社团气氛担当，常识容易学歪。",
    growth: { knowledge: 0.85 },
    voice: {
      join: ["我是天蝎座，大家呢？"],
      fail: ["水逆了，这次不算。"],
      pass: ["今天木星在我的事业宫。"],
    },
  },
  {
    id: "ophiuchus",
    name: "蛇夫座",
    desc: "坚持自己是第十三星座。常识题里的黄道题从不失手。",
    growth: { knowledge: 1.15 },
    luck: 1,
    voice: {
      join: ["我是蛇夫座的，对，第十三个。"],
      pass: ["太阳每年在我这里待十八天，你们呢？"],
    },
  },
  {
    id: "ufo",
    name: "外星人爱好者",
    desc: "相信外星文明就在附近。理论学得有劲。",
    growth: { theory: 1.1 },
    voice: {
      clear: ["那串移动的亮点是不是外星舰队！", "……哦，是星链。"],
    },
  },
  {
    id: "socialite",
    name: "社牛",
    desc: "能把教导主任聊成天文社赞助人。招新拉赞助都有加成。",
    excludes: ["shy"],
    voice: {
      join: ["大家好！我先把群名改了！"],
      rest: ["今晚狼人杀，我当法官。"],
    },
  },
  {
    id: "shy",
    name: "社恐",
    desc: "上台会紧张，私下学得很扎实。",
    excludes: ["socialite"],
    growth: { theory: 1.15, practice: 1.1 },
    variance: 3,
    voice: {
      join: ["……大家好。"],
      pass: ["（发了一个害羞的表情）"],
    },
  },
  {
    id: "calculator",
    name: "卡西欧战神",
    desc: "按计算器比别人心算还快。理论考试稳定加分。",
    luck: 2,
    growth: { theory: 1.05, practice: 1.1 },
    voice: {
      grind: ["这道球面三角，按键十七下。"],
      fail: ["计算器没电了，谁懂。"],
    },
  },
  {
    id: "eclipseChaser",
    name: "追日人",
    desc: "为了一次日全食可以飞半个地球。户外观测情绪高涨。",
    rare: true,
    outdoor: 1.1,
    stressScale: 0.95,
    voice: {
      join: ["下一次日全食在哪里来着？我先存钱。"],
      clear: ["好天气别浪费，出去出去。"],
    },
  },
];

export const TRAIT_MAP: Record<string, Trait> = Object.fromEntries(TRAITS.map((t) => [t.id, t]));

export const GENERIC_VOICE: Record<Voice, string[]> = {
  join: ["大家好！", "新人报到，请多关照。", "听说这里能免费用望远镜？"],
  clear: ["今晚晴！", "天终于晴了。", "冲冲冲，楼顶集合。"],
  cloudy: ["又阴了。", "晴天钟骗我。", "云图上全是白的。"],
  rainout: ["下雨了，望远镜收了吧。", "改室内吧，打开 Stellarium 假装在外面。"],
  stressed: ["好累……", "我好像有点学不动了。", "今晚能不能不刷题了。"],
  pass: ["过了！", "晋级了！！", "稳了。"],
  fail: ["没了。", "明年再来。", "唉。"],
  medal: ["我们做到了。", "这块牌子我要挂在望远镜上。"],
  rest: ["休息真好。", "终于有空看番了。"],
  grind: ["这题不会。", "谁能讲讲这道题？", "题刷完了，人也刷完了。"],
  dome: ["改天象厅了，那就看假星星吧。"],
  buy: ["新器材！", "社里阔起来了。"],
  exam: ["要期中考试了……", "文化课复习中，勿扰。"],
};
