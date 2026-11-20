"use client";

import type { AppData, Question } from "./types";
import { useAppStore } from "./store";

export type QuizMode =
  | { kind: "cat"; cat: string }
  | { kind: "group"; group: string }
  | { kind: "all" }
  | { kind: "mistakes" };

export interface QuizSession {
  questions: Question[];
  label: string;
}

function shuffle<T>(arr: T[], seed: number): T[] {
  const rng = mulberry(seed);
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildQuiz(
  data: AppData,
  mode: QuizMode,
  count: number,
  onlyRead: boolean
): QuizSession {
  // Keep only well-formed questions so a malformed record can never break a quiz session.
  const valid = (data.questions ?? []).filter(
    (q) => q && typeof q.q === "string" && q.q.trim() && Array.isArray(q.options) && q.options.length >= 2
  );  let pool: Question[] = [];
  let label = "";
  if (mode.kind === "cat") {
    pool = valid.filter((q) => q.cat === mode.cat);
    label = mode.cat;
  } else if (mode.kind === "group") {
    const cats = new Set((data.categories ?? []).filter((c) => c.group === mode.group).map((c) => c.name));
    pool = valid.filter((q) => cats.has(q.cat));
    label = `مجموعه ${mode.group}`;
  } else if (mode.kind === "mistakes") {
    const { mistakes } = useAppStore.getState();
    const ids = new Set(Object.keys(mistakes ?? {}));
    pool = valid.filter((q) => ids.has(q.id));
    label = "مرور خطاها";
  } else {
    pool = valid;
    label = "آزمون جامع";
  }
  if (onlyRead) {
    const { read } = useAppStore.getState();
    const readSet = new Set(Array.isArray(read) ? read : []);
    const filtered = pool.filter((q) => readSet.has(q.tid));
    if (filtered.length >= Math.min(count, 4)) pool = filtered;
  }
  const seed = Date.now() % 100000000;
  const shuffled = shuffle(pool, seed);
  // Randomly permute the options of every picked question so the correct answer is not
  // always in the same letter (the bank had ~73% of correct answers in option «الف»).
  const rng = mulberry(seed ^ 0x9e3779b9);
  const questions = shuffled.slice(0, Math.max(1, count)).map((q) => shuffleQuestionOptions(q, rng));
  return { questions, label };
}

// Options that cross-reference other options by letter («گزینه الف و ب …») must keep
// their original order, otherwise the reference would point at a different option.
const OPTION_REF_RE = /گزینه\s*(?:های)?\s*[الف-وى]|(?:^|\s)[الف-وى]\s*(?:و|،|\/)\s*[الف-وى]\s*(?:صحیح|درست)/;

function shuffleQuestionOptions(q: Question, rng: () => number): Question {
  const opts = q.options;
  if (!Array.isArray(opts) || opts.length < 2) return q;
  const answer = Number.isInteger(q.answer) && q.answer >= 0 && q.answer < opts.length ? q.answer : 0;
  if (opts.some((o) => OPTION_REF_RE.test(String(o ?? "")))) return q;
  const order = opts.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { ...q, options: order.map((i) => opts[i]), answer: order.indexOf(answer) };
}

export function quizCountsFor(data: AppData): Record<string, number> {
  const out: Record<string, number> = {};
  for (const q of data.questions) out[q.cat] = (out[q.cat] ?? 0) + 1;
  return out;
}
