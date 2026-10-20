# 天文闹赛 Astro Chaos

你是刚入职的地理老师。开学第一天，课表最后多了一行：天文社指导老师。上一任去南美追日全食，到现在也没回来，只留下一台镜片发霉的折射镜和一张写着“今晚晴”的便利贴。

校长说，天象厅一年的电费够装十台空调。三年内拿不出成绩，就改成高三自习室。隔壁实验中学的陆老师听说了，发来一条微信：“欢迎入坑！”

## 怎么玩

- **招新**：开局从一摞入社申请表里挑四个人，之后每个新学年再招。每个人都有两三个特性，比如阴天教徒、物竞转来的、卷王、口胡大师、星座博主。
- **排课**：每个月排四周的活动，分理论、观测、实测、常识、休整、社务六类。户外观测要看天气预报和月相：满月拍不了深空，阴天就只能回室内看 Stellarium。
- **过日子**：一周一周往下跑。社团群里会冒出各种事：教导主任夜查楼顶、二姨让你算星座、物竞教练来挖人、参宿四好像要爆了。
- **比赛**：省赛、CNAO 预赛、CNAO 决赛、国家集训队选拔、IOAA。赛前可以替学生押题，题目有四种：
  - 常识选择题，预赛和真实赛制一样答错倒扣；
  - 计算题，比如中天高度、距离模数、开普勒第三定律；
  - 星图题，用真实星表画出来，认星座、认亮星；
  - 读图题，比如变星周期、哈勃图、凌星深度。
  
  押中越多，学生那一科发挥越好。决赛和 IOAA 的观测考试要看当晚天气，阴雨就改天象厅。
- **结局与成就**：一共 9 个结局、22 个成就，要多带几届才能收齐。

压力太高的学生会退社，文化课太差的会被家长领回家，经费见底了要去找校长。

## 运行

需要 Node.js 20 以上。

```bash
npm install
npm start
```

然后打开 http://127.0.0.1:8765/ 。

不想开服务端也行：`npm run build` 之后直接双击 `dist/index.html`，只是没有 AI 群友。

## AI 群友（可选）

在游戏的「设置」里打开后，每个月结束时，AI 会根据这个月发生的事替社员们在群里聊几句。模型从下面几处找，有哪个用哪个：

- **Claude Code**：读 `~/.claude/settings.json` 里的 `env`（`ANTHROPIC_API_KEY` 或 `ANTHROPIC_AUTH_TOKEN`、`ANTHROPIC_BASE_URL`、模型名）。没写模型就用 `claude-opus-5-5`。
- **Codex**：读 `~/.codex/config.toml` 和 `auth.json`。
- **用 ChatGPT 登录**：在设置里点一下，用账号的 ChatGPT 套餐。
- **DeepSeek**：在设置里填 API key。

也可以在设置里手动选模型。密钥只留在本机的服务端进程里，不进浏览器；在游戏里接上的账号存在 `~/.config/astro-chaos/`。这一套和作者的另一个游戏 Elmsford 是同一份代码。

## 开发

```bash
npm run dev       # 服务端和 Vite 一起起，打开 http://127.0.0.1:5178/
npm test          # 引擎、题库、事件内容的检查
npm run sim       # 跑几百局模拟，看结局分布，调数值用
npm run typecheck
```

```text
src/
  engine/   游戏规则：日历、天气月相、学生、事件、比赛、结局
  data/     内容：特性、活动、事件、比赛、题库、器材、结局、成就、星表
  ui/       界面（React）
  ai/       AI 群友的前端
server/     本机服务端：读 CLI 凭据、ChatGPT 登录、DeepSeek、调模型
scripts/    数值模拟、星表生成、开发启动
tests/      单元测试和模拟器
```

数值旋钮集中在 `src/engine/balance.ts`。想加事件，往 `src/data/events.ts` 里加一条就行，文本里的 `{a}`、`{b}` 会替换成学生的名字。

星表来自 [d3-celestial](https://github.com/ofrohn/d3-celestial)（BSD-3-Clause, Olaf Frohn）。重新生成星表：

```bash
node scripts/build-sky.mjs <d3-celestial 的 data 目录>
```

## 说明

游戏纯属虚构。赛制参考了真实的全国中学生天文知识竞赛（CNAO）和 IOAA，但为了好玩做了简化。人物、学校都是编的。

作者 [@Luca](https://github.com/YuanzeSun)。受 [OItrainer](https://github.com/seve42/OItrainer) 启发。欢迎二次开发，请保留原作者信息。
