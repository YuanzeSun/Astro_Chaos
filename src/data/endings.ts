export interface Ending {
  id: string;
  title: string;
  text: string;
  tone: "gold" | "good" | "plain" | "bad";
}

export const ENDINGS: Ending[] = [
  {
    id: "gold",
    title: "国歌响起",
    tone: "gold",
    text: "颁奖台上，国歌响起。校长在家长群里连发了二十个大拇指，天象厅门口多了一块牌子。陆老师发来微信：“下次一起去冷湖啊！”这一次，你回了。",
  },
  {
    id: "medal",
    title: "国际赛场",
    tone: "good",
    text: "不是金牌，但那块牌子上刻着你们学校的名字。天象厅保住了。回国的飞机上，学生们在讨论下一届的观测题会不会又遇上阴天。",
  },
  {
    id: "team",
    title: "国家队",
    tone: "good",
    text: "你的学生穿上了印着国旗的队服。校长把这张照片放上了学校官网的首页，天象厅的电费再也没人提过。",
  },
  {
    id: "camp",
    title: "国家集训队",
    tone: "good",
    text: "集训营的大门关上了，你的学生在门里面。你在门外站了很久，然后去吃了一碗当地的面。回到学校，天象厅还在。",
  },
  {
    id: "coach",
    title: "优秀辅导员",
    tone: "good",
    text: "学校橱窗里贴着你的照片和一张一等奖证书的复印件。校长说，天象厅的事以后再议。天文竞赛不保送，但总有人会记得那几个晚上。",
  },
  {
    id: "finalist",
    title: "国决见",
    tone: "plain",
    text: "你们去过决赛，在陌生城市的宾馆里打过通宵狼人杀，在观测考试那晚一起盯着云。校长犹豫了很久，天象厅留下了一半。",
  },
  {
    id: "photo",
    title: "天文摄影社",
    tone: "plain",
    text: "比赛没拿到什么，但社团的照片挂满了学校的走廊，还上过一次每日一天文图。校长说，就冲这些照片，天象厅留着。招新的时候，再也不用骗人了。",
  },
  {
    id: "alone",
    title: "光杆司令",
    tone: "bad",
    text: "天象厅改成了自习室，活动室里只剩你和那台发霉的折射镜。你一个人上了楼顶，云很厚。",
  },
  {
    id: "love",
    title: "用爱发电",
    tone: "plain",
    text: "三年过去了，没有奖杯，也没有保送。天象厅最后还是改成了高三自习室。可是毕业那天，有个学生说，以后每次抬头看到猎户座，都会想起这里。",
  },
];

export const ENDING_MAP: Record<string, Ending> = Object.fromEntries(ENDINGS.map((e) => [e.id, e]));
