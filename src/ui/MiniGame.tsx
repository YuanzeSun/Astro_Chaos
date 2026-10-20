import { useState } from "react";
import type { Question } from "../engine/minigames";
import { SkyChart } from "./SkyChart";
import { Plot } from "./Plot";

interface Props {
  questions: Question[];
  negative?: boolean;
  onDone: (correct: number, wrong: number) => void;
}

const LETTERS = ["A", "B", "C", "D"];

export function MiniGame({ questions, negative, onDone }: Props) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [tally, setTally] = useState({ right: 0, wrong: 0 });
  const q = questions[i];
  const answered = picked !== null;
  const last = i === questions.length - 1;

  function answer(idx: number) {
    if (answered) return;
    setPicked(idx);
    if (idx === -1) return;
    setTally((t) => (idx === q.answer ? { ...t, right: t.right + 1 } : { ...t, wrong: t.wrong + 1 }));
  }

  function next() {
    if (last) onDone(tally.right, tally.wrong);
    else {
      setI(i + 1);
      setPicked(null);
    }
  }

  return (
    <div>
      <p className="q-count">
        第 {i + 1} 题，共 {questions.length} 题{negative ? "。答对 +4，答错 −4，不答 0 分" : ""}
      </p>
      {q.figure?.type === "sky" ? <SkyChart fig={q.figure} /> : null}
      {q.figure?.type === "plot" ? <Plot fig={q.figure} /> : null}
      <p style={{ fontSize: 17, margin: "6px 0 12px" }}>{q.prompt}</p>
      <div className="options">
        {q.options.map((o, idx) => {
          const cls = answered ? (idx === q.answer ? "right" : idx === picked ? "wrong" : "") : "";
          return (
            <button key={idx} type="button" className={`option ${cls}`} onClick={() => answer(idx)} disabled={answered && cls === ""}>
              <span>
                {LETTERS[idx]}. {o}
              </span>
              {answered && idx === q.answer ? <span className="mark">✓</span> : null}
              {answered && idx === picked && idx !== q.answer ? <span className="mark">✗</span> : null}
            </button>
          );
        })}
        {negative && !answered ? (
          <button type="button" className="ghost" onClick={() => answer(-1)} style={{ justifySelf: "start" }}>
            不答
          </button>
        ) : null}
      </div>
      {answered ? (
        <>
          <p className="explain">{q.explain}</p>
          <div className="card-foot">
            <button type="button" className="primary" onClick={next} autoFocus>
              {last ? "交卷" : "下一题"}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
