"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface LeitnerState {
  box: number; // 1..5
  due: number; // epoch ms
  seen: number;
  ok: number;
  /** last modification time (epoch ms) — used to merge app↔widget edits */
  updatedAt?: number;
}

export interface QuizRun {
  at: number;
  score: number;
  total: number;
  label: string;
}

/** per-question spaced-repetition state (like Leitner, but for quiz questions) */
export interface QuestionStat {
  box: number; // 1..5 mastery box
  due: number; // epoch ms — when the question should be re-asked
  seen: number;
  ok: number;
  /** difficulty tier 1..3 — grows gradually as the question is mastered */
  tier: number;
  updatedAt: number;
}

export type StudyGoalKey = "uni" | "hire" | "msc" | "basics" | "pro";

export const GOAL_KEYS: StudyGoalKey[] = ["uni", "hire", "msc", "basics", "pro"];

export interface StudyGoal {
  goal: StudyGoalKey | null;
  /** exam date "YYYY-MM-DD" (only for exam-style goals) */
  examDate: string | null;
  /** topic filter: category names the plan/tips/quiz scope to; null or empty = all topics */
  focus: string[] | null;
}

export const GOAL_TITLES: Record<StudyGoalKey, string> = {
  uni: "امتحانات دانشگاه",
  hire: "آزمون استخدامی",
  msc: "آزمون کارشناسی ارشد",
  basics: "مرور دروس پایه",
  pro: "ارتقای دانش تخصصی",
};

export interface Settings {
  fontSize: "sm" | "md" | "lg" | "xl";
  dailyCards: number;
  theme: "light" | "dark" | "system";
}

interface AppState {
  favorites: string[];
  read: string[];
  lastTest: string | null;
  leitner: Record<string, LeitnerState>;
  /** epoch ms of the last deliberate Leitner reset — widget snapshots older than
   *  this are stale and must never resurrect cleared progress */
  leitnerResetAt: number;
  quizHistory: QuizRun[];
  mistakes: Record<string, number>;
  /** per-question spaced repetition + weakness tracking (adaptive quiz engine) */
  qstats: Record<string, QuestionStat>;
  studyGoal: StudyGoal;
  /** "YYYY-MM-DD" → ids of today-plan items the user checked off */
  planDone: Record<string, string[]>;
  settings: Settings;
  toggleFav: (id: string) => void;
  markRead: (id: string) => void;
  setLastTest: (id: string) => void;
  answerCard: (id: string, good: boolean) => void;
  addQuizRun: (run: QuizRun) => void;
  addMistake: (qid: string) => void;
  removeMistake: (qid: string) => void;
  /** record one quiz answer into the per-question spaced-repetition state */
  answerQuestion: (id: string, good: boolean) => void;
  setStudyGoal: (g: Partial<StudyGoal>) => void;
  togglePlanItem: (itemId: string) => void;
  clearMistakes: () => void;
  setSettings: (s: Partial<Settings>) => void;
  resetLeitner: () => void;
  resetAll: () => void;
  /** merge leitner progress synced from the Android home-screen widget (per-card last-write-wins);
   *  returns the number of cards actually updated from the widget */
  mergeLeitnerFromWidget: (native: Record<string, Partial<LeitnerState>>) => number;
}

const DEFAULT_SETTINGS: Settings = { fontSize: "md", dailyCards: 10, theme: "system" };

