"use client";

import { useMemo, useState } from "react";
import { ClipboardCheck, Play, Check, X, ChevronLeft, Trophy, BookOpenCheck, RotateCcw, History, BadgeCheck, Flame, GraduationCap } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { AppData, Question } from "@/lib/types";
import type { Route } from "@/lib/nav";
import { useAppStore } from "@/lib/store";
import { buildQuiz, quizCountsFor, type QuizMode, type QuizSession } from "@/lib/quiz";
import { faNum, cn } from "@/lib/utils";
import { toast } from "sonner";

const OPTION_LETTERS = ["الف", "ب", "ج", "د", "ه", "و"];

type Phase = "setup" | "run" | "result";

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
              onClick={() => setCount(c)}
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

      {/* history */}
      {quizHistory.length > 0 && (
        <section className="rounded-2xl border bg-card p-4 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 text-[15px] font-bold">
            <Trophy className="h-4.5 w-4.5 text-amber-500" /> آزمون‌های اخیر
          </h2>
          <div className="space-y-2">
            {quizHistory.slice(0, 6).map((h, i) => {
              const pct = h.total > 0 ? Math.max(0, Math.min(100, Math.round((h.score / h.total) * 100))) : 0;
              return (
                <div key={i} className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
                  <span className={cn(
                    "grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xs font-black",
                    pct >= 70 ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : pct >= 50 ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                      : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                  )}>
                    {faNum(pct)}٪
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{h.label}</span>
                    <span className="block text-[11px] text-muted-foreground" dir="ltr">
                      {new Date(h.at).toLocaleDateString("fa-IR")}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{faNum(h.score)}/{faNum(h.total)}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
