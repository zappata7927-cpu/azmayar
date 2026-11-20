// Daily study plan (v1.4): turns the user's chosen goal, the time left to the
// exam, the volume of the content and past performance into a concrete
// "برنامه امروز" checklist, so the user never has to decide what to study.
// Since v1.4 items are scoped at the TEST level («۶ کارت مورفولوژی پلاکت‌ها»)
// and open a guided, timed session view instead of the generic leitner/quiz.
import { Briefcase, GraduationCap, Library, Rocket, Sparkles, type LucideIcon } from "lucide-react";
import type { Route } from "./nav";
import type { LeitnerState, QuestionStat, Settings, StudyGoal, StudyGoalKey } from "./store";
import { GOAL_TITLES } from "./store";
import type { AppData } from "./types";
import { faNum } from "./utils";

export interface GoalInfo {
  key: StudyGoalKey;
  title: string;
  desc: string;
  icon: LucideIcon;
  /** exam-style goals ask for an exam date */
  examDate: boolean;
  /** share of the daily study capacity routed to quiz questions */
  quizWeight: number;
}

export const GOALS: GoalInfo[] = [
  { key: "uni", title: GOAL_TITLES.uni, desc: "آمادگی میان‌ترم و پایان‌ترم دانشگاه", icon: GraduationCap, examDate: true, quizWeight: 0.5 },
  { key: "hire", title: GOAL_TITLES.hire, desc: "آزمون استخدامی مرتبط با رشته", icon: Briefcase, examDate: true, quizWeight: 1 },
  { key: "msc", title: GOAL_TITLES.msc, desc: "کنکور کارشناسی ارشد علوم آزمایشگاهی", icon: Rocket, examDate: true, quizWeight: 1 },
  { key: "basics", title: GOAL_TITLES.basics, desc: "مرور مستمر و مرجع‌خوانی دروس پایه", icon: Library, examDate: false, quizWeight: 0.6 },
  { key: "pro", title: GOAL_TITLES.pro, desc: "یادگیری عمیق بدون فشار آزمون", icon: Sparkles, examDate: false, quizWeight: 0.6 },
];

export interface PlanItem {
  id: string;
  kind: "cards" | "quiz" | "mistakes";
  title: string;
  detail: string;
  /** test id the session is scoped to */
  tid?: string;
  route: Route;
}

export interface TodayPlan {
  items: PlanItem[];
  /** days remaining to the exam date (null = no date set / no exam goal) */
  daysLeft: number | null;
  goalTitle: string | null;
  note: string;
}

interface TestAgg {
  tid: string;
  name: string;
  dueCards: number;
  totalCards: number;
  boxSum: number;
  qCount: number;
  attempts: number;
  ok: number;
}

/** per-test weakness 0..1 (0.55 quiz accuracy + 0.45 card mastery; unknown → 0.5) */
function testWeakness(t: TestAgg): number {
  const acc = t.attempts > 0 ? t.ok / t.attempts : 0.5;
  const quizWeak = t.attempts >= 4 ? 1 - acc : 0.5;
  const cardWeak = t.totalCards > 0 ? 1 - t.boxSum / (t.totalCards * 5) : 0.5;
  return Math.max(0, Math.min(1, 0.55 * quizWeak + 0.45 * cardWeak));
}

