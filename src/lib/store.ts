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
  quizHistory: QuizRun[];
  mistakes: Record<string, number>;
  settings: Settings;
  toggleFav: (id: string) => void;
  markRead: (id: string) => void;
  setLastTest: (id: string) => void;
  answerCard: (id: string, good: boolean) => void;
  addQuizRun: (run: QuizRun) => void;
  addMistake: (qid: string) => void;
  clearMistakes: () => void;
  setSettings: (s: Partial<Settings>) => void;
  resetLeitner: () => void;
  resetAll: () => void;
  /** merge leitner progress synced from the Android home-screen widget (per-card last-write-wins) */
  mergeLeitnerFromWidget: (native: Record<string, Partial<LeitnerState>>) => void;
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
  out.settings =
    st.settings && typeof st.settings === "object"
      ? { ...DEFAULT_SETTINGS, ...st.settings, fontSize: st.settings.fontSize ?? "md", dailyCards: Number(st.settings.dailyCards) || 10, theme: st.settings.theme === "dark" || st.settings.theme === "light" ? st.settings.theme : "system" }
      : DEFAULT_SETTINGS;
  return out;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      favorites: [],
      read: [],
      lastTest: null,
      leitner: {},
      quizHistory: [],
      mistakes: {},
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
      clearMistakes: () => set({ mistakes: {} }),
      setSettings: (s) => set((st) => ({ settings: { ...st.settings, ...s } })),
      resetLeitner: () => set({ leitner: {} }),
      resetAll: () =>
        set({ favorites: [], read: [], lastTest: null, leitner: {}, quizHistory: [], mistakes: {} }),
      mergeLeitnerFromWidget: (native) =>
        set((st) => {
          if (!native || typeof native !== "object") return st;
          const merged = { ...st.leitner };
          let changed = false;
          for (const [id, nv] of Object.entries(native)) {
            if (!nv || typeof nv !== "object" || typeof nv.due !== "number" || typeof nv.box !== "number") continue;
            const cur = merged[id];
            const nUpd = typeof nv.updatedAt === "number" ? nv.updatedAt : 0;
            const cUpd = cur?.updatedAt ?? 0;
            if (!cur || nUpd > cUpd) {
              merged[id] = {
                box: nv.box,
                due: nv.due,
                seen: cur?.seen ?? 0,
                ok: cur?.ok ?? 0,
                updatedAt: nUpd || Date.now(),
              };
              changed = true;
            }
          }
          return changed ? { leitner: merged } : st;
        }),
    }),
    {
      name: "azmayar-store-v1",
      version: 2,
      migrate: (persisted) => sanitize(persisted as Partial<AppState>),
      merge: (persisted, current) => ({ ...current, ...sanitize(persisted as Partial<AppState>) }),
    }
  )
);

// Leitner intervals (days) for boxes 1..5
export const BOX_INTERVALS = [1, 3, 7, 14, 30];

export function cardDue(box: number, good: boolean): number {
  const now = Date.now();
  if (!good) return now + 10 * 60 * 1000; // re-ask in 10 minutes
  const days = BOX_INTERVALS[Math.min(5, box) - 1] ?? 1;
  return now + days * 24 * 60 * 60 * 1000;
}

export function boxLabel(box: number): string {
  return ["جدید", "جعبه ۱", "جعبه ۲", "جعبه ۳", "جعبه ۴", "جعبه ۵"][box] ?? "جدید";
}
