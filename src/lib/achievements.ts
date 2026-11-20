// Honorary medal system — derived entirely from real activity in the app:
// studying lessons (read), Leitner card reviews (answering), and quiz
// performance (count + average score). Pure derived state, nothing persisted.
import { useMemo } from "react";
import { useAppStore, type QuizRun } from "./store";

export interface MedalTier {
  key: string;
  name: string;
  emoji: string;
  min: number; // points required
  /** ring gradient around the medal */
  grad: string;
  /** card chrome */
  bg: string;
  border: string;
  text: string;
  caption: string;
}

export const MEDAL_TIERS: MedalTier[] = [
  {
    key: "starter",
    name: "تازه‌وارد",
    emoji: "🌱",
    min: 0,
    grad: "from-slate-300 to-slate-400",
    bg: "bg-gradient-to-bl from-slate-100/70 to-slate-200/40 dark:from-slate-800/50 dark:to-slate-900/40",
    border: "border-slate-400/30",
    text: "text-slate-600 dark:text-slate-300",
    caption: "با مطالعه، مرور کارت‌ها و آزمون امتیاز جمع کن تا اولین مدالت را بگیری!",
  },
  {
    key: "bronze",
    name: "مدال برنزی",
    emoji: "🥉",
    min: 250,
    grad: "from-orange-600 to-amber-400",
    bg: "bg-gradient-to-bl from-amber-100/70 to-orange-100/40 dark:from-amber-950/40 dark:to-orange-950/30",
    border: "border-amber-500/35",
    text: "text-amber-700 dark:text-amber-300",
    caption: "شروع خوبی بود! ادامه بده تا مدال نقره‌ای بدرخشد.",
  },
  {
    key: "silver",
    name: "مدال نقره‌ای",
    emoji: "🥈",
    min: 750,
    grad: "from-slate-400 to-zinc-200",
    bg: "bg-gradient-to-bl from-slate-100/70 to-zinc-100/40 dark:from-slate-800/50 dark:to-zinc-900/40",
    border: "border-slate-400/40",
    text: "text-slate-600 dark:text-slate-200",
    caption: "سطحت بالا گرفته! چند قدم بیشتر تا مدال طلایی نمانده.",
  },
  {
    key: "gold",
    name: "مدال طلایی",
    emoji: "🥇",
    min: 1500,
    grad: "from-amber-500 to-yellow-300",
    bg: "bg-gradient-to-bl from-yellow-100/70 to-amber-100/40 dark:from-yellow-950/40 dark:to-amber-950/30",
    border: "border-amber-500/45",
    text: "text-amber-700 dark:text-amber-300",
    caption: "عملکرد چشمگیری داری! مدال پلاتینی در انتظارت است.",
  },
  {
    key: "platinum",
    name: "مدال پلاتینی",
    emoji: "💎",
    min: 2600,
    grad: "from-cyan-500 to-teal-300",
    bg: "bg-gradient-to-bl from-cyan-100/70 to-teal-100/40 dark:from-cyan-950/40 dark:to-teal-950/30",
    border: "border-cyan-500/40",
    text: "text-cyan-700 dark:text-cyan-300",
    caption: "تو جزو کاربران حرفه‌ای آزمـیار هستی! تا نشان افسانه‌ای ادامه بده.",
  },
  {
    key: "legend",
    name: "افسانه آزمایشگاه",
    emoji: "👑",
    min: 4200,
    grad: "from-violet-500 to-fuchsia-400",
    bg: "bg-gradient-to-bl from-violet-100/70 to-fuchsia-100/40 dark:from-violet-950/40 dark:to-fuchsia-950/30",
    border: "border-violet-500/45",
    text: "text-violet-700 dark:text-violet-300",
    caption: "بالاترین نشان آزمـیار! افتخار ما هستی — پشتکار‌ت را نگه دار.",
  },
];

export interface Activity {
  points: number;
  // raw counts
  readCount: number;
  cardsSeen: number;
  cardsOk: number;
  mastered: number; // cards in box 4+
  quizRuns: number;
  quizAvg: number; // 0..100
  quizBest: number;
  // point breakdown
  studyPts: number;
  cardPts: number;
  quizPts: number;
  tier: MedalTier;
  tierIndex: number;
  next: MedalTier | null;
  nextGap: number; // points still needed for the next medal (0 at max)
  progress: number; // 0..1 inside the current tier
}

export function computeActivity(
  leitner: Record<string, { box?: number; seen?: number; ok?: number }>,
  quizHistory: QuizRun[],
  readCount: number
): Activity {
  let cardsSeen = 0;
  let cardsOk = 0;
  let mastered = 0;
  for (const s of Object.values(leitner ?? {})) {
    if (!s) continue;
    cardsSeen += Number(s.seen) || 0;
    cardsOk += Number(s.ok) || 0;
    if ((Number(s.box) || 0) >= 4) mastered++;
  }
  const pcts = (quizHistory ?? []).map((r) =>
    r && r.total > 0 ? Math.max(0, Math.min(100, Math.round((r.score / r.total) * 100))) : 0
  );
  const quizRuns = pcts.length;
  const quizAvg = quizRuns ? Math.round(pcts.reduce((a, b) => a + b, 0) / quizRuns) : 0;
  const quizBest = quizRuns ? Math.max(...pcts) : 0;

  // transparent scoring: study 5/lesson, review 2/card, +5 per mastered card,
  // quizzes 10/run plus up to 25 bonus from the average score — deliberately
  // slow so a medal always reflects sustained effort, not two quick quizzes
  const studyPts = readCount * 5;
  const cardPts = cardsSeen * 2 + mastered * 5;
  const quizPts = quizRuns * 10 + Math.round((quizAvg / 100) * 25);
  const points = studyPts + cardPts + quizPts;

  let tierIndex = 0;
  for (let i = 0; i < MEDAL_TIERS.length; i++) {
    if (points >= MEDAL_TIERS[i].min) tierIndex = i;
  }
  const tier = MEDAL_TIERS[tierIndex];
  const next = tierIndex + 1 < MEDAL_TIERS.length ? MEDAL_TIERS[tierIndex + 1] : null;
  const nextGap = next ? Math.max(0, next.min - points) : 0;
  const progress = next ? Math.max(0, Math.min(1, (points - tier.min) / (next.min - tier.min))) : 1;

  return {
    points,
    readCount,
    cardsSeen,
    cardsOk,
    mastered,
    quizRuns,
    quizAvg,
    quizBest,
    studyPts,
    cardPts,
    quizPts,
    tier,
    tierIndex,
    next,
    nextGap,
    progress,
  };
}

/** live activity + medal derived from the app store */
export function useActivityMedal(): Activity {
  const leitner = useAppStore((s) => s.leitner);
  const quizHistory = useAppStore((s) => s.quizHistory);
  const read = useAppStore((s) => s.read);
  return useMemo(
    () => computeActivity(leitner, quizHistory, read.length),
    [leitner, quizHistory, read]
  );
}
