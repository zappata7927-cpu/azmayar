"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ClipboardCheck, Play, Check, X, ChevronLeft, Trophy, BookOpenCheck, RotateCcw, History, BadgeCheck, Flame, GraduationCap, TrendingUp, Award, ChevronDown, ChevronUp, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { AppData, Question } from "@/lib/types";
import type { Route } from "@/lib/nav";
import { useAppStore, type QuizRun } from "@/lib/store";
import { buildQuiz, quizCountsFor, type QuizMode, type QuizSession } from "@/lib/quiz";
import { faNum, cn } from "@/lib/utils";
import { tapHaptic } from "@/lib/haptics";
import { toast } from "sonner";

const OPTION_LETTERS = ["الف", "ب", "ج", "د", "ه", "و"];

type Phase = "setup" | "run" | "result";

// ---------------- Quiz history (graphical) ----------------
function pctOf(r: QuizRun): number {
  return r.total > 0 ? Math.max(0, Math.min(100, Math.round((r.score / r.total) * 100))) : 0;
}

const pctBar = (pct: number) => (pct >= 70 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-rose-500");
const pctHex = (pct: number) => (pct >= 70 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#f43f5e");
const pctChip = (pct: number) =>
  pct >= 70
    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
    : pct >= 50
      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
      : "bg-rose-500/15 text-rose-600 dark:text-rose-400";

const faDate = (ts: number) => new Date(ts).toLocaleDateString("fa-IR");

/** trend of the recent half vs the earlier half, in percent points (null = too few runs) */
function trendDelta(pcts: number[]): number | null {
  if (pcts.length < 2) return null;
  const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const k = Math.min(2, pcts.length);
  return Math.round(mean(pcts.slice(-k)) - mean(pcts.slice(0, k)));
}

/** Catmull-Rom → cubic bezier: a soft curve through the score points */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

/**
 * Advanced interactive score-trend chart (oldest → newest, right = newest).
 * Rendered in measured pixel coordinates (ResizeObserver) instead of a stretched
 * viewBox, so the dots are always perfect circles — the old sparkline stretched
 * its SVG non-uniformly and turned them into ellipses.
 */
function ScoreChart({ runs }: { runs: QuizRun[] }) {
  // callback-ref pattern: the element reports itself, then a ResizeObserver (which
  // fires once on observe) supplies the width — no setState directly in an effect
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [w, setW] = useState(0);
  // selection is stored as the run object itself (not an index): when `runs`
  // changes the selection self-invalidates without any effect or ref
  const [selRun, setSelRun] = useState<QuizRun | null>(null);
  useEffect(() => {
    if (!el) return;
    if (typeof ResizeObserver === "undefined") {
      const id = requestAnimationFrame(() => setW(Math.max(260, el.clientWidth)));
      const on = () => setW(Math.max(260, el.clientWidth));
      window.addEventListener("resize", on);
      return () => {
        cancelAnimationFrame(id);
        window.removeEventListener("resize", on);
      };
    }
    const ro = new ResizeObserver((entries) => setW(Math.max(260, Math.round(entries[0].contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);

  const H = 205;
  const padT = 24;
  const padB = 28;
  const padX = 26;
  const n = runs.length;
  if (n === 0 || w === 0) return <div ref={setEl} style={{ height: H }} />;

  const innerW = w - padX * 2;
  const innerH = H - padT - padB;
  const pts = runs.map((r, i) => {
    const pct = pctOf(r);
    const x = n === 1 ? padX + innerW / 2 : padX + (i / (n - 1)) * innerW;
    const y = padT + (1 - pct / 100) * innerH;
    return { x, y, pct };
  });
  const pcts = pts.map((p) => p.pct);
  const avg = Math.round(pcts.reduce((a, b) => a + b, 0) / n);
  const avgY = padT + (1 - avg / 100) * innerH;
  const bestIdx = pcts.indexOf(Math.max(...pcts));
  const curve = smoothPath(pts);
  const area = `${curve} L${pts[n - 1].x.toFixed(1)} ${(H - padB).toFixed(1)} L${pts[0].x.toFixed(1)} ${(H - padB).toFixed(1)} Z`;
  const selIdx = selRun ? runs.indexOf(selRun) : -1;
  const selP = selIdx >= 0 ? pts[selIdx] : null;
  const selR = selIdx >= 0 ? runs[selIdx] : null;
  const selPct = selIdx >= 0 ? pts[selIdx].pct : 0;
  // tooltip bubble, clamped inside the chart; flips below the dot when near the top
  const tw = 158;
  const th = 66;
  const tipX = selP ? Math.max(4, Math.min(w - tw - 4, selP.x - tw / 2)) : 0;
  const tipY = selP ? (selP.y - th - 14 < 2 ? selP.y + 16 : selP.y - th - 14) : 0;

  return (
    <div ref={setEl} className="relative">
      <svg width={w} height={H} viewBox={`0 0 ${w} ${H}`} className="block" role="img" aria-label="نمودار روند نمرات آزمون">
        <defs>
          <linearGradient id="sc-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.30" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* grid + y labels */}
        {[0, 25, 50, 75, 100].map((v) => {
          const y = padT + (1 - v / 100) * innerH;
          return (
            <g key={v}>
              <line x1={padX - 8} y1={y} x2={w - padX + 8} y2={y} stroke="#888" strokeOpacity={v === 0 ? 0.3 : 0.15} strokeWidth={1} />
              <text x={padX - 12} y={y + 3} textAnchor="end" fontSize={9} fill="#999" style={{ direction: "rtl" }}>
                {faNum(v)}
              </text>
            </g>
          );
        })}

        {/* average reference line */}
        <line x1={padX} y1={avgY} x2={w - padX} y2={avgY} stroke="#8b8b95" strokeOpacity={0.5} strokeWidth={1.2} strokeDasharray="5 5" />
        <text x={w - padX} y={avgY - 5} textAnchor="end" fontSize={9.5} fill="#8b8b95" style={{ direction: "rtl" }}>
          میانگین {faNum(avg)}٪
        </text>

        {/* gradient area + smooth animated curve */}
        <path d={area} fill="url(#sc-fill)" className="chart-dot" style={{ animationDelay: "0.35s" }} />
        <path
          d={curve}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          className="chart-line"
        />

        {/* selection guide */}
        {selP && <line x1={selP.x} y1={padT} x2={selP.x} y2={H - padB} stroke="var(--primary)" strokeOpacity={0.3} strokeWidth={1.2} strokeDasharray="3 3" />}

        {/* dots — perfect circles */}
        {pts.map((p, i) => (
          <g key={i}>
            {i === n - 1 && n > 1 && (
              <>
                <circle cx={p.x} cy={p.y} r={10} fill="none" stroke="var(--primary)" strokeOpacity={0.35} strokeWidth={1.5} className="chart-dot" style={{ animationDelay: "0.7s" }} />
                <circle cx={p.x} cy={p.y} r={15} fill="none" stroke="var(--primary)" strokeOpacity={0.14} strokeWidth={1.5} className="chart-dot" style={{ animationDelay: "0.8s" }} />
              </>
            )}
            <circle
              cx={p.x}
              cy={p.y}
              r={selIdx === i ? 6.5 : i === n - 1 ? 6 : 5}
              fill={pctHex(p.pct)}
              stroke="var(--card)"
              strokeWidth={2}
              className="chart-dot"
              style={{ animationDelay: `${0.15 + i * 0.045}s` }}
            />
            {i === bestIdx && n > 1 && (
              <text x={p.x} y={p.y - 12} textAnchor="middle" fontSize={12} fill="#f59e0b">
                ★
              </text>
            )}
          </g>
        ))}

        {/* x-axis end dates */}
        <text x={padX} y={H - 8} textAnchor="start" fontSize={9} fill="#999" style={{ direction: "rtl" }}>
          {faDate(runs[0].at)}
        </text>
        {n > 1 && (
          <text x={w - padX} y={H - 8} textAnchor="end" fontSize={9} fill="#999" style={{ direction: "rtl" }}>
            {faDate(runs[n - 1].at)}
          </text>
        )}

        {/* tap targets + tooltip */}
        {pts.map((p, i) => (
          <circle
            key={`hit-${i}`}
            cx={p.x}
            cy={p.y}
            r={17}
            fill="transparent"
            className="cursor-pointer"
            onClick={() => setSelRun((v) => (v === runs[i] ? null : runs[i]))}
            onMouseEnter={() => setSelRun(runs[i])}
          />
        ))}
        {selP && selR && (
          <g className="chart-dot">
            <rect x={tipX} y={tipY} width={tw} height={th} rx={10} fill="var(--card)" stroke={pctHex(selPct)} strokeWidth={1.5} />
            <text x={tipX + tw / 2} y={tipY + 20} textAnchor="middle" fontSize={11.5} fontWeight={800} fill={pctHex(selPct)} style={{ direction: "rtl" }}>
              {faNum(selPct)}٪ — {faNum(selR.score)} از {faNum(selR.total)}
            </text>
            <text x={tipX + tw / 2} y={tipY + 37} textAnchor="middle" fontSize={10} fill="#777" style={{ direction: "rtl" }}>
              {selR.label.length > 18 ? `${selR.label.slice(0, 18)}…` : selR.label}
            </text>
            <text x={tipX + tw / 2} y={tipY + 54} textAnchor="middle" fontSize={9} fill="#999" style={{ direction: "rtl" }}>
              {faDate(selR.at)}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

function QuizHistoryCard({ runs }: { runs: QuizRun[] }) {
  const [showAll, setShowAll] = useState(false);
  // the chart reads chronologically (oldest first), limited to the last 14 runs
  const chartRuns = useMemo(() => [...runs].slice(0, 14).reverse(), [runs]);
  const list = useMemo(() => runs.map((r) => ({ ...r, pct: pctOf(r) })), [runs]);
  const stats = useMemo(() => {
    const pcts = list.map((r) => r.pct);
    return {
      avg: pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0,
      best: pcts.length ? Math.max(...pcts) : 0,
    };
  }, [list]);
  const trend = useMemo(() => trendDelta(chartRuns.map((r) => pctOf(r))), [chartRuns]);
  const shown = showAll ? list : list.slice(0, 4);

  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[15px] font-bold">
          <Trophy className="h-4.5 w-4.5 text-amber-500" /> تاریخچه آزمون‌ها
        </h2>
        <span className="rounded-lg bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
          {faNum(runs.length)} آزمون
        </span>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-muted/50 p-2.5 text-center">
          <TrendingUp className="mx-auto h-4 w-4 text-primary" />
          <div className="mt-1 text-base font-black">{faNum(stats.avg)}٪</div>
          <div className="text-[10px] text-muted-foreground">میانگین</div>
        </div>
        <div className="rounded-xl bg-muted/50 p-2.5 text-center">
          <Award className="mx-auto h-4 w-4 text-amber-500" />
          <div className="mt-1 text-base font-black">{faNum(stats.best)}٪</div>
          <div className="text-[10px] text-muted-foreground">بهترین نتیجه</div>
        </div>
        <div className="rounded-xl bg-muted/50 p-2.5 text-center">
          <ClipboardCheck className="mx-auto h-4 w-4 text-teal-600 dark:text-teal-400" />
          <div className="mt-1 text-base font-black">{faNum(runs.length)}</div>
          <div className="text-[10px] text-muted-foreground">آزمون داده‌شده</div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-gradient-to-b from-muted/30 to-transparent p-2.5">
        <div className="mb-1 flex items-center justify-between px-1">
          <p className="text-[11px] font-bold text-muted-foreground">روند نمرات ({faNum(chartRuns.length)} آزمون اخیر)</p>
          {trend !== null && (
            <span
              className={cn(
                "flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-black",
                trend >= 8
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : trend <= -8
                    ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                    : "bg-muted text-muted-foreground"
              )}
            >
              {trend >= 8 ? <ArrowUpRight className="h-3 w-3" /> : trend <= -8 ? <ArrowDownRight className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
              {trend >= 8 ? "روند صعودی" : trend <= -8 ? "روند نزولی" : "روند ثابت"}
            </span>
          )}
        </div>
        <ScoreChart runs={chartRuns} />
        {chartRuns.length === 1 && (
          <p className="pb-1 text-center text-[11px] text-muted-foreground">
            با آزمون بعدی، نمودار پیشرفت کامل می‌شود — روی نقطه‌ها بزنید
          </p>
        )}
        {chartRuns.length === 0 && (
          <p className="py-3 text-center text-[11px] text-muted-foreground">
            با دو آزمون، نمودار پیشرفت شما اینجا نمایش داده می‌شود
          </p>
        )}
        <div className="mt-1 flex items-center justify-center gap-4 pb-1 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> قوی</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> متوسط</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" /> ضعیف</span>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {shown.map((h, i) => (
          <div key={`${h.at}-${i}`} className="rounded-xl bg-muted/50 p-3">
            <div className="flex items-center gap-3">
              <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xs font-black", pctChip(h.pct))}>
                {faNum(h.pct)}٪
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{h.label}</span>
                <span className="block text-[11px] text-muted-foreground" dir="ltr">
                  {new Date(h.at).toLocaleDateString("fa-IR")}
                </span>
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">{faNum(h.score)}/{faNum(h.total)}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background/70">
              <div className={cn("h-full rounded-full", pctBar(h.pct))} style={{ width: `${h.pct}%` }} />
            </div>
          </div>
        ))}
      </div>

      {list.length > 4 && (
        <button
          onClick={() => {
            void tapHaptic();
            setShowAll((v) => !v);
          }}
          className="mt-3 flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-xl border border-border/70 text-xs font-bold text-primary transition-colors hover:bg-primary/5"
        >
          {showAll ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {showAll ? "نمایش کمتر" : `نمایش همه ${faNum(list.length)} آزمون`}
        </button>
      )}
    </section>
  );
}

export function QuizView({ data, navigate }: { data: AppData; navigate: (r: Route) => void }) {
  const { quizHistory, addQuizRun, mistakes, addMistake, read, clearMistakes } = useAppStore();
  const [phase, setPhase] = useState<Phase>("setup");
  const [session, setSession] = useState<QuizSession | null>(null);
  const [pos, setPos] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [wrongList, setWrongList] = useState<Question[]>([]);
  const [count, setCount] = useState(10);
  const [onlyRead, setOnlyRead] = useState(false);

  const counts = useMemo(() => quizCountsFor(data), [data]);
  const groups = useMemo(() => {
    const g = new Map<string, number>();
    for (const q of data.questions) g.set(q.cat, (g.get(q.cat) ?? 0) + 1);
    return [...g.entries()].sort((a, b) => b[1] - a[1]);
  }, [data.questions]);
  // count only mistakes that still exist in the (possibly updated) question bank
  const mistakesCount = useMemo(() => {
    const ids = new Set(data.questions.map((q) => q.id));
    return Object.keys(mistakes ?? {}).filter((id) => ids.has(id)).length;
  }, [mistakes, data.questions]);

  const startQuiz = (mode: QuizMode) => {
    void tapHaptic();
    let s: QuizSession;
    try {
      s = buildQuiz(data, mode, count, onlyRead);
    } catch {
      toast.error("در ساخت آزمون خطایی رخ داد؛ دوباره تلاش کنید");
      return;
    }
    if (!s.questions.length) {
      if (mode.kind === "mistakes") {
        toast.info("سوالی برای مرور خطاها یافت نشد");
      } else if (onlyRead) {
        toast.info("از مباحث خوانده‌شده سوالی یافت نشد");
      } else {
        toast.info("سوالی برای این آزمون یافت نشد");
      }
      return;
    }
    setSession(s);
    setPhase("run");
    setPos(0);
    setPicked(null);
    setScore(0);
    setWrongList([]);
  };

  const pick = (idx: number, q: Question) => {
    if (picked !== null) return;
    void tapHaptic();
    setPicked(idx);
    const ok = idx === (Number.isInteger(q.answer) && Array.isArray(q.options) && q.answer >= 0 && q.answer < q.options.length ? q.answer : 0);
    if (ok) setScore((s) => s + 1);
    else {
      addMistake(q.id);
      setWrongList((w) => [...w, q]);
    }
  };

  const next = () => {
    if (!session) return;
    if (pos + 1 >= session.questions.length) {
      const finalScore = score;
      addQuizRun({ at: Date.now(), score: finalScore, total: session.questions.length, label: session.label });
      setPhase("result");
      if (!wrongList.length) clearMistakes();
      return;
    }
    setPos(pos + 1);
    setPicked(null);
  };

  // ---------------- RUN ----------------
  if (phase === "run" && session) {
    const q: Question | undefined = session.questions[pos];
    // Defensive: if the question is missing or malformed, skip it instead of crashing.
    if (!q || !q.q || !Array.isArray(q.options) || q.options.length === 0) {
      if (pos + 1 >= session.questions.length) {
        setPhase("result");
      } else {
        setPos(pos + 1);
        setPicked(null);
      }
      return null;
    }
    const safeAnswer = Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length ? q.answer : 0;
    const answered = picked !== null;
    const correct = picked === safeAnswer;
    return (
      <div className="space-y-4">
        <div>
          <div className="mb-2 flex items-center justify-between text-xs font-semibold">
            <span className="text-muted-foreground">
              {session.label} — سوال {faNum(pos + 1)} از {faNum(session.questions.length)}
            </span>
            <span className="text-emerald-600 dark:text-emerald-400">
              امتیاز: {faNum(score)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${((pos + 1) / session.questions.length) * 100}%` }}
            />
          </div>
        </div>

        <div key={q.id} className="pop-in rounded-3xl border-2 border-primary/30 bg-card p-5 shadow-md">
          <p className="text-[1.05rem] font-bold leading-9">{q.q}</p>
        </div>

        <div className="space-y-2.5">
          {q.options.map((opt, i) => {
            const isCorrect = i === safeAnswer;
            const isPicked = i === picked;
            return (
              <button
                key={i}
                onClick={() => pick(i, q)}
                disabled={answered}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border-2 p-3.5 text-right text-[15px] font-semibold leading-7 transition-all",
                  !answered && "border-border bg-card hover:border-primary/50 hover:bg-primary/5 active:scale-[0.99]",
                  answered && isCorrect && "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                  answered && isPicked && !isCorrect && "border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-300",
                  answered && !isCorrect && !isPicked && "border-border/50 bg-muted/40 text-muted-foreground"
                )}
              >
                <span
                  className={cn(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-xl text-xs font-black",
                    !answered && "bg-muted text-muted-foreground",
                    answered && isCorrect && "bg-emerald-500 text-white",
                    answered && isPicked && !isCorrect && "bg-rose-500 text-white",
                    answered && !isCorrect && !isPicked && "bg-muted text-muted-foreground"
                  )}
                >
                  {answered && isCorrect ? <Check className="h-4 w-4" /> : answered && isPicked ? <X className="h-4 w-4" /> : OPTION_LETTERS[i] ?? faNum(i + 1)}
                </span>
                <span dir="auto">{opt}</span>
              </button>
            );
          })}
        </div>

        {answered && (
          <div className={cn(
            "slide-up rounded-2xl border p-4",
            correct ? "border-emerald-500/30 bg-emerald-500/8" : "border-rose-500/30 bg-rose-500/8"
          )}>
            <p className={cn("mb-1 flex items-center gap-1.5 text-sm font-black", correct ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
              {correct ? <BadgeCheck className="h-4 w-4" /> : <X className="h-4 w-4" />}
              {correct ? "درست بود!" : "پاسخ صحیح مشخص شد"}
            </p>
            <p className="text-sm leading-7 text-foreground/85">{q.explanation}</p>
            {q.tid && data.tests.some((t) => t.id === q.tid) && (
              <button
                onClick={() => navigate({ v: "test", id: q.tid })}
                className="mt-2.5 flex items-center gap-1.5 rounded-xl bg-primary/10 px-3.5 py-2 text-xs font-bold text-primary transition-transform active:scale-95"
              >
                <BookOpenCheck className="h-3.5 w-3.5" />
                مطالعه مطلب «{data.tests.find((t) => t.id === q.tid)?.name}»
              </button>
            )}
            <button
              onClick={next}
              className="mt-3 flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl bg-primary font-bold text-white transition-transform active:scale-[0.98]"
            >
              {pos + 1 >= session.questions.length ? "دیدن نتیجه" : "سوال بعدی"}
              <ChevronLeft className="h-4.5 w-4.5" />
            </button>
          </div>
        )}
      </div>
    );
  }

  // ---------------- RESULT ----------------
  if (phase === "result" && session) {
    const total = Math.max(session.questions.length, 1);
    const pct = Math.max(0, Math.min(100, Math.round((score / total) * 100)));
    const msg = pct >= 90 ? { t: "عالی بود!", d: "تسلط شما بر این مبحث چشمگیر است.", i: Trophy, c: "text-amber-500" }
      : pct >= 70 ? { t: "خیلی خوب", d: "با کمی مرور بیشتر، کاملاً مسلط می‌شوید.", i: BadgeCheck, c: "text-emerald-500" }
      : pct >= 50 ? { t: "قابل قبول", d: "سری به جعبه لایتنر بزنید و دوباره امتحان کنید.", i: Flame, c: "text-orange-500" }
      : { t: "نیاز به تمرین", d: "اول مطلب را بخوانید، بعد دوباره آزمون بدهید.", i: GraduationCap, c: "text-rose-500" };
    const Icon = msg.i;
    return (
      <div className="space-y-5">
        <div className="rounded-3xl border bg-card p-6 text-center shadow-md">
          <Icon className={cn("mx-auto h-10 w-10", msg.c)} />
          <p className="mt-2 text-lg font-black">{msg.t}</p>
          <p className="mt-1 text-xs text-muted-foreground">{msg.d}</p>
          <div className="mx-auto mt-5 grid h-32 w-32 place-items-center rounded-full"
            style={{ background: `conic-gradient(var(--primary) ${pct}%, var(--muted) 0)` }}>
            <div className="grid h-[104px] w-[104px] place-items-center rounded-full bg-card">
              <div>
                <div className="text-2xl font-black">{faNum(pct)}٪</div>
                <div className="text-[11px] text-muted-foreground">{faNum(score)} از {faNum(total)}</div>
              </div>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              onClick={() => setPhase("setup")}
              className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border-2 border-primary/40 bg-primary/10 font-bold text-primary"
            >
              <RotateCcw className="h-4.5 w-4.5" /> آزمون جدید
            </button>
            <button
              onClick={() => navigate({ v: "leitner" })}
              className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-primary font-bold text-white"
            >
              <BookOpenCheck className="h-4.5 w-4.5" /> مرور لایتنر
            </button>
          </div>
        </div>

        {wrongList.length > 0 && (
          <section className="rounded-2xl border bg-card p-4 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-[15px] font-bold text-rose-600 dark:text-rose-400">
              <X className="h-4.5 w-4.5" /> مرور پاسخ‌های نادرست
            </h2>
            <div className="space-y-3">
              {wrongList.map((q) => (
                <div key={q.id} className="rounded-2xl border border-rose-500/25 bg-rose-500/5 p-3.5">
                  <p className="text-sm font-bold leading-7">{q.q}</p>
                  <p className="mt-1.5 text-sm leading-7 text-emerald-700 dark:text-emerald-400">
                    پاسخ صحیح: <b dir="auto">{q.options[q.answer]}</b>
                  </p>
                  <p className="mt-1 text-xs leading-6 text-muted-foreground">{q.explanation}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }

  // ---------------- SETUP ----------------
  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-bl from-teal-700 via-teal-600 to-teal-500 p-5 text-white shadow-lg">
        <div className="absolute -left-10 -top-10 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-100/90">
            <ClipboardCheck className="h-4 w-4" />
            آزمون مباحث خوانده‌شده
          </div>
          <div className="mt-2 flex items-end justify-between">
            <div>
              <div className="text-3xl font-black">{faNum(data.questions.length)}</div>
              <div className="text-sm text-teal-50/85">سوال از کل مباحث</div>
            </div>
            <div className="text-left text-xs text-teal-50/85">
              <p>مطالب خوانده‌شده: <b>{faNum(read.length)}</b></p>
            </div>
          </div>
        </div>
      </div>

      {/* count */}
      <section className="rounded-2xl border bg-card p-4 shadow-sm">
        <p className="mb-2.5 text-sm font-bold">تعداد سوالات</p>
        <div className="grid grid-cols-4 gap-2">
          {[5, 10, 20, 40].map((c) => (
            <button
              key={c}
              onClick={() => {
                void tapHaptic();
                setCount(c);
              }}
              className={cn(
                "rounded-xl border py-2.5 text-sm font-bold transition-colors",
                count === c ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
              )}
            >
              {faNum(c)}
            </button>
          ))}
        </div>
        <label className="mt-3.5 flex cursor-pointer items-center justify-between rounded-xl bg-muted/50 p-3">
          <span className="text-sm font-semibold">فقط از مباحث خوانده‌شده</span>
          <Switch checked={onlyRead} onCheckedChange={setOnlyRead} />
        </label>
        {onlyRead && read.length < 3 && (
          <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-400">
            ابتدا چند مطلب را مطالعه کنید؛ اگر مطلب خوانده‌شده کافی نباشد، آزمون از همه مباحث ساخته می‌شود.
          </p>
        )}
      </section>

      {/* quick modes */}
      <section className="grid grid-cols-2 gap-3">
        <button
          onClick={() => startQuiz({ kind: "all" })}
          className="flex items-center gap-3 rounded-2xl border bg-card p-3.5 text-right shadow-sm transition-transform active:scale-[0.98]"
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-500/12 text-teal-600 dark:text-teal-300">
            <Play className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-bold">آزمون جامع</span>
            <span className="block text-[11px] text-muted-foreground">از همه دسته‌ها</span>
          </span>
        </button>
        <button
          onClick={() => mistakesCount > 0 && startQuiz({ kind: "mistakes" })}
          disabled={mistakesCount === 0}
          className="flex items-center gap-3 rounded-2xl border bg-card p-3.5 text-right shadow-sm transition-transform active:scale-[0.98] disabled:opacity-40"
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-500/12 text-rose-600 dark:text-rose-300">
            <History className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-bold">مرور خطاها</span>
            <span className="block text-[11px] text-muted-foreground">
              {mistakesCount > 0 ? `${faNum(mistakesCount)} سوال` : "خطایی ثبت نشده"}
            </span>
          </span>
        </button>
      </section>

      {/* history — graphical, expandable, near the top so it is easy to reach */}
      {quizHistory.length > 0 && <QuizHistoryCard runs={quizHistory} />}

      {/* by category */}
      <section className="rounded-2xl border bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-[15px] font-bold">آزمون از یک دسته‌بندی</h2>
        <div className="max-h-72 space-y-2 overflow-y-auto thin-scroll pl-1">
          {groups.map(([cat, n]) => (
            <button
              key={cat}
              onClick={() => startQuiz({ kind: "cat", cat })}
              className="flex w-full items-center gap-3 rounded-xl border border-border/70 p-3 text-right transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <ClipboardCheck className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{cat}</span>
              <span className="shrink-0 rounded-lg bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                {faNum(n)} سوال
              </span>
              <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground/50" />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