// Sanitize any persisted (possibly old or corrupt) state so a bad shape can never crash the app.
function sanitize(st: Partial<AppState> | undefined): Partial<AppState> {
  if (!st || typeof st !== "object") return {};
  const out: Partial<AppState> = {};
  out.favorites = Array.isArray(st.favorites) ? st.favorites.filter((x) => typeof x === "string") : [];
  out.read = Array.isArray(st.read) ? st.read.filter((x) => typeof x === "string") : [];
  out.lastTest = typeof st.lastTest === "string" ? st.lastTest : null;
  const leitner: Record<string, LeitnerState> = {};
  if (st.leitner && typeof st.leitner === "object") {
    for (const [k, v] of Object.entries(st.leitner)) {
      if (v && typeof v === "object" && typeof (v as LeitnerState).due === "number") {
        leitner[k] = {
          box: Number((v as LeitnerState).box) || 0,
          due: (v as LeitnerState).due,
          seen: Number((v as LeitnerState).seen) || 0,
          ok: Number((v as LeitnerState).ok) || 0,
          updatedAt: typeof (v as LeitnerState).updatedAt === "number" ? (v as LeitnerState).updatedAt : undefined,
        };
      }
    }
  }
  out.leitner = leitner;
  out.leitnerResetAt = typeof st.leitnerResetAt === "number" ? st.leitnerResetAt : 0;
  out.quizHistory = Array.isArray(st.quizHistory)
    ? st.quizHistory
        .filter((r) => r && typeof r === "object" && typeof r.score === "number" && typeof r.total === "number")
        .map((r) => ({ at: typeof r.at === "number" ? r.at : Date.now(), score: r.score, total: r.total || 1, label: typeof r.label === "string" ? r.label : "آزمون" }))
    : [];
  const mistakes: Record<string, number> = {};
  if (Array.isArray(st.mistakes)) {
    // tolerate old format (array of ids)
    for (const id of st.mistakes) if (typeof id === "string") mistakes[id] = 1;
  } else if (st.mistakes && typeof st.mistakes === "object") {
    for (const [k, v] of Object.entries(st.mistakes)) if (typeof v === "number") mistakes[k] = v;
  }
  out.mistakes = mistakes;
  const qstats: Record<string, QuestionStat> = {};
  if (st.qstats && typeof st.qstats === "object") {
    for (const [k, v] of Object.entries(st.qstats)) {
      const qv = v as QuestionStat;
      if (qv && typeof qv === "object" && typeof qv.due === "number") {
        qstats[k] = {
          box: Math.max(0, Math.min(5, Number(qv.box) || 0)),
          due: qv.due,
          seen: Number(qv.seen) || 0,
          ok: Number(qv.ok) || 0,
          tier: Math.max(1, Math.min(3, Number(qv.tier) || 1)),
          updatedAt: typeof qv.updatedAt === "number" ? qv.updatedAt : 0,
        };
      }
    }
  }
  out.qstats = qstats;
  out.studyGoal = {
    goal:
      st.studyGoal && typeof st.studyGoal === "object" && GOAL_KEYS.includes(st.studyGoal.goal as StudyGoalKey)
        ? (st.studyGoal.goal as StudyGoalKey)
        : null,
    examDate:
      st.studyGoal && typeof st.studyGoal === "object" && typeof st.studyGoal.examDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(st.studyGoal.examDate)
        ? st.studyGoal.examDate
        : null,
    focus:
      st.studyGoal && typeof st.studyGoal === "object" && Array.isArray(st.studyGoal.focus)
        ? st.studyGoal.focus.filter((x) => typeof x === "string" && x).slice(0, 30)
        : null,
  };
  const planDone: Record<string, string[]> = {};
  if (st.planDone && typeof st.planDone === "object") {
    for (const [k, v] of Object.entries(st.planDone)) {
      if (Array.isArray(v)) planDone[k] = v.filter((x) => typeof x === "string").slice(0, 30);
    }
  }
  out.planDone = planDone;
  out.settings =
    st.settings && typeof st.settings === "object"
      ? { ...DEFAULT_SETTINGS, ...st.settings, fontSize: st.settings.fontSize ?? "md", dailyCards: Number(st.settings.dailyCards) || 10, theme: st.settings.theme === "dark" || st.settings.theme === "light" ? st.settings.theme : "system" }
      : DEFAULT_SETTINGS;
  return out;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      favorites: [],
      read: [],
      lastTest: null,
      leitner: {},
      leitnerResetAt: 0,
      quizHistory: [],
      mistakes: {},
      qstats: {},
      studyGoal: { goal: null, examDate: null, focus: null },
      planDone: {},
      settings: DEFAULT_SETTINGS,
      toggleFav: (id) =>
        set((st) => ({
          favorites: st.favorites.includes(id)
            ? st.favorites.filter((x) => x !== id)
            : [...st.favorites, id],
        })),
      markRead: (id) =>
        set((st) => (st.read.includes(id) ? st : { read: [...st.read, id], lastTest: id })),
      setLastTest: (id) => set({ lastTest: id }),
      answerCard: (id, good) =>
        set((st) => {
          const cur = st.leitner[id] ?? { box: 0, due: 0, seen: 0, ok: 0 };
          const nextBox = good ? Math.min(5, cur.box + 1) : 1;
          return {
            leitner: {
              ...st.leitner,
              [id]: {
                box: nextBox,
                due: cardDue(nextBox, good),
                seen: cur.seen + 1,
                ok: cur.ok + (good ? 1 : 0),
                updatedAt: Date.now(),
              },
            },
          };
        }),
      addQuizRun: (run) => set((st) => ({ quizHistory: [run, ...st.quizHistory].slice(0, 40) })),
      addMistake: (qid) =>
        set((st) => ({ mistakes: { ...st.mistakes, [qid]: (st.mistakes[qid] ?? 0) + 1 } })),
      removeMistake: (qid) =>
        set((st) => {
          if (!(qid in st.mistakes)) return st;
          const mistakes = { ...st.mistakes };
          delete mistakes[qid];
          return { mistakes };
        }),
      answerQuestion: (id, good) =>
        set((st) => {
          const cur = st.qstats[id] ?? { box: 0, due: 0, seen: 0, ok: 0, tier: 1, updatedAt: 0 };
          const now = Date.now();
          // mastery box climbs on correct answers; a miss drops the question back to
          // box 1 and re-asks it in 10 minutes. The difficulty tier rises gradually
          // (1→2 at box 3, 2→3 at box 5) so hard material appears over time.
          const box = good ? Math.min(5, cur.box + 1) : 1;
          let tier = cur.tier;
          if (good && box >= 3 && tier < 2) tier = 2;
          if (good && box >= 5 && tier < 3) tier = 3;
          const days = Q_INTERVALS[Math.min(5, box) - 1] ?? 1;
          const due = good ? now + days * 86400000 : now + 10 * 60 * 1000;
          return {
            qstats: {
              ...st.qstats,
              [id]: { box, due, seen: cur.seen + 1, ok: cur.ok + (good ? 1 : 0), tier, updatedAt: now },
            },
          };
        }),
      setStudyGoal: (g) => set((st) => ({ studyGoal: { ...st.studyGoal, ...g } })),
      togglePlanItem: (itemId) =>
        set((st) => {
          const key = planDayKey();
          const cur = st.planDone[key] ?? [];
          const next = cur.includes(itemId) ? cur.filter((x) => x !== itemId) : [...cur, itemId];
          return { planDone: { ...st.planDone, [key]: next } };
        }),
      clearMistakes: () => set({ mistakes: {} }),
      setSettings: (s) => set((st) => ({ settings: { ...st.settings, ...s } })),
      resetLeitner: () => set({ leitner: {}, leitnerResetAt: Date.now() }),
      resetAll: () =>
        set({ favorites: [], read: [], lastTest: null, leitner: {}, leitnerResetAt: Date.now(), quizHistory: [], mistakes: {}, qstats: {}, planDone: {} }),
      mergeLeitnerFromWidget: (native) => {
        if (!native || typeof native !== "object") return 0;
        const st = get();
        const resetAt = st.leitnerResetAt ?? 0;
        const merged = { ...st.leitner };
        let count = 0;
        for (const [id, nv] of Object.entries(native)) {
          if (!nv || typeof nv !== "object" || typeof nv.due !== "number" || typeof nv.box !== "number") continue;
          const cur = merged[id];
          const nUpd = typeof nv.updatedAt === "number" ? nv.updatedAt : 0;
          const cUpd = cur?.updatedAt ?? 0;
          // a deliberate app-side reset tombstones everything older than it: a stale
          // widget snapshot (or the widget's pre-reset copy) must never come back
          if (resetAt > 0 && nUpd <= resetAt) continue;
          if (!cur || nUpd > cUpd) {
            merged[id] = {
              box: nv.box,
              due: nv.due,
              seen: cur?.seen ?? 0,
              ok: cur?.ok ?? 0,
              updatedAt: nUpd || Date.now(),
            };
            count++;
          }
        }
        if (count > 0) set({ leitner: merged });
        return count;
      },
    }),
    {
      name: "azmayar-store-v1",
      version: 3,
      migrate: (persisted) => sanitize(persisted as Partial<AppState>),
      merge: (persisted, current) => ({ ...current, ...sanitize(persisted as Partial<AppState>) }),
    }
  )
);

// Leitner intervals (days) for boxes 1..5
export const BOX_INTERVALS = [1, 3, 7, 14, 30];

// Question spaced-repetition intervals (days) for boxes 1..5 — a question the
// user keeps getting right is re-asked after an ever longer gap
export const Q_INTERVALS = [1, 2, 4, 7, 14];

/** local "YYYY-MM-DD" key for the today-plan checklist */
export function planDayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function cardDue(box: number, good: boolean): number {
  const now = Date.now();
  if (!good) return now + 10 * 60 * 1000; // re-ask in 10 minutes
  const days = BOX_INTERVALS[Math.min(5, box) - 1] ?? 1;
  return now + days * 24 * 60 * 60 * 1000;
}

export function boxLabel(box: number): string {
  return ["جدید", "جعبه ۱", "جعبه ۲", "جعبه ۳", "جعبه ۴", "جعبه ۵"][box] ?? "جدید";
}
