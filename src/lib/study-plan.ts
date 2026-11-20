// Daily study plan (v1.3): turns the user's chosen goal, the time left to the
// exam, the volume of the content and past performance into a concrete
// "برنامه امروز" checklist, so the user never has to decide what to study.
import { Briefcase, GraduationCap, Library, Rocket, Sparkles, type LucideIcon } from "lucide-react";
import type { Route } from "./nav";
import type { LeitnerState, QuestionStat, Settings, StudyGoal, StudyGoalKey } from "./store";
import { GOAL_TITLES } from "./store";
import type { AppData } from "./types";
import { categoryPerformance } from "./adaptive";
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
  cat?: string;
  route: Route;
}

export interface TodayPlan {
  items: PlanItem[];
  /** days remaining to the exam date (null = no date set / no exam goal) */
  daysLeft: number | null;
  goalTitle: string | null;
  note: string;
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
  const perf = categoryPerformance(data, opts.leitner, opts.qstats);
  const goal = opts.studyGoal.goal ? GOALS.find((g) => g.key === opts.studyGoal.goal) ?? null : null;

  // ----- days left to the exam -----
  let daysLeft: number | null = null;
  if (opts.studyGoal.goal && goal?.examDate && opts.studyGoal.examDate) {
    const d = new Date(`${opts.studyGoal.examDate}T00:00:00`);
    if (!isNaN(d.getTime())) {
      const left = Math.ceil((d.getTime() - now) / 86400000);
      daysLeft = left > 0 ? left : 0;
    }
  }

  // ----- due cards per cat -----
  const dueByCat = new Map<string, number>();
  for (const c of data.cards) {
    const st = opts.leitner[c.id];
    if (!st || st.due <= now) dueByCat.set(c.cat, (dueByCat.get(c.cat) ?? 0) + 1);
  }

  // ----- quotas: exam date → pace from remaining days × content volume; else the
  // user's own "cards per session" setting drives the day -----
  const dailyCards = Math.max(5, opts.settings.dailyCards);
  let cardsQuota = dailyCards;
  if (daysLeft !== null && daysLeft > 0) {
    // review the whole card bank roughly twice before the exam
    cardsQuota = Math.max(5, Math.min(50, Math.ceil((data.cards.length * 2) / daysLeft)));
  }
  let quizQuota = Math.max(5, Math.min(40, Math.round((cardsQuota * (goal?.quizWeight ?? 0.6)) * 0.5)));
  if (daysLeft !== null && daysLeft > 0) {
    quizQuota = Math.max(5, Math.min(40, Math.ceil((data.questions.length * 1.2) / daysLeft)));
  }

  const items: PlanItem[] = [];

  // ----- cards across the weakest cats that actually have due cards -----
  const cardCats = [...perf.values()]
    .filter((p) => (dueByCat.get(p.cat) ?? 0) >= 3)
    .sort((a, b) => b.weakness - a.weakness)
    .slice(0, 3);
  let cardsLeft = cardsQuota;
  cardCats.forEach((p, i) => {
    const avail = dueByCat.get(p.cat) ?? 0;
    if (cardsLeft < 5 || avail <= 0) return;
    const share = i === cardCats.length - 1 ? cardsLeft : Math.max(5, Math.min(avail, Math.round(cardsQuota / cardCats.length)));
    const n = Math.min(share, avail, cardsLeft);
    if (n < 5) return;
    items.push({
      id: `cards:${p.cat}`,
      kind: "cards",
      title: `${faNum(n)} کارت ${p.cat}`,
      detail: "مرور کارت‌های آماده این مبحث در جعبه لایتنر",
      cat: p.cat,
      route: { v: "leitner" },
    });
    cardsLeft -= n;
  });

  // ----- adaptive quiz from the weakest cats -----
  const qCountByCat = new Map<string, number>();
  for (const q of data.questions) qCountByCat.set(q.cat, (qCountByCat.get(q.cat) ?? 0) + 1);
  const quizCats = [...perf.values()]
    .filter((p) => (qCountByCat.get(p.cat) ?? 0) >= 5)
    .sort((a, b) => b.weakness - a.weakness)
    .slice(0, 2);
  let qLeft = quizQuota;
  quizCats.forEach((p, i) => {
    const avail = qCountByCat.get(p.cat) ?? 0;
    if (qLeft < 5 || avail <= 0) return;
    const share = i === quizCats.length - 1 ? qLeft : Math.max(5, Math.min(avail, Math.round(quizQuota * (i === 0 ? 0.6 : 0.4))));
    const n = Math.min(share, avail, qLeft);
    if (n < 5) return;
    items.push({
      id: `quiz:${p.cat}`,
      kind: "quiz",
      title: `${faNum(n)} سؤال ${p.cat}`,
      detail: "آزمون هوشمند با مرور فاصله‌دار",
      cat: p.cat,
      route: { v: "quiz", cat: p.cat, count: n },
    });
    qLeft -= n;
  });

  // ----- yesterday's (and older) mistakes -----
  const mCount = Object.keys(opts.mistakes ?? {}).length;
  if (mCount >= 3) {
    items.push({
      id: "mistakes",
      kind: "mistakes",
      title: `مرور ${faNum(Math.min(mCount, 20))} سؤال اشتباه`,
      detail: "سؤال‌هایی که قبلاً نادرست پاسخ داده‌اید",
      route: { v: "quiz", mode: "mistakes" },
    });
  }

  let note: string;
  if (daysLeft !== null && daysLeft > 0) {
    note = `تا ${goal?.title ?? "آزمون"} ${faNum(daysLeft)} روز مانده؛ حجم امروز بر اساس روزهای باقی‌مانده و کل محتوای اپ تنظیم شده است.`;
  } else if (daysLeft === 0) {
    note = "تاریخ آزمون شما رسیده یا گذشته است — برای برنامه جدید، تاریخ را در تنظیمات به‌روزرسانی کنید.";
  } else if (goal) {
    note = `برنامه مستمر بر اساس هدف «${goal.title}»، تنظیمات روزانه شما و نقاط ضعف‌تان.`;
  } else {
    note = "برای شخصی‌سازی کامل برنامه، هدف مطالعه‌تان را انتخاب کنید.";
  }
  return { items, daysLeft, goalTitle: goal?.title ?? null, note };
}
