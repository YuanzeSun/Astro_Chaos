import type { ChoiceEvent } from "../engine/eventTypes";

/** 由状态触发的事件，不进随机池。 */
export const SYSTEM_EVENTS: ChoiceEvent[] = [
  {
    id: "breakdown",
    title: "崩溃边缘",
    text: "晚上十一点，{a}在群里发了一句“我是不是不适合学天文”，然后撤回了。",
    cooldown: 4,
    options: [
      { id: "leave", label: "放{a}一周假", win: { text: "{a}回家睡了一周，回来的时候眼睛亮了。", fx: { self: { stress: -40 }, morale: -1 } } },
      {
        id: "talk",
        label: "去楼顶聊聊",
        check: { attr: "morale", dc: 45 },
        win: { text: "你们在楼顶坐了很久，你讲了自己高中时预赛考了负分的事。{a}笑了。", fx: { self: { stress: -30 }, morale: 3 } },
        lose: { text: "聊了很久，{a}说好多了，但看得出来还没缓过来。", fx: { self: { stress: -12 } } },
      },
      {
        id: "push",
        label: "“再坚持一下，马上就比赛了”",
        check: { attr: "luck", dc: 0.35 },
        win: { text: "{a}咬牙挺过来了，好像还变强了一点。", fx: { self: { attrs: { theory: 2 }, stress: -5 } } },
        lose: { text: "第二天，{a}的座位空了。退社申请压在望远镜底下。", fx: { self: { leave: "quit", leaveNote: "压力太大" } } },
      },
    ],
  },
  {
    id: "gradesCrisis",
    title: "班主任找上门",
    text: "期中成绩出来了。{a}的班主任拿着成绩单站在活动室门口：“再这样下去，家长就要来了。”",
    cooldown: 4,
    options: [
      { id: "pause", label: "让{a}先回班补一个月", win: { text: "{a}回去刷了一个月五三，成绩回来了，人也憋坏了。", fx: { self: { grades: 22, stress: 6, attrs: { theory: -1, observe: -1 } } } } },
      {
        id: "plead",
        label: "替{a}求情",
        check: { attr: "fame", dc: 40 },
        win: { text: "班主任叹了口气：“下次考好就行。”", fx: { self: { grades: 6 } } },
        lose: { text: "家长来了，把{a}领回了家。", fx: { self: { leave: "pulled", leaveNote: "被家长领回家刷题" } } },
      },
      {
        id: "promise",
        label: "“下次一定考好”",
        check: { attr: "luck", dc: 0.5 },
        win: { text: "{a}熬了两周夜，期末真的考好了。", fx: { self: { grades: 14, stress: 10 } } },
        lose: { text: "没考好。家长来了，把{a}领回了家。", fx: { self: { leave: "pulled", leaveNote: "被家长领回家刷题" } } },
      },
    ],
  },
  {
    id: "debt",
    title: "账上没钱了",
    text: "财务处打电话来：天文社的账户是负数。教导主任说，月底之前要有个说法。",
    cooldown: 4,
    options: [
      {
        id: "principal",
        label: "找校长申请临时拨款",
        check: { attr: "fame", dc: 40 },
        win: { text: "校长批了，还说：明年拿个奖回来。", fx: { money: 1500 } },
        lose: { text: "校长批了一半，顺便问了问社团今年到底有什么成绩。", fx: { money: 700, fame: -5 } },
      },
      { id: "crowd", label: "社员众筹", win: { text: "每人凑了一点。有人把压岁钱拿出来了，你心里不是滋味。", fx: { money: 900, morale: -6 } } },
      { id: "salary", label: "自己掏工资", win: { text: "这个月你吃了三十顿泡面。", fx: { money: 1200, morale: 2 } } },
    ],
  },
];
