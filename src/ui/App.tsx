import { useEffect, useRef, useState } from "react";
import { useGame } from "./useGame";
import { SkyStrip } from "./SkyStrip";
import { Roster } from "./Roster";
import { Planner } from "./Planner";
import { Chat } from "./Chat";
import { EventModal } from "./EventModal";
import { DraftModal } from "./DraftModal";
import { ContestModal } from "./ContestModal";
import { ShopModal } from "./ShopModal";
import { Settings } from "./Settings";
import { Ending } from "./Ending";
import { loadProfile, saveProfile, type Profile } from "./profile";
import { buy, chooseOption, closeContest, confirmDraft, dismissEvent, scoreContest, setActivity, startMonth, toggleDraft } from "../engine/game";
import { recordGame, resolveNight } from "../engine/contests";
import { dateLabel, nextContest, gradeName } from "../engine/calendar";
import { say } from "../engine/chat";
import { CONTESTS } from "../data/contests";
import { ACHIEVEMENTS, newAchievements } from "../data/achievements";
import { ai, aiEnabled, monthDigest, setAiEnabled, speakerId } from "../ai/client";

type Tab = "roster" | "plan" | "chat";

export function App() {
  const { game: g, act, restart, speed, setSpeed } = useGame();
  const [profile, setProfile] = useState<Profile>(loadProfile);
  const [aiOn, setAiOn] = useState(aiEnabled);
  const [shop, setShop] = useState(false);
  // ChatGPT 登录回来时直接回到设置
  const [settings, setSettings] = useState(() => location.search.includes("chatgpt="));
  const [tab, setTab] = useState<Tab>("plan");
  const [toast, setToast] = useState<string | null>(null);
  const monthStartChat = useRef(g.chatSeq);

  // 成就与结局
  useEffect(() => {
    const fresh = newAchievements(g, profile.achievements);
    const endingNew = g.ending && !profile.endings.includes(g.ending);
    if (!fresh.length && !endingNew) return;
    const next = {
      ...profile,
      achievements: [...profile.achievements, ...fresh],
      endings: endingNew ? [...profile.endings, g.ending!] : profile.endings,
      runs: endingNew ? profile.runs + 1 : profile.runs,
    };
    setProfile(next);
    saveProfile(next);
    if (fresh.length) setToast(ACHIEVEMENTS.find((a) => a.id === fresh[0])!.name);
  }, [g, profile]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  // AI 群友：每到新的一个月的排课阶段，根据上个月的群聊补几句
  const planKey = `${g.year}-${g.month}-${g.phase}`;
  useEffect(() => {
    if (g.phase !== "plan") return;
    const from = monthStartChat.current;
    monthStartChat.current = g.chatSeq;
    if (!aiOn || from === 0 || from >= g.chatSeq) return;
    const digest = monthDigest(g, from);
    let cancelled = false;
    ai.banter(digest)
      .then((lines) => {
        if (cancelled || !lines.length) return;
        act((draft) => {
          for (const l of lines) {
            const id = speakerId(draft, l.speaker);
            if (id) say(draft, id, l.text);
          }
        });
      })
      .catch((err: unknown) => {
        console.warn("AI 群友没接上", err);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planKey]);

  const slotIdx = g.phase === "running" ? Math.max(0, g.week - 1) : 0;
  const slot = g.slots[slotIdx] ?? g.slots[0];
  const weather = slot?.weather ?? slot?.forecast ?? "clear";
  const upcoming = nextContest(CONTESTS, g.phase === "running" ? g.clock + 1 : g.clock);
  const actives = g.students.filter((s) => s.status === "active");
  const p = g.pending;

  if (g.phase === "ending") {
    return (
      <Ending
        g={g}
        profile={profile}
        onRestart={() => {
          monthStartChat.current = 0;
          restart();
        }}
      />
    );
  }

  return (
    <div className="app">
      <header className="sky">
        <SkyStrip month={g.month} week={slotIdx} weather={weather} moon={slot?.moon ?? 0} lightPollution={Boolean(g.flags.lightPollution)} dome={false} />
        <div className="sky-head">
          <h1 className="title">
            天文闹赛
            <small>
              {dateLabel(g.year, g.month, g.phase === "running" ? slotIdx : undefined)}
              {actives[0] ? `　带着 ${actives.length} 个人` : ""}
            </small>
          </h1>
          <div className="vitals">
            <div className={`vital${g.money < 0 ? " warn" : ""}`}>
              <b>¥{g.money}</b>
              <span>经费</span>
            </div>
            <div className="vital">
              <b>{Math.round(g.morale)}</b>
              <span>士气</span>
            </div>
            <div className="vital">
              <b>{Math.round(g.fame)}</b>
              <span>声望</span>
            </div>
            {upcoming ? (
              <div className="vital">
                <b>{upcoming.weeks === 0 ? "本周" : `${upcoming.weeks} 周`}</b>
                <span>距{upcoming.contest.short}</span>
              </div>
            ) : null}
            <button type="button" className="icon-btn" onClick={() => setSettings(true)}>
              设置
            </button>
          </div>
        </div>
      </header>

      <nav className="tabs" aria-label="页面">
        {(
          [
            ["roster", "社员"],
            ["plan", "课表"],
            ["chat", "群聊"],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button key={id} type="button" aria-pressed={tab === id} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </nav>

      <main className="layout">
        <section className={`col${tab === "roster" ? " show" : ""}`} aria-label="社员">
          <h2 className="col-title">
            社员<span>{actives.map((s) => gradeName(s.enrollYear, g.year)).filter((v, i, a) => a.indexOf(v) === i).join(" ")}</span>
          </h2>
          <Roster g={g} />
        </section>
        <section className={`col${tab === "plan" ? " show" : ""}`} aria-label="课表">
          <h2 className="col-title">
            {dateLabel(g.year, g.month)}的课表<span>点一周，再点活动；双击清空</span>
          </h2>
          <Planner
            g={g}
            onSet={(w, id) => act((d) => setActivity(d, w, id))}
            onStart={() => act(startMonth)}
            onShop={() => setShop(true)}
            speed={speed}
            onSpeed={setSpeed}
          />
        </section>
        <section className={`col${tab === "chat" ? " show" : ""}`} aria-label="群聊">
          <h2 className="col-title">
            天文社（{actives.length + 1}）<span>群聊</span>
          </h2>
          <Chat g={g} />
        </section>
      </main>

      {p?.kind === "draft" ? <DraftModal g={g} d={p} onToggle={(id) => act((d) => toggleDraft(d, id))} onConfirm={() => act(confirmDraft)} /> : null}
      {p?.kind === "event" ? <EventModal g={g} p={p} onChoose={(id) => act((d) => chooseOption(d, id))} onDone={() => act(dismissEvent)} /> : null}
      {p?.kind === "contest" ? (
        <ContestModal
          key={`${p.contestId}-${g.clock}`}
          g={g}
          p={p}
          onNight={(id) =>
            act((d) => {
              if (d.pending?.kind === "contest") resolveNight(d, d.pending, id);
            })
          }
          onGame={(attr, kind, correct, wrong, total, bonus) =>
            act((d) => {
              if (d.pending?.kind === "contest") recordGame(d.pending, attr, kind, correct, wrong, total, bonus);
            })
          }
          onScore={() => act(scoreContest)}
          onClose={() => act(closeContest)}
        />
      ) : null}
      {shop ? <ShopModal g={g} onBuy={(id) => act((d) => void buy(d, id))} onClose={() => setShop(false)} /> : null}
      {settings ? (
        <Settings
          profile={profile}
          aiOn={aiOn}
          onAi={(on) => {
            setAiOn(on);
            setAiEnabled(on);
          }}
          onRestart={() => {
            setSettings(false);
            monthStartChat.current = 0;
            restart();
          }}
          onClose={() => setSettings(false)}
        />
      ) : null}
      {toast ? (
        <div className="toast" role="status">
          <b>成就</b>
          {toast}
        </div>
      ) : null}
    </div>
  );
}
