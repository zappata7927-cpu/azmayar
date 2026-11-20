"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FlaskConical,
  Layers,
  ClipboardCheck,
  BookOpen,
  Star,
  ChevronLeft,
  Sparkles,
  Lightbulb,
  CalendarDays,
  Target,
  Check,
  Clock3,
  Lock,
  RotateCcw,
  Pencil,
  ChevronLeft as GoLeft,
  Shuffle,
  ChevronLeft as ArrowLeftIcon,
  Droplets,
  HeartPulse,
  Bug,
  Worm,
  Microscope,
  Cog,
  BadgeCheck,
  Activity,
  type LucideIcon,
} from "lucide-react";
import type { AppData } from "@/lib/types";
import { assetUrl } from "@/lib/types";
import type { Route } from "@/lib/nav";
import { useAppStore, planDayKey } from "@/lib/store";
import { useActivityMedal, type Activity as ActivityInfo } from "@/lib/achievements";
import { buildTodayPlan, type PlanItem, type TodayPlan } from "@/lib/study-plan";
import { buildTipPool, pickRotatingTip, type Tip } from "@/lib/tips";
import { GoalDialog } from "@/components/goal-dialog";
import { formatJalaliLong } from "@/lib/jalali";
import { faNum, cn } from "@/lib/utils";
import { tapHaptic } from "@/lib/haptics";
import { ensureNotifPermission, scheduleDailyReminder, scheduleUnlockNotifs } from "@/lib/notify";

export const GROUP_ICONS: Record<string, LucideIcon> = {
  "بیوشیمی خون": FlaskConical,
  "هورمون‌ها": Activity,
  "مارکرها": Sparkles,
  "ادرار و مایعات بدن": Droplets,
  "هماتولوژی": HeartPulse,
  "سرولوژی و میکروب‌شناسی": Bug,
  "انگل‌شناسی": Worm,
  "قارچ‌شناسی": Microscope,
  "تجهیزات و تکنیک‌ها": Cog,
  "کنترل کیفیت": BadgeCheck,
};

export const GROUP_COLORS: Record<string, string> = {
  "بیوشیمی خون": "bg-teal-500",
  "هورمون‌ها": "bg-fuchsia-500",
  "مارکرها": "bg-rose-500",
  "ادرار و مایعات بدن": "bg-amber-500",
  "هماتولوژی": "bg-red-500",
  "سرولوژی و میکروب‌شناسی": "bg-violet-500",
  "انگل‌شناسی": "bg-orange-500",
  "قارچ‌شناسی": "bg-lime-600",
  "تجهیزات و تکنیک‌ها": "bg-slate-500",
  "کنترل کیفیت": "bg-emerald-500",
};

/** cooldown between completing one quiz batch and the next one unlocking (v1.6) */
const QUIZ_COOLDOWN_MS = 30 * 60 * 1000;

/** ۲۹:۴۱ — Persian-digit countdown for the unlock pill */
function fmtMmss(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${faNum(mm)}:${ss < 10 ? "۰" : ""}${faNum(ss)}`;
}

/** «۱۴ ساعت و ۲۳ دقیقه» — Persian countdown for the nightly reset line */
function fmtHm(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${faNum(h)} ساعت و ${faNum(m)} دقیقه` : `${faNum(m)} دقیقه`;
}

/** «نکته امروز» — personalized by the chosen goal and topics (v1.5): the pool
 *  only holds content from the selected categories and the tip style follows
 *  the goal (exam-style goals → question explanations; learning → card facts). */