export function buildTodayPlan(
  data: AppData,
  opts: {
    leitner: Record<string, LeitnerState>;
    qstats: Record<string, QuestionStat>;
    mistakes: Record<string, number>;
    settings: Settings;
    studyGoal: StudyGoal;
    now?: number;
  }
): TodayPlan {
  const now = opts.now ?? Date.now();
  const goal = opts.studyGoal.goal ? GOALS.find((g) => g.key === opts.studyGoal.goal) ?? null : null;
  // topic filter (v1.5): the user may scope the whole plan to chosen categories
  const focus = opts.studyGoal.focus && opts.studyGoal.focus.length > 0 ? opts.studyGoal.focus : null;

  // ----- days left to the exam -----
  let daysLeft: number | null = null;
  if (opts.studyGoal.goal && goal?.examDate && opts.studyGoal.examDate) {
    const d = new Date(`${opts.studyGoal.examDate}T00:00:00`);
    if (!isNaN(d.getTime())) {
      const left = Math.ceil((d.getTime() - now) / 86400000);
      daysLeft = left > 0 ? left : 0;
    }
  }

  // ----- per-test aggregation (scoped to the chosen topics when set) -----
  const testName = new Map<string, string>();
  for (const t of data.tests) testName.set(t.id, t.name);
  const agg = new Map<string, TestAgg>();
  const get = (tid: string): TestAgg => {
    let a = agg.get(tid);
    if (!a) {
      a = { tid, name: testName.get(tid) ?? tid, dueCards: 0, totalCards: 0, boxSum: 0, qCount: 0, attempts: 0, ok: 0 };
      agg.set(tid, a);
    }
    return a;
  };
  const cardCount = { n: 0 };
  const qCount = { n: 0 };
  const aggregate = (respectFocus: boolean) => {
    agg.clear();
    cardCount.n = 0;
    qCount.n = 0;
    const ok = (cat: string) => !respectFocus || !focus || focus.includes(cat);
    for (const c of data.cards) {
      if (!ok(c.cat)) continue;
      cardCount.n += 1;
      const a = get(c.tid);
      a.totalCards += 1;
      const st = opts.leitner[c.id];
      if (!st || st.due <= now) a.dueCards += 1;
      if (st && st.box > 0) a.boxSum += st.box;
    }
    for (const q of data.questions) {
      if (!ok(q.cat)) continue;
      qCount.n += 1;
      const a = get(q.tid);
      a.qCount += 1;
      const s = opts.qstats[q.id];
      if (s && s.seen > 0) {
        a.attempts += s.seen;
        a.ok += s.ok;
      }
    }
  };
  aggregate(true);

  // ----- quotas: exam date → pace from remaining days × content volume; else the
  // user's own "cards per session" setting drives the day -----
  const dailyCards = Math.max(5, opts.settings.dailyCards);
  let cardsQuota = dailyCards;
  if (daysLeft !== null && daysLeft > 0) {
    // review the whole (scoped) card bank roughly twice before the exam
    cardsQuota = Math.max(5, Math.min(50, Math.ceil((cardCount.n * 2) / daysLeft)));
  }
  let quizQuota = Math.max(5, Math.min(40, Math.round((cardsQuota * (goal?.quizWeight ?? 0.6)) * 0.5)));
  if (daysLeft !== null && daysLeft > 0) {
    quizQuota = Math.max(5, Math.min(40, Math.ceil((qCount.n * 1.2) / daysLeft)));
  }

  const items: PlanItem[] = [];

  // ----- cards across the weakest tests that actually have due cards -----
  const cardTests = [...agg.values()]
    .filter((a) => a.dueCards >= 2)
    .sort((a, b) => testWeakness(b) - testWeakness(a) || b.dueCards - a.dueCards)
    .slice(0, 3);
  let cardsLeft = cardsQuota;
  cardTests.forEach((a, i) => {
    if (cardsLeft < 2) return;
    const share = i === cardTests.length - 1 ? cardsLeft : Math.round(cardsQuota / cardTests.length);
    const n = Math.min(Math.max(2, share), a.dueCards, cardsLeft);
    if (n < 2) return;
    items.push({
      id: `cards:${a.tid}`,
      kind: "cards",
      title: `${faNum(n)} کارت ${a.name}`,
      detail: "جلسه مرور دقیقاً همین کارت‌ها",
      tid: a.tid,
      route: { v: "session", kind: "cards", id: a.tid, count: n },
    });
    cardsLeft -= n;
  });

  // ----- timed adaptive quiz from the weakest tests -----
  const quizTests = [...agg.values()]
    .filter((a) => a.qCount >= 5)
    .sort((a, b) => testWeakness(b) - testWeakness(a) || b.attempts - a.attempts)
    .slice(0, 2);
  let qLeft = quizQuota;
  quizTests.forEach((a, i) => {
    if (qLeft < 5) return;
    const share = i === quizTests.length - 1 ? qLeft : Math.round(quizQuota * (i === 0 ? 0.6 : 0.4));
    const n = Math.min(Math.max(5, share), a.qCount, qLeft);
    if (n < 5) return;
    items.push({
      id: `quiz:${a.tid}`,
      kind: "quiz",
      title: `${faNum(n)} سؤال ${a.name}`,
      detail: "آزمون زمان‌دار همان مبحث (۶۰ ثانیه برای هر سؤال)",
      tid: a.tid,
      route: { v: "session", kind: "quiz", id: a.tid, count: n },
    });
    qLeft -= n;
  });

  // ----- graceful fallback: chosen topics with (almost) no content → all topics -----
  let focusNote = "";
  if (focus && items.length === 0 && (cardCount.n >= 5 || qCount.n >= 5)) {
    // scoped content exists but produced no items (e.g. everything reviewed) — keep scoped
  } else if (focus && cardCount.n < 5 && qCount.n < 5) {
    aggregate(false);
    focusNote = "موضوعات انتخابی محتوای کافی ندارند؛ فعلاً از همه موضوعات برنامه ساخته شد.";
  }

  // ----- yesterday's (and older) mistakes -----
  const mCount = Object.keys(opts.mistakes ?? {}).length;
  if (mCount >= 3) {
    items.push({
      id: "mistakes",
      kind: "mistakes",
      title: `مرور ${faNum(Math.min(mCount, 20))} سؤال اشتباه`,
      detail: "آزمون زمان‌دار سؤال‌هایی که نادرست پاسخ داده‌اید",
      route: { v: "session", kind: "mistakes" },
    });
  }

  let note: string;
  if (focusNote) {
    note = focusNote;
  } else if (daysLeft !== null && daysLeft > 0) {
    note = `تا ${goal?.title ?? "آزمون"} ${faNum(daysLeft)} روز مانده؛ حجم امروز بر اساس روزهای باقی‌مانده و محتوای ${focus ? "موضوعات انتخابی" : "کل"} اپ تنظیم شده است.`;
  } else if (daysLeft === 0) {
    note = "تاریخ آزمون شما رسیده یا گذشته است — برای برنامه جدید، تاریخ را به‌روزرسانی کنید.";
  } else if (goal) {
    note = `برنامه مستمر بر اساس هدف «${goal.title}»${focus ? ` و موضوعات انتخابی شما (${focus.slice(0, 3).join("، ")})` : ""}؛ آزمون‌های برنامه زمان‌دار هستند.`;
  } else {
    note = "برای شخصی‌سازی کامل برنامه، هدف مطالعه‌تان را انتخاب کنید.";
  }
  return { items, daysLeft, goalTitle: goal?.title ?? null, note };
}
