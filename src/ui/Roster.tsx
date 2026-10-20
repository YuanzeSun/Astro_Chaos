import { useLayoutEffect, useRef, useState } from "react";
import type { Attr, GameState, Student } from "../engine/types";
import { ATTRS, ATTR_LABEL, rating } from "../engine/students";
import { gradeName } from "../engine/calendar";
import { TRAIT_MAP } from "../data/traits";
import { CONTEST_MAP } from "../data/contests";
import { Avatar } from "./Avatar";

const SHORT_AWARD: Record<string, string> = { 晋级决赛: "进决赛", 入选国家队: "国家队" };

function honorLabel(h: Student["honors"][number]) {
  return `${CONTEST_MAP[h.contest].short}${SHORT_AWARD[h.award] ?? h.award}`;
}

export function TraitChip({ id }: { id: string }) {
  const t = TRAIT_MAP[id];
  if (!t) return null;
  return (
    <button type="button" className="trait">
      {t.name}
      <span className="tip" role="tooltip">
        {t.desc}
      </span>
    </button>
  );
}

type SortKey = Attr | "stress" | null;

function Row({ s, g, open, onToggle }: { s: Student; g: GameState; open: boolean; onToggle: () => void }) {
  const base = g.monthStart?.[s.id];
  const best = s.honors[s.honors.length - 1];
  const stressCls = s.stress >= 95 ? "hot" : s.stress >= 75 ? "warm" : "";
  return (
    <li className={`row${open ? " open" : ""}`}>
      <button type="button" className="row-main" onClick={onToggle} aria-expanded={open}>
        <Avatar student={s} size={22} />
        <span className="row-name">
          <b>{s.name}</b>
          <small>{best ? honorLabel(best) : gradeName(s.enrollYear, g.year)}</small>
        </span>
        {ATTRS.map((a) => (
          <span key={a} className="cell" title={`${ATTR_LABEL[a]} ${s.attrs[a].toFixed(1)}`}>
            <b>{Math.round(s.attrs[a])}</b>
            <i style={{ width: `${s.attrs[a]}%` }} />
          </span>
        ))}
        <span className={`cell stress ${stressCls}`} title={`压力 ${Math.round(s.stress)}`}>
          <b>{Math.round(s.stress)}</b>
          <i style={{ width: `${Math.min(100, s.stress)}%` }} />
        </span>
      </button>
      {open ? (
        <div className="row-more">
          <div className="row-stats">
            {ATTRS.map((a) => {
              const d = base ? s.attrs[a] - base[a] : 0;
              return (
                <span key={a}>
                  {ATTR_LABEL[a]} {s.attrs[a].toFixed(1)}
                  <small> {rating(s.attrs[a])}</small>
                  {Math.abs(d) >= 0.1 ? <em className={d < 0 ? "down" : ""}>{`${d > 0 ? "+" : "−"}${Math.abs(d).toFixed(1)}`}</em> : null}
                </span>
              );
            })}
          </div>
          <div className="row-bars">
            <span>文化课</span>
            <div className="bar grades">
              <i style={{ width: `${s.grades}%` }} />
            </div>
            <em>{Math.round(s.grades)}</em>
          </div>
          {s.honors.length ? (
            <div className="honors">
              {s.honors.map((h, i) => (
                <span className="honor" key={i}>
                  {honorLabel(h)}
                </span>
              ))}
            </div>
          ) : null}
          <div className="traits">
            {s.traits.map((t) => (
              <TraitChip key={t} id={t} />
            ))}
          </div>
        </div>
      ) : null}
    </li>
  );
}

export function Roster({ g }: { g: GameState }) {
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const [sort, setSort] = useState<SortKey>(null);
  const team = g.students.filter((s) => s.status === "active");
  const gone = g.students.filter((s) => s.status !== "active");
  const list = sort ? [...team].sort((a, b) => (sort === "stress" ? b.stress - a.stress : b.attrs[sort] - a.attrs[sort])) : team;
  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  // 列太窄、两个字横着放不下时竖着写。按数据列的实际宽度判断，不去改 DOM 再量
  const headRef = useRef<HTMLDivElement>(null);
  const [vertical, setVertical] = useState(false);
  useLayoutEffect(() => {
    const root = headRef.current?.parentElement;
    if (!root) return;
    const check = () => {
      const track = root.querySelector<HTMLElement>(".row-main .cell");
      const label = headRef.current?.querySelector<HTMLElement>(".cell.head");
      if (!track || !label) return;
      const size = parseFloat(getComputedStyle(label).fontSize) || 11;
      setVertical(size * 2 > track.clientWidth);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(root);
    const track = root.querySelector(".row-main .cell");
    if (track) ro.observe(track);
    return () => ro.disconnect();
  }, [team.length]);

  const head = (key: SortKey, label: string) => (
    <button key={key ?? "none"} type="button" className={`cell head${vertical ? " vertical" : ""}`} aria-pressed={sort === key} onClick={() => setSort(sort === key ? null : key)} title={sort === key ? "恢复原来的顺序" : "按这一项排序"}>
      {label}
    </button>
  );
  return (
    <div className="roster">
      <div className="row-head" ref={headRef}>
        <span className="row-name" />
        {ATTRS.map((a) => head(a, ATTR_LABEL[a]))}
        {head("stress", "压力")}
      </div>
      <ul>
        {list.map((s) => (
          <Row key={s.id} s={s} g={g} open={open.has(s.id)} onToggle={() => toggle(s.id)} />
        ))}
      </ul>
      {gone.length ? (
        <p className="left-note">
          离开的：
          {gone.map((s, i) => (
            <span key={s.id}>
              {i ? "、" : ""}
              {s.name}（{s.leftNote}）
            </span>
          ))}
        </p>
      ) : null}
    </div>
  );
}