function TipCard({ data, navigate, goal, focus }: { data: AppData; navigate: (r: Route) => void; goal: string | null; focus: string[] | null }) {
  const pool = useMemo(() => buildTipPool(data, focus, (goal as "uni" | "hire" | "msc" | "basics" | "pro" | null) ?? null), [data, focus, goal]);
  // v1.6.4: a different tip on every app entry — random pick with a no-repeat
  // window persisted in localStorage (shared with the clinical pearl card)
  const [tip, setTip] = useState<Tip | null>(null);
  useEffect(() => {
    setTip(pickRotatingTip(pool));
  }, [pool]);
  if (!tip) return null;
  const next = () => {
    void tapHaptic();
    setTip(pickRotatingTip(pool));
  };
  return (
    <section>
      <div className="relative overflow-hidden rounded-3xl border border-sky-500/25 bg-gradient-to-bl from-sky-400/15 via-cyan-300/10 to-sky-100/5 p-4 shadow-sm dark:from-sky-500/10 dark:via-cyan-500/8 dark:to-sky-500/5">
        <div className="absolute -left-8 -top-8 h-24 w-24 rounded-full bg-sky-400/15 blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-2xl bg-sky-500/15 text-sky-600 dark:text-sky-300">
              <Lightbulb className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[13px] font-bold">
                نکته امروز
                {focus && focus.length > 0 && (
                  <span className="rounded-md bg-sky-500/15 px-1.5 py-0.5 text-[9px] font-black text-sky-700 dark:text-sky-300">
                    {faNum(focus.length)} موضوع شما
                  </span>
                )}
              </div>
              <div className="truncate text-[11px] text-muted-foreground">
                {tip.source || "آزمـیار"} • {tip.kind === "expl" ? "نکته آزمون" : tip.kind === "pearl" ? "نکته بالینی" : "نکته مفهومی"}
              </div>
            </div>
            <button onClick={next} aria-label="نکته بعدی" className="mr-auto grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-muted/60 text-sky-600 transition-colors active:scale-95 dark:text-sky-300">
              <Shuffle className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-3 text-[13.5px] leading-8 text-foreground/90 text-justify">{tip.text}</p>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={next}
              className="flex items-center gap-1.5 rounded-xl bg-sky-500/15 px-3.5 py-2 text-xs font-bold text-sky-700 transition-transform active:scale-95 dark:text-sky-300"
            >
              <Shuffle className="h-3.5 w-3.5" /> نکته بعدی
            </button>
            {tip.tid && (
              <button
                onClick={() => navigate({ v: "test", id: tip.tid })}
                className="flex items-center gap-1.5 rounded-xl border border-sky-500/40 px-3.5 py-2 text-xs font-bold text-sky-700 transition-colors hover:bg-sky-500/10 dark:text-sky-300"
              >
                مطالعه مطلب
                <ArrowLeftIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ClinicalPearl({ data, navigate, focus }: { data: AppData; navigate: (r: Route) => void; focus: string[] | null }) {
  const allPearls = data.pearls ?? [];
  // prefer pearls from the user's chosen topics; fall back to all when too few
  const inFocus = focus && focus.length > 0 ? allPearls.filter((p) => focus.includes(p.cat)) : allPearls;
  const pearls = focus && focus.length > 0 && inFocus.length >= 2 ? inFocus : allPearls;
  // v1.6.4: random per app entry with the shared no-repeat window — «نکته بعدی»
  // also jumps to a random unseen pearl
  const pool = useMemo<Tip[]>(
    () =>
      pearls.map((p) => ({
        id: `pearl:${(p.text ?? "").trim().slice(0, 48)}`,
        text: p.text,
        source: p.test ?? "",
        tid: p.tid ?? "",
        kind: "pearl" as const,
        cat: p.cat,
      })),
    [pearls]
  );
  const [tip, setTip] = useState<Tip | null>(null);
  useEffect(() => {
    setTip(pickRotatingTip(pool));
  }, [pool]);
  if (!tip) return null;
  const next = () => {
    void tapHaptic();
    setTip(pickRotatingTip(pool));
  };
  return (
    <section>
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/25 bg-gradient-to-bl from-amber-400/15 via-orange-300/10 to-amber-100/5 p-4 shadow-sm dark:from-amber-500/10 dark:via-orange-500/8 dark:to-amber-500/5">
        <div className="absolute -left-8 -top-8 h-24 w-24 rounded-full bg-amber-400/15 blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-300">
              <Lightbulb className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[13px] font-bold">نکته بالینی</div>
              <div className="truncate text-[11px] text-muted-foreground">
                {tip.cat || "آزمـیار"} • {tip.source || "آزمـیار"}
              </div>
            </div>
            <span className="mr-auto grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-muted/60 text-amber-600 transition-colors active:scale-95 dark:text-amber-300" onClick={next} aria-label="نکته بعدی" role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && next()}>
              <Shuffle className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 text-[13.5px] leading-8 text-foreground/90 text-justify">{tip.text}</p>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={next}
              className="flex items-center gap-1.5 rounded-xl bg-amber-500/15 px-3.5 py-2 text-xs font-bold text-amber-700 transition-transform active:scale-95 dark:text-amber-300"
            >
              <Shuffle className="h-3.5 w-3.5" /> نکته بعدی
            </button>
            {tip.tid && (
              <button
                onClick={() => navigate({ v: "test", id: tip.tid })}
                className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 px-3.5 py-2 text-xs font-bold text-amber-700 transition-colors hover:bg-amber-500/10 dark:text-amber-300"
              >
                مطالعه مطلب
                <ArrowLeftIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Honorary medal earned from real activity: studying, Leitner reviews and quizzes. */
function MedalCard({ activity: a }: { activity: ActivityInfo }) {
  const t = a.tier;
  return (
    <section className={cn("relative overflow-hidden rounded-3xl border p-5 shadow-sm", t.bg, t.border)}>
      <div className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-white/25 blur-2xl" />
      <div className="absolute -left-8 bottom-0 h-24 w-24 rounded-full bg-white/15 blur-2xl" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[13px] font-bold">
            <Sparkles className={cn("h-4 w-4", t.text)} />
            مدال افتخار آزمـیار
          </div>
          <span className={cn("rounded-lg bg-white/50 px-2 py-0.5 text-[11px] font-black dark:bg-white/10", t.text)}>
            سطح {faNum(a.tierIndex + 1)} از {faNum(6)}
          </span>
        </div>

        <div className="mt-3.5 flex items-center gap-4">
          <div className={cn("grid h-[76px] w-[76px] shrink-0 place-items-center rounded-full bg-gradient-to-br p-[3px] shadow-md", t.grad)}>
            <div className="grid h-full w-full place-items-center rounded-full bg-card text-[2.1rem] leading-none">
              {t.emoji}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[1.15rem] font-black leading-7">{t.name}</div>
            <div className="mt-0.5 text-xs font-semibold text-muted-foreground">
              {faNum(a.points)} امتیاز فعالیت
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground/85">
              مطالعه {faNum(a.studyPts)} • مرور {faNum(a.cardPts)} • آزمون {faNum(a.quizPts)}
            </div>
          </div>
        </div>

        {a.next && (
          <div className="mt-3.5">
            <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold text-muted-foreground">
              <span>
                تا «{a.next.name}» {faNum(a.nextGap)} امتیاز مانده
              </span>
              <span className={t.text}>{faNum(Math.round(a.progress * 100))}٪</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-background/60 shadow-inner">
              <div
                className={cn("h-full rounded-full bg-gradient-to-l transition-all duration-500", t.grad)}
                style={{ width: `${Math.max(4, Math.round(a.progress * 100))}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-3.5 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-white/45 p-2.5 text-center dark:bg-white/8">
            <BookOpen className="mx-auto h-3.5 w-3.5 text-primary" />
            <div className="mt-1 text-sm font-black">{faNum(a.readCount)}</div>
            <div className="text-[10px] text-muted-foreground">مطلب مطالعه‌شده</div>
          </div>
          <div className="rounded-xl bg-white/45 p-2.5 text-center dark:bg-white/8">
            <Layers className="mx-auto h-3.5 w-3.5 text-primary" />
            <div className="mt-1 text-sm font-black">{faNum(a.cardsSeen)}</div>
            <div className="text-[10px] text-muted-foreground">مرور کارت (+{faNum(a.mastered)} مسلط)</div>
          </div>
          <div className="rounded-xl bg-white/45 p-2.5 text-center dark:bg-white/8">
            <ClipboardCheck className="mx-auto h-3.5 w-3.5 text-primary" />
            <div className="mt-1 text-sm font-black">{faNum(a.quizRuns)}</div>
            <div className="text-[10px] text-muted-foreground">آزمون (میانگین {faNum(a.quizAvg)}٪)</div>
          </div>
        </div>

        <p className="mt-3 text-[12px] leading-6 text-muted-foreground">{t.caption}</p>
      </div>
    </section>
  );
}

/** «برنامه امروز» — a checkable daily plan built from the user's goal, exam
 *  countdown, content volume and past performance (v1.4: items open guided
 *  sessions; the goal and its Jalali exam date are editable anytime). */
function TodayPlanCard({
  plan,
  goalSet,
  examDate,
  done,
  doneAt,
  onToggle,
  onNavigate,
  onPickGoal,
}: {
  plan: TodayPlan;
  goalSet: boolean;
  examDate: string | null;
  done: string[];
  /** itemId → completion epoch ms of today (drives the quiz unlock chain) */
  doneAt: Record<string, number>;
  onToggle: (id: string) => void;
  onNavigate: (r: Route) => void;
  onPickGoal: () => void;
}) {
  const doneCount = plan.items.filter((i) => done.includes(i.id)).length;
  const allDone = plan.items.length > 0 && doneCount === plan.items.length;

  // v1.6 quiz unlock chain: quiz batches open one after another — a batch
  // unlocks QUIZ_COOLDOWN minutes after the previous batch was completed
  // (auto-ticked at the end of its session). Card reviews and mistake
  // reviews are never locked.
  const [now, setNow] = useState(Date.now());
  const quizItems = plan.items.filter((it) => it.kind === "quiz");
  const lockInfo = new Map<string, { locked: boolean; unlockAt: number | null; waitPrev: boolean }>();
  {
    let prevDone = true;
    let prevDoneAt: number | null = null;
    for (const it of quizItems) {
      let waitPrev = false;
      let unlockAt: number | null = null;
      if (!prevDone) {
        waitPrev = true;
      } else if (prevDoneAt !== null) {
        const at = prevDoneAt + QUIZ_COOLDOWN_MS;
        if (now < at) unlockAt = at;
      }
      lockInfo.set(it.id, { locked: waitPrev || unlockAt !== null, unlockAt, waitPrev });
      if (done.includes(it.id)) {
        prevDone = true;
        prevDoneAt = typeof doneAt[it.id] === "number" ? doneAt[it.id] : null;
      } else {
        prevDone = false;
        prevDoneAt = null;
      }
    }
  }
  const nextUnlockAt =
    [...lockInfo.values()]
      .map((l) => l.unlockAt)
      .filter((t): t is number => t !== null)
      .sort((a, b) => a - b)[0] ?? null;
  const allQuizDone = quizItems.length >= 2 && quizItems.every((it) => done.includes(it.id));
  const msToMidnight = (() => {
    const d = new Date(now);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0).getTime() - d.getTime();
  })();

  // live ticker for the unlock/reset countdowns — runs only while one is on screen
  const ticking = nextUnlockAt !== null || allDone;
  useEffect(() => {
    if (!ticking) return;
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, [ticking]);

  const row = (item: PlanItem) => {
    const isDone = done.includes(item.id);
    const lock = item.kind === "quiz" ? lockInfo.get(item.id) : undefined;
    if (lock?.locked && !isDone) {
      return (
        <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-dashed border-border bg-muted/30 p-3">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
            <Lock className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-muted-foreground">{item.title}</span>
            <span className="block truncate text-[11px] text-muted-foreground/75">{item.detail}</span>
          </div>
          {lock.unlockAt !== null ? (
            <span className="flex shrink-0 items-center gap-1 rounded-lg bg-sky-500/15 px-2 py-1 text-[10px] font-black text-sky-700 tabular-nums dark:text-sky-300">
              <Clock3 className="h-3 w-3" /> {fmtMmss(lock.unlockAt - now)}
            </span>
          ) : (
            <span className="shrink-0 rounded-lg bg-muted px-2 py-1 text-[10px] font-black text-muted-foreground">ابتدا دسته قبل</span>
          )}
        </div>
      );
    }
    return (
      <div
        key={item.id}
        className={cn(
          "flex items-center gap-3 rounded-2xl border p-3 transition-colors",
          isDone ? "border-emerald-500/30 bg-emerald-500/8" : "border-border/70 bg-card"
        )}
      >
        <button
          onClick={() => onToggle(item.id)}
          aria-label={isDone ? "علامت‌زدن به‌عنوان انجام‌نشده" : "علامت‌زدن به‌عنوان انجام‌شده"}
          className={cn(
            "grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition-colors",
            isDone ? "border-emerald-500 bg-emerald-500 text-white" : "border-border text-transparent"
          )}
        >
          <Check className="h-4 w-4" />
        </button>
        <button onClick={() => onNavigate(item.route)} className="min-w-0 flex-1 text-right">
          <span className={cn("block text-sm font-bold", isDone && "text-emerald-700 line-through decoration-emerald-500/50 dark:text-emerald-300")}>
            {item.title}
          </span>
          <span className="block truncate text-[11px] text-muted-foreground">{item.detail}</span>
        </button>
        <button onClick={() => onNavigate(item.route)} aria-label="شروع" className="shrink-0 rounded-lg p-1 text-muted-foreground/60">
          <GoLeft className="h-4 w-4" />
        </button>
      </div>
    );
  };

  if (!goalSet) {
    return (
      <section className="rounded-3xl border border-primary/30 bg-primary/5 p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Target className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-black">هدف مطالعه‌ات را مشخص کن</div>
            <div className="text-[11px] leading-5 text-muted-foreground">
              امتحان دانشگاه، ارشد، استخدامی… — بعد آزمـیار هر روز می‌گوید چه چیزی بخوانی
            </div>
          </div>
        </div>
        <button
          onClick={onPickGoal}
          className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl bg-primary font-bold text-white transition-transform active:scale-[0.98]"
        >
          <Target className="h-4.5 w-4.5" /> انتخاب هدف مطالعه
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border bg-card p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 text-[15px] font-bold">
          <CalendarDays className="h-4.5 w-4.5 text-primary" /> برنامه امروز
        </div>
        {plan.goalTitle && (
          <span className="rounded-lg bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">{plan.goalTitle}</span>
        )}
        {examDate && plan.daysLeft !== null && plan.daysLeft > 0 && (
          <span className="rounded-lg bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
            {formatJalaliLong(examDate)}
          </span>
        )}
        {plan.daysLeft !== null && (
          <span
            className={cn(
              "rounded-lg px-2 py-0.5 text-[10px] font-black",
              plan.daysLeft === 0 ? "bg-rose-500/15 text-rose-600 dark:text-rose-300" : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
            )}
          >
            {plan.daysLeft === 0 ? "آزمون نزدیک است!" : `${faNum(plan.daysLeft)} روز مانده`}
          </span>
        )}
        {nextUnlockAt !== null && (
          <span className="flex items-center gap-1 rounded-lg bg-sky-500/15 px-2 py-0.5 text-[10px] font-black text-sky-700 tabular-nums dark:text-sky-300">
            <Clock3 className="h-3 w-3" /> دسته بعدی: {fmtMmss(nextUnlockAt - now)}
          </span>
        )}
        {allQuizDone && (
          <span className="rounded-lg bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:text-emerald-300">
            همه دسته‌های آزمون باز شد ✓
          </span>
        )}
        <span className="mr-auto flex items-center gap-1.5">
          <button
            onClick={onPickGoal}
            aria-label="ویرایش هدف و تاریخ آزمون"
            title="ویرایش هدف و تاریخ آزمون"
            className="grid h-7 w-7 place-items-center rounded-lg bg-muted text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <span className="text-[11px] font-bold text-muted-foreground">
            {faNum(doneCount)}/{faNum(plan.items.length)}
          </span>
        </span>
      </div>
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-300"
          style={{ width: `${plan.items.length ? (doneCount / plan.items.length) * 100 : 0}%` }}
        />
      </div>
      <div className="space-y-2">{plan.items.length ? plan.items.map(row) : <p className="py-3 text-center text-xs text-muted-foreground">برنامه‌ای ساخته نشد — چند مطلب مطالعه کنید تا برنامه فعال شود.</p>}</div>
      {allDone && (
        <div className="mt-3 space-y-2">
          <p className="rounded-xl bg-emerald-500/10 p-2.5 text-center text-xs font-bold text-emerald-700 dark:text-emerald-300">
            برنامه امروز کامل شد ✓ عالی بود!
          </p>
          <p className="flex items-center justify-center gap-1.5 rounded-xl bg-sky-500/10 p-2.5 text-center text-[11px] font-bold text-sky-700 dark:text-sky-300">
            <RotateCcw className="h-3.5 w-3.5 shrink-0" />
            ریست برنامه و آزمون بعدی: فردا ۰۰:۰۰ — {fmtHm(msToMidnight)} دیگر
          </p>
        </div>
      )}
      <p className="mt-3 text-[11px] leading-6 text-muted-foreground">{plan.note}</p>
    </section>
  );
}

/** quiz batches currently locked with a KNOWN unlock moment (v1.6.2 — drives the
 *  unlock notifications). Mirrors the TodayPlanCard chain: a batch unlocks
 *  QUIZ_COOLDOWN after the previous batch was completed; batches waiting for a
 *  not-yet-completed predecessor have no fixed moment and are excluded. */
function lockedQuizSchedule(plan: TodayPlan, done: string[], doneAt: Record<string, number>): { title: string; unlockAt: number }[] {
  const out: { title: string; unlockAt: number }[] = [];
  let prevDone = true;
  let prevDoneAt: number | null = null;
  for (const it of plan.items.filter((i) => i.kind === "quiz")) {
    if (prevDone && prevDoneAt !== null && !done.includes(it.id)) {
      out.push({ title: it.title, unlockAt: prevDoneAt + QUIZ_COOLDOWN_MS });
    }
    if (done.includes(it.id)) {
      prevDone = true;
      prevDoneAt = typeof doneAt[it.id] === "number" ? doneAt[it.id] : null;
    } else {
      prevDone = false;
      prevDoneAt = null;
    }
  }
  return out;
}

export function HomeView({ data, navigate }: {  data: AppData;
  navigate: (r: Route) => void;
}) {
  const { lastTest, favorites, leitner, qstats, mistakes, settings, studyGoal, planDone, planDoneAt, togglePlanItem } = useAppStore();
  const activity = useActivityMedal();
  const [goalOpen, setGoalOpen] = useState(false);
  const last = useMemo(() => data.tests.find((t) => t.id === lastTest), [data.tests, lastTest]);
  const favTests = useMemo(
    () => favorites.map((id) => data.tests.find((t) => t.id === id)).filter(Boolean) as typeof data.tests,
    [favorites, data.tests]
  );
  const due = useMemo(() => {
    const now = Date.now();
    return data.cards.filter((c) => {
      const st = leitner[c.id];
      return !st || st.due <= now;
    }).length;
  }, [data.cards, leitner]);

  const stats = [
    { label: "مطلب آموزشی", value: data.tests.length, href: () => navigate({ v: "cats" }) },
    { label: "کارت مرور", value: data.cards.length, href: () => navigate({ v: "leitner" }) },
    { label: "سوال آزمون", value: data.questions.length, href: () => navigate({ v: "quiz" }) },
  ];

  const plan = useMemo(
    () => buildTodayPlan(data, { leitner, qstats, mistakes, settings, studyGoal }),
    [data, leitner, qstats, mistakes, settings, studyGoal]
  );
  const doneToday = useMemo(() => planDone[planDayKey()] ?? [], [planDone]);
  const doneAtToday = useMemo(() => planDoneAt[planDayKey()] ?? {}, [planDoneAt]);

  // v1.6.2 reminders: rescheduled at every home visit — unlock notifications for
  // the locked quiz batches of the plan, plus the daily «یادت نره» reminder that
  // only fires when a whole day passes without opening the app (same-id overwrite)
  useEffect(() => {
    if (!settings.notifications) return;
    let alive = true;
    void (async () => {
      const ok = await ensureNotifPermission();
      if (!ok || !alive) return;
      await scheduleUnlockNotifs(lockedQuizSchedule(plan, doneToday, doneAtToday));
      await scheduleDailyReminder();
    })();
    return () => {
      alive = false;
    };
  }, [plan, doneToday, doneAtToday, settings.notifications]);

  return (
    <div className="space-y-5">
      {/* Compact brand bar — the old tall hero was slimmed down (v1.2.7) to
          keep the home page uncluttered; the medal card below is the anchor */}
      <section className="hero-aurora relative overflow-hidden rounded-2xl px-4 py-3 text-white shadow-sm">
        <div className="relative flex items-center gap-3">
          <img src={assetUrl("/icons/icon-64.png")} alt="" className="h-10 w-10 shrink-0 rounded-xl shadow-md" />
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-black leading-6">آزمـیار</div>
            <div className="truncate text-[11px] text-white/80">آموزش و تفسیر آزمایش‌های آزمایشگاهی</div>
          </div>
          <Sparkles className="h-4 w-4 shrink-0 text-white/70" />
        </div>
        <div className="relative mt-2.5 grid grid-cols-3 gap-2">
          {stats.map((s) => (
            <button
              key={s.label}
              onClick={s.href}
              className="rounded-xl bg-white/10 py-1.5 text-center backdrop-blur-sm transition-colors active:bg-white/25"
            >
              <span className="text-sm font-black">{faNum(s.value)}</span>
              <span className="mr-1 text-[10px] font-semibold text-white/85">{s.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Today's study plan — goal-driven daily checklist (v1.4 sessions) */}
      <TodayPlanCard
        plan={plan}
        goalSet={!!studyGoal.goal}
        examDate={studyGoal.examDate}
        done={doneToday}
        doneAt={doneAtToday}
        onToggle={togglePlanItem}
        onNavigate={navigate}
        onPickGoal={() => setGoalOpen(true)}
      />
      {/* Personalized daily tip — scoped to the chosen goal/topics (v1.5) */}
      <TipCard data={data} navigate={navigate} goal={studyGoal.goal} focus={studyGoal.focus} />
      <GoalDialog open={goalOpen} onOpenChange={setGoalOpen} data={data} />

      {/* Honorary medal — encourages continued useful use of the app */}
      <MedalCard activity={activity} />

      {/* Quick actions */}
      <section className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate({ v: "leitner" })}
          className="flex items-center gap-3 rounded-2xl border bg-card p-3.5 text-right shadow-sm transition-transform active:scale-[0.99]"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-teal-500/12 text-teal-600 dark:text-teal-300">
            <Layers className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-bold">مرور امروز</span>
            <span className="block text-xs text-muted-foreground">{due > 0 ? `${faNum(due)} کارت آماده مرور` : "مروری باقی نمانده"}</span>
          </span>
        </button>
        <button
          onClick={() => navigate({ v: "quiz" })}
          className="flex items-center gap-3 rounded-2xl border bg-card p-3.5 text-right shadow-sm transition-transform active:scale-[0.99]"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-rose-500/12 text-rose-600 dark:text-rose-300">
            <ClipboardCheck className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-bold">آزمون سریع</span>
            <span className="block text-xs text-muted-foreground">از مباحث خوانده‌شده</span>
          </span>
        </button>
      </section>

      {/* Continue reading */}
      {last && (
        <section>
          <h2 className="mb-2.5 flex items-center gap-2 text-[15px] font-bold">
            <BookOpen className="h-4 w-4 text-primary" /> ادامه مطالعه
          </h2>
          <button
            onClick={() => navigate({ v: "test", id: last.id })}
            className="flex w-full items-center gap-3 rounded-2xl border bg-card p-4 text-right shadow-sm transition-transform active:scale-[0.99]"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <FlaskConical className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-bold">{last.name}</span>
              <span className="block truncate text-xs text-muted-foreground">{last.cat}</span>
            </span>
            <ChevronLeft className="h-5 w-5 shrink-0 text-muted-foreground" />
          </button>
        </section>
      )}

      {/* Favorites */}
      {favTests.length > 0 && (
        <section>
          <h2 className="mb-2.5 flex items-center gap-2 text-[15px] font-bold">
            <Star className="h-4 w-4 text-amber-500" /> علاقه‌مندی‌ها
          </h2>
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
            {favTests.map((t) => (
              <button
                key={t.id}
                onClick={() => navigate({ v: "test", id: t.id })}
                className="shrink-0 rounded-2xl border bg-card px-4 py-3 text-sm font-semibold shadow-sm"
              >
                {t.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Random clinical pearl */}
      <ClinicalPearl data={data} navigate={navigate} focus={studyGoal.focus} />
    </div>
  );
}
