"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Layers,
  ClipboardCheck,
  Check,
  X,
  ChevronLeft,
  Clock3,
  BookOpenCheck,
  Target,
  PartyPopper,
  Home,
  RotateCcw,
  BadgeCheck,
  History,
} from "lucide-react";
import { toast } from "sonner";
import type { AppData, FlashCard, Question } from "@/lib/types";
import type { Route } from "@/lib/nav";
import { useAppStore } from "@/lib/store";
import { categoryPerformance, pickAdaptiveQuestions } from "@/lib/adaptive";
import { randomizeOptions } from "@/lib/quiz";
import { faNum, cn } from "@/lib/utils";
import { tapHaptic } from "@/lib/haptics";

const QUESTION_SECONDS = 60;
const OPTION_LETTERS = ["الف", "ب", "ج", "د", "ه", "و"];

const safeAnswer = (q: Question) =>
  Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length ? q.answer : 0;

const validQuestions = (data: AppData) =>
  (data.questions ?? []).filter((q) => q && typeof q.q === "string" && q.q.trim() && Array.isArray(q.options) && q.options.length >= 2);

type Phase = "run" | "done";

interface SessionBoot {
  kind: "cards" | "quiz" | "mistakes";
  tid?: string;
  label: string;
  planId: string;
  cards: FlashCard[];
  questions: Question[];
}

/**
 * «جلسه مطالعه» — the executor of a today-plan item (v1.4).
 * The home page plans; this view runs the session: exactly the scoped cards of
 * one test, or a per-question timed quiz (60s → auto next) of the same scope,
 * ending with a full per-question کارنامه.
 */
