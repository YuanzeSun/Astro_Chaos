import { useMemo, useState } from "react";
import type { Attr, GameState, PendingContest } from "../engine/types";
import { CONTEST_MAP, type Section } from "../data/contests";
import { NIGHTS } from "../data/nights";
import { WEATHER } from "../data/sky";
import { questionsFor, minigameBonus } from "../engine/minigames";
import { displayScore } from "../engine/contests";
import { dateLabel, CN_NUM } from "../engine/calendar";
import { ATTR_LABEL, byId } from "../engine/students";
import { MiniGame } from "./MiniGame";
import { Avatar } from "./Avatar";

const LEVEL: Record<string, number> = { province: 1, prelim: 2, final: 2, camp: 3, ioaa: 3 };

interface Props {
  g: GameState;
  p: PendingContest;
  onNight: (id: string) => void;
  onGame: (attr: Attr, kind: string, correct: number, wrong: number, total: number, bonus: number) => void;
  onScore: () => void;
  onClose: () => void;
}

function hash(...parts: (string | number)[]) {
  let h = 2166136261;
  for (const ch of parts.join("|")) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

function SectionPaper({ g, p, sec, index, onGame }: { g: GameState; p: PendingContest; sec: Section; index: number; onGame: Props["onGame"] }) {
  const def = CONTEST_MAP[p.contestId];
  const [playing, setPlaying] = useState(false);
  const dome = Boolean(sec.dome || (sec.outdoor && p.venue === "dome"));
  const questions = useMemo(
    () => questionsFor({ rng: hash(g.seed, g.clock, p.contestId, sec.attr) }, sec.game, LEVEL[p.contestId] ?? 2, dome),
    [g.seed, g.clock, p.contestId, sec.attr, sec.game, dome],
  );
  const negative = Boolean(def.negative);
  const done = (correct: number, wrong: number) => {
    const bonus = minigameBonus(correct, wrong, questions.length, negative);
    onGame(sec.attr, negative && sec.game === "quiz" ? "quiz-neg" : sec.game, correct, wrong, questions.length, bonus);
  };
  return (
    <div className="paper-section">
      <h3>
        第{CN_NUM[index + 1]}部分　{sec.label}
      </h3>
      {sec.outdoor && p.weather ? (
        <div className="venue">
          {WEATHER[p.weather].glyph} 考试那晚{WEATHER[p.weather].name}。
          {p.venue === "dome" ? "观测考试改在天象厅，考的是假星星。" : "望远镜实操照常进行。"}
        </div>
      ) : null}
      {playing ? (
        <MiniGame questions={questions} negative={negative} onDone={done} />
      ) : (
        <>
          <p>考前押几道{ATTR_LABEL[sec.attr]}题，押中越多，学生这一科发挥越好。</p>
          <div className="card-foot">
            <button type="button" className="ghost" onClick={() => onGame(sec.attr, "skip", 0, 0, 0, 0)}>
              不押了
            </button>
            <button type="button" className="primary" onClick={() => setPlaying(true)}>
              押题
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function ContestModal({ g, p, onNight, onGame, onScore, onClose }: Props) {
  const def = CONTEST_MAP[p.contestId];
  const [started, setStarted] = useState(false);
  const [nightSeen, setNightSeen] = useState(p.nightLog.length);
  const people = p.participants.map((id) => byId(g, id)).filter(Boolean);
  const pending = def.sections.filter((s) => !p.played.includes(s.attr));
  const full = def.fullMark ?? 100;

  let body: React.ReactNode;
  if (p.results) {
    const qualifiers = def.extraQual ? p.results.filter((r) => byId(g, r.studentId)?.quals.includes(def.extraQual!.qual)) : [];
    body = (
      <>
        <table className="scores">
          <thead>
            <tr>
              <th>考生</th>
              {def.sections.map((s) => (
                <th key={s.attr}>{s.label}</th>
              ))}
              <th>总分</th>
              <th>结果</th>
            </tr>
          </thead>
          <tbody>
            {p.results.map((r) => (
              <tr key={r.studentId}>
                <td>{r.name}</td>
                {def.sections.map((s) => (
                  <td key={s.attr}>{Math.round(r.sections[s.attr] ?? 0)}</td>
                ))}
                <td className="total">{displayScore(def, r.score).toFixed(1)}</td>
                <td className="award">{r.award ?? "—"}</td>
              </tr>
            ))}
            {p.rival ? (
              <tr className="rival">
                <td>实验中学 {p.rival.name}</td>
                {def.sections.map((s) => (
                  <td key={s.attr} />
                ))}
                <td>{displayScore(def, p.rival.score).toFixed(1)}</td>
                <td>{p.rival.award ?? "—"}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
        {qualifiers.length ? (
          <p>
            <span className="mark">{qualifiers.map((r) => r.name).join("、")}</span> 入选{def.extraQual!.label}。
          </p>
        ) : null}
        {def.schoolCap && p.results.some((r) => !r.award && r.score >= def.awards[0].min) ? <p>同校名额最多 {def.schoolCap} 人，有人分数够了也没能入选。</p> : null}
        <div className="card-foot">
          <button type="button" className="primary" onClick={onClose} autoFocus>
            收卷
          </button>
        </div>
      </>
    );
  } else if (!started) {
    body = (
      <>
        <p>{def.intro}</p>
        <p style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", fontFamily: "var(--sans)", fontSize: 14 }}>
          参赛：
          {people.map((s) => (
            <span key={s!.id} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
              <Avatar student={s!} size={22} />
              {s!.name}
            </span>
          ))}
        </p>
        <div className="card-foot">
          <button type="button" className="primary" onClick={() => setStarted(true)} autoFocus>
            {def.nights ? "出发" : "进考场"}
          </button>
        </div>
      </>
    );
  } else if (p.nightLog.length > nightSeen) {
    body = (
      <>
        <p>{p.nightLog[p.nightLog.length - 1]}</p>
        <div className="card-foot">
          <button type="button" className="primary" onClick={() => setNightSeen(p.nightLog.length)} autoFocus>
            {p.nights > 0 ? "下一晚" : "第二天"}
          </button>
        </div>
      </>
    );
  } else if (p.nights > 0) {
    body = (
      <>
        <h3 style={{ margin: "0 0 10px" }}>考前一晚，大家打算……</h3>
        <div className="nights">
          {p.nightOptions.map((id) => {
            const n = NIGHTS.find((x) => x.id === id)!;
            return (
              <button
                key={id}
                type="button"
                className="option"
                onClick={() => onNight(id)}
              >
                <span>{n.label}</span>
              </button>
            );
          })}
        </div>
      </>
    );
  } else if (pending.length) {
    const sec = pending[0];
    body = <SectionPaper key={sec.attr} g={g} p={p} sec={sec} index={def.sections.indexOf(sec)} onGame={onGame} />;
  } else {
    body = (
      <>
        <p>卷子都收上去了。剩下的交给阅卷组。</p>
        <div className="card-foot">
          <button type="button" className="primary" onClick={onScore} autoFocus>
            查成绩
          </button>
        </div>
      </>
    );
  }

  return (
    <div className="scrim" role="dialog" aria-modal="true" aria-labelledby="contest-title">
      <div className="paper">
        {p.results?.some((r) => r.award && ["金牌", "一等奖", "入选国家队"].includes(r.award)) ? <span className="stamp">喜报</span> : null}
        <h2 id="contest-title">{def.name}</h2>
        <p className="sub">
          {dateLabel(g.year, g.month)}　满分 {full}
        </p>
        {body}
      </div>
    </div>
  );
}