export function SessionView({ data, navigate, route }: { data: AppData; navigate: (r: Route) => void; route: Route }) {
  const { leitner, answerCard, answerQuestion, addMistake, removeMistake, qstats, mistakes, addQuizRun, togglePlanItem } = useAppStore();

  const [boot] = useState(() => {
    if (route.v !== "session") return null;
    const now = Date.now();
    const seed = now % 100000000;
    const test = route.id ? data.tests.find((t) => t.id === route.id) : undefined;
    const name = test?.name ?? route.id ?? "";
    if (route.kind === "cards") {
      const cards = data.cards.filter((c) => c.tid === route.id);
      const due = cards
        .filter((c) => leitner[c.id] && leitner[c.id].due <= now)
        .sort((a, b) => leitner[a.id].due - leitner[b.id].due);
      const fresh = cards.filter((c) => !leitner[c.id]);
      const list = [...due, ...fresh].slice(0, route.count ?? 10);
      if (!list.length) return null;
      return {
        kind: "cards" as const,
        tid: route.id,
        label: `${faNum(list.length)} کارت ${name}`,
        planId: `cards:${route.id}`,
        cards: list,
        questions: [],
      };
    }
    const valid = validQuestions(data);
    const pool = route.kind === "mistakes" ? valid.filter((q) => (mistakes[q.id] ?? 0) > 0) : valid.filter((q) => q.tid === route.id);
    if (!pool.length) return null;
    const count = route.kind === "mistakes" ? Math.min(20, pool.length) : Math.min(route.count ?? 10, pool.length);
    const perf = categoryPerformance(data, leitner, qstats);
    const picked = pickAdaptiveQuestions({ pool, count, qstats, mistakes, perf, seed });
    if (!picked.length) return null;
    return {
      kind: route.kind as "quiz" | "mistakes",
      tid: route.id,
      label: route.kind === "mistakes" ? "مرور اشتباهات (زمان‌دار)" : `${faNum(picked.length)} سؤال ${name}`,
      planId: route.kind === "mistakes" ? "mistakes" : `quiz:${route.id}`,
      cards: [],
      questions: randomizeOptions(picked, seed),
    };
  });

  const isTimedQuiz = !!boot && (boot.kind === "quiz" || boot.kind === "mistakes");
  const [phase, setPhase] = useState<Phase>(boot ? "run" : "done");
  // cards phase state
  const [cIdx, setCIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [cGood, setCGood] = useState(0);
  const [cBad, setCBad] = useState(0);
  // quiz phase state
  const deadlineRef = useRef(isTimedQuiz ? Date.now() + QUESTION_SECONDS * 1000 : 0);
  const [left, setLeft] = useState(QUESTION_SECONDS);
  const [pos, setPos] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [results, setResults] = useState<{ q: Question; ok: boolean; skipped?: boolean }[]>([]);

  const finish = useCallback(() => {
    if (!boot) return;
    if (boot.kind === "cards") {
      togglePlanItem(boot.planId);
      toast.success("آیتم برنامه امروز انجام شد ✓");
    } else {
      addQuizRun({ at: Date.now(), score, total: boot.questions.length, label: boot.label });
      togglePlanItem(boot.planId);
      toast.success("آیتم برنامه امروز انجام شد ✓");
    }
    setPhase("done");
  }, [boot, score, togglePlanItem, addQuizRun]);

  const advance = useCallback(
    (fromPos: number) => {
      if (!boot) return;
      if (fromPos + 1 >= boot.questions.length) {
        finish();
        return;
      }
      deadlineRef.current = Date.now() + QUESTION_SECONDS * 1000;
      setLeft(QUESTION_SECONDS);
      setPos(fromPos + 1);
      setPicked(null);
    },
    [boot, finish]
  );

  // countdown — ticks only while an unanswered timed question is on screen;
  // when the time is up the question is recorded as skipped and the next one shows
  useEffect(() => {
    if (!boot || !isTimedQuiz || phase !== "run" || picked !== null) return;
    const iv = setInterval(() => {
      const l = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
      setLeft(l);
      if (l <= 0) {
        clearInterval(iv);
        const q = boot.questions[pos];
        if (q) {
          answerQuestion(q.id, false);
          addMistake(q.id);
          setResults((r) => [...r, { q, ok: false, skipped: true }]);
          toast.warning("زمان این سؤال تمام شد");
        }
        advance(pos);
      }
    }, 300);
    return () => clearInterval(iv);
  }, [boot, isTimedQuiz, phase, picked, pos, advance, answerQuestion, addMistake]);

  const pick = (idx: number, q: Question) => {
    if (picked !== null) return;
    void tapHaptic();
    setPicked(idx);
    const ok = idx === safeAnswer(q);
    answerQuestion(q.id, ok);
    if (ok) {
      setScore((s) => s + 1);
      removeMistake(q.id);
    } else {
      addMistake(q.id);
    }
    setResults((r) => [...r, { q, ok }]);
  };

  const answerCardBy = (c: FlashCard, good: boolean) => {
    if (!boot) return;
    void tapHaptic();
    answerCard(c.id, good);
    if (good) setCGood((v) => v + 1);
    else setCBad((v) => v + 1);
    if (cIdx + 1 >= boot.cards.length) {
      finish();
    } else {
      setCIdx(cIdx + 1);
      setFlipped(false);
    }
  };

  // quiz run metrics for the کارنامه
  const byCat = useMemo(() => {
    const m = new Map<string, { n: number; ok: number }>();
    for (const r of results) {
      const g = m.get(r.q.cat) ?? { n: 0, ok: 0 };
      g.n += 1;
      if (r.ok) g.ok += 1;
      m.set(r.q.cat, g);
    }
    return [...m.entries()]
      .map(([cat, g]) => ({ cat, n: g.n, pct: Math.round((g.ok / g.n) * 100) }))
      .sort((a, b) => b.pct - a.pct);
  }, [results]);

  // ---------- nothing to run (empty scope / stale link) ----------
  if (!boot) {
    return (
      <div className="space-y-5">
        <section className="rounded-3xl border bg-card p-6 text-center shadow-sm">
          <PartyPopper className="mx-auto h-9 w-9 text-emerald-500" />
          <p className="mt-3 text-base font-black">در این بخش فعلاً چیزی برای مرور نیست ✓</p>
          <p className="mt-1 text-xs text-muted-foreground">
            یا همه‌ی این محدوده مرور شده، یا پیوند جلسه منقضی شده است.
          </p>
          <button
            onClick={() => navigate({ v: "home" })}
            className="mt-4 flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl bg-primary font-bold text-white"
          >
            <Home className="h-4.5 w-4.5" /> بازگشت به خانه
          </button>
        </section>
      </div>
    );
  }

  const testRecord = boot.tid ? data.tests.find((t) => t.id === boot.tid) : undefined;

  // ---------- cards session ----------
  if (boot.kind === "cards" && phase === "run") {
    const card = boot.cards[cIdx];
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-muted-foreground">
            {boot.label} — کارت {faNum(cIdx + 1)} از {faNum(boot.cards.length)}
          </span>
          <span className="text-emerald-600 dark:text-emerald-400">
            درست: {faNum(cGood)} · نادرست: {faNum(cBad)}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${((cIdx + (flipped ? 0.5 : 0)) / boot.cards.length) * 100}%` }} />
        </div>

        <button
          key={card.id}
          onClick={() => !flipped && setFlipped(true)}
          className="pop-in flex min-h-[240px] w-full flex-col items-center justify-center gap-4 rounded-3xl border-2 border-primary/30 bg-card p-6 text-center shadow-md"
        >
          <p className="text-[1.1rem] font-bold leading-9">{card.front}</p>
          {!flipped && (
            <span className="flex items-center gap-1.5 rounded-xl bg-primary/10 px-3.5 py-2 text-xs font-bold text-primary">
              <BookOpenCheck className="h-3.5 w-3.5" /> برای دیدن پاسخ لمس کنید
            </span>
          )}
          {flipped && <p className="text-[15px] leading-8 text-foreground/90 text-justify">{card.back}</p>}
        </button>

        {flipped ? (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => answerCardBy(card, false)}
              className="flex min-h-[50px] items-center justify-center gap-2 rounded-2xl border-2 border-rose-500/50 bg-rose-500/10 font-bold text-rose-600 dark:text-rose-300"
            >
              <X className="h-4.5 w-4.5" /> بلد نبودم
            </button>
            <button
              onClick={() => answerCardBy(card, true)}
              className="flex min-h-[50px] items-center justify-center gap-2 rounded-2xl border-2 border-emerald-500/50 bg-emerald-500/10 font-bold text-emerald-600 dark:text-emerald-300"
            >
              <Check className="h-4.5 w-4.5" /> بلد بودم
            </button>
          </div>
        ) : (
          <p className="text-center text-[11px] text-muted-foreground">اول خودتان پاسخ را در ذهن مرور کنید، بعد کارت را برگردانید</p>
        )}
      </div>
    );
  }

  // ---------- quiz session (timed) ----------
  if (boot.kind !== "cards" && phase === "run") {
    const q = boot.questions[pos];
    if (!q || !Array.isArray(q.options) || q.options.length === 0) {
      advance(pos);
      return null;
    }
    const safe = safeAnswer(q);
    const answered = picked !== null;
    const correct = picked === safe;
    const timePct = (left / QUESTION_SECONDS) * 100;
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-muted-foreground">
            {boot.label} — سؤال {faNum(pos + 1)} از {faNum(boot.questions.length)}
          </span>
          <span className="text-emerald-600 dark:text-emerald-400">امتیاز: {faNum(score)}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${((pos + 1) / boot.questions.length) * 100}%` }} />
        </div>

        {/* countdown */}
        <div className={cn("flex items-center gap-2 rounded-2xl border p-3", left <= 10 ? "border-rose-500/40 bg-rose-500/8" : "border-border bg-card")}>
          <Clock3 className={cn("h-4.5 w-4.5 shrink-0", left <= 10 ? "text-rose-500" : "text-primary")} />
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center justify-between text-[11px] font-bold">
              <span className={left <= 10 ? "text-rose-500" : "text-muted-foreground"}>
                {answered ? "زمان متوقف شد" : left <= 10 ? "کمتر از ۱۰ ثانیه!" : "زمان این سؤال"}
              </span>
              <span className={left <= 10 ? "text-rose-500" : "text-foreground"}>{faNum(left)} ثانیه</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full transition-all duration-300", left <= 10 ? "bg-rose-500" : left <= 25 ? "bg-amber-500" : "bg-primary")}
                style={{ width: `${answered ? 100 : timePct}%` }}
              />
            </div>
          </div>
        </div>

        <div key={q.id} className="pop-in rounded-3xl border-2 border-primary/30 bg-card p-5 shadow-md">
          <p className="text-[1.05rem] font-bold leading-9">{q.q}</p>
        </div>

        <div className="space-y-2.5">
          {q.options.map((opt, i) => {
            const isCorrect = i === safe;
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
          <div className={cn("slide-up rounded-2xl border p-4", correct ? "border-emerald-500/30 bg-emerald-500/8" : "border-rose-500/30 bg-rose-500/8")}>
            <p className={cn("mb-1 flex items-center gap-1.5 text-sm font-black", correct ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
              {correct ? <BadgeCheck className="h-4 w-4" /> : <X className="h-4 w-4" />}
              {correct ? "درست بود!" : "پاسخ صحیح مشخص شد"}
            </p>
            <p className="text-sm leading-7 text-foreground/85">{q.explanation}</p>
            {q.tid && testRecord && (
              <button
                onClick={() => navigate({ v: "test", id: q.tid })}
                className="mt-2.5 flex items-center gap-1.5 rounded-xl bg-primary/10 px-3.5 py-2 text-xs font-bold text-primary transition-transform active:scale-95"
              >
                <BookOpenCheck className="h-3.5 w-3.5" />
                مطالعه مطلب «{testRecord.name}»
              </button>
            )}
            <button
              onClick={() => advance(pos)}
              className="mt-3 flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl bg-primary font-bold text-white transition-transform active:scale-[0.98]"
            >
              {pos + 1 >= boot.questions.length ? "دیدن کارنامه" : "سؤال بعدی"}
              <ChevronLeft className="h-4.5 w-4.5" />
            </button>
          </div>
        )}
      </div>
    );
  }

  // ---------- کارنامه / session summary ----------
  const isQuizDone = boot.kind !== "cards";
  const total = isQuizDone ? Math.max(boot.questions.length, 1) : boot.cards.length;
  const goodCount = isQuizDone ? score : cGood;
  const badCount = isQuizDone ? results.filter((r) => !r.ok).length : cBad;
  const pct = Math.max(0, Math.min(100, Math.round((goodCount / total) * 100)));
  const msg = pct >= 90 ? { t: "عالی بود!", d: "تسلط شما بر این مبحث چشمگیر است.", c: "text-amber-500" }
    : pct >= 70 ? { t: "خیلی خوب", d: "با کمی مرور بیشتر، کاملاً مسلط می‌شوید.", c: "text-emerald-500" }
    : pct >= 50 ? { t: "قابل قبول", d: "ادامه بدهید — مرور فاصله‌دار کار خودش را می‌کند.", c: "text-orange-500" }
    : { t: "نیاز به تمرین", d: "اول مطلب را بخوانید، بعد دوباره جلسه را بگیرید.", c: "text-rose-500" };
  const skippedCount = results.filter((r) => r.skipped).length;

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border bg-card p-6 text-center shadow-md">
        <PartyPopper className={cn("mx-auto h-9 w-9", msg.c)} />
        <p className="mt-2 text-lg font-black">{isQuizDone ? "کارنامه جلسه" : "جلسه مرور تمام شد"}</p>
        <p className="mt-1 text-xs text-muted-foreground">{boot.label}</p>
        <div className="mx-auto mt-5 grid h-32 w-32 place-items-center rounded-full" style={{ background: `conic-gradient(var(--primary) ${pct}%, var(--muted) 0)` }}>
          <div className="grid h-[104px] w-[104px] place-items-center rounded-full bg-card">
            <div>
              <div className="text-2xl font-black">{faNum(pct)}٪</div>
              <div className="text-[11px] text-muted-foreground">{faNum(goodCount)} از {faNum(total)}</div>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-4 flex max-w-xs items-center justify-center gap-2 text-xs font-bold">
          <span className="rounded-lg bg-emerald-500/12 px-2.5 py-1 text-emerald-600 dark:text-emerald-300">درست: {faNum(goodCount)}</span>
          <span className="rounded-lg bg-rose-500/12 px-2.5 py-1 text-rose-600 dark:text-rose-300">نادرست: {faNum(badCount)}</span>
          {skippedCount > 0 && <span className="rounded-lg bg-amber-500/12 px-2.5 py-1 text-amber-700 dark:text-amber-300">بی‌پاسخ: {faNum(skippedCount)}</span>}
        </div>
        <p className="mt-3 text-xs font-semibold text-muted-foreground">{msg.t} — {msg.d}</p>
      </div>

      {/* per-question report */}
      {isQuizDone && (
        <section className="rounded-2xl border bg-card p-4 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 text-[15px] font-bold">
            <ClipboardCheck className="h-4.5 w-4.5 text-primary" /> پاسخ‌نامه سؤال‌به‌سؤال
          </h2>
          <div className="space-y-3">
            {results.map((r, i) => (
              <div
                key={`${r.q.id}-${i}`}
                className={cn(
                  "rounded-2xl border p-3.5",
                  r.skipped ? "border-amber-500/30 bg-amber-500/5" : r.ok ? "border-emerald-500/25 bg-emerald-500/5" : "border-rose-500/25 bg-rose-500/5"
                )}
              >
                <div className="mb-1.5 flex items-center gap-2">
                  <span
                    className={cn(
                      "grid h-6 w-6 shrink-0 place-items-center rounded-lg text-[11px] font-black",
                      r.skipped ? "bg-amber-500 text-white" : r.ok ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                    )}
                  >
                    {r.skipped ? <Clock3 className="h-3.5 w-3.5" /> : r.ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                  </span>
                  <span className="text-xs font-bold text-muted-foreground">سؤال {faNum(i + 1)}</span>
                  <span className={cn("mr-auto text-[10px] font-black", r.skipped ? "text-amber-600 dark:text-amber-400" : r.ok ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                    {r.skipped ? "بی‌پاسخ (تمام شدن زمان)" : r.ok ? "درست" : "نادرست"}
                  </span>
                </div>
                <p className="text-sm font-bold leading-7">{r.q.q}</p>
                <p className="mt-1.5 text-sm leading-7 text-emerald-700 dark:text-emerald-400">
                  پاسخ صحیح: <b dir="auto">{r.q.options[safeAnswer(r.q)]}</b>
                </p>
                <p className="mt-1 text-xs leading-6 text-muted-foreground">{r.q.explanation}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* strengths & weaknesses */}
      {isQuizDone && byCat.length > 0 && (
        <section className="rounded-2xl border bg-card p-4 shadow-sm">
          <h2 className="mb-2 flex items-center gap-2 text-[15px] font-bold">
            <Target className="h-4.5 w-4.5 text-primary" /> نقاط قوت و ضعف
          </h2>
          <div className="space-y-2">
            {byCat.map((c) => (
              <div key={c.cat} className="flex items-center gap-2.5">
                <span className="w-28 shrink-0 truncate text-xs font-bold">{c.cat}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", c.pct >= 70 ? "bg-emerald-500" : c.pct >= 50 ? "bg-amber-500" : "bg-rose-500")}
                    style={{ width: `${c.pct}%` }}
                  />
                </div>
                <span className="w-10 shrink-0 text-left text-xs font-black">{faNum(c.pct)}٪</span>
              </div>
            ))}
          </div>
          <p className="mt-3 rounded-xl bg-muted/50 p-2.5 text-[11px] leading-6 text-muted-foreground">
            {badCount > 0
              ? "سؤال‌های نادرست با مرور فاصله‌دار علامت خوردند و در آزمون‌های بعدی زودتر دوباره پرسیده می‌شوند."
              : "سؤال‌های درست در مرورهای بعدی با فاصله بیشتری تکرار می‌شوند تا در ذهن بمانند."}
          </p>
        </section>
      )}

      {/* follow-up actions */}
      <section className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate({ v: "home" })}
          className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border-2 border-primary/40 bg-primary/10 font-bold text-primary"
        >
          <Home className="h-4.5 w-4.5" /> بازگشت به خانه
        </button>
        {boot.kind === "cards" && testRecord && validQuestions(data).some((q) => q.tid === boot.tid) ? (
          <button
            onClick={() => navigate({ v: "session", kind: "quiz", id: boot.tid, count: 10 })}
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-primary font-bold text-white"
          >
            <Clock3 className="h-4.5 w-4.5" /> آزمون زمان‌دار همین مبحث
          </button>
        ) : (
          <button
            onClick={() => navigate({ v: "quiz" })}
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-primary font-bold text-white"
          >
            <RotateCcw className="h-4.5 w-4.5" /> آزمون هوشمند جامع
          </button>
        )}
      </section>

      {boot.kind === "mistakes" && (
        <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <History className="h-3.5 w-3.5" /> پاسخ‌های درست از فهرست اشتباهات حذف شدند
        </p>
      )}
      {!isQuizDone && cBad > 0 && (
        <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <Layers className="h-3.5 w-3.5" /> کارت‌های «بلد نبودم» ده دقیقه دیگر دوباره آماده مرور می‌شوند
        </p>
      )}
    </div>
  );
}
