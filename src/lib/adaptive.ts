// Adaptive question engine (v1.3).
//
// Instead of a plain random quiz, questions are picked by:
//  - per-category weakness (card mastery + quiz accuracy blended)
//  - per-question spaced repetition (a wrong answer re-asks in 10 minutes,
//    correct answers push the question days away via Q_INTERVALS)
//  - past mistakes (a question the user got wrong keeps coming back sooner)
//  - a gradually rising difficulty ramp inside every session
//    (warm-up → core → stretch)
import type { AppData, Question } from "./types";
import type { LeitnerState, QuestionStat } from "./store";

export const TIER_LABELS = ["", "پایه", "متوسط", "پیشرفته"];

export interface CatPerf {
  cat: string;
  /** quiz answers seen in this cat */
  attempts: number;
  /** quiz accuracy 0..100 (50 when there is no data yet) */
  acc: number;
  /** card mastery 0..1 (0 when the cat has no cards) */
  mastery: number;
  /** 0..1 — higher means the user needs more practice here */
  weakness: number;
}

/** blend quiz accuracy and Leitner card mastery into a single weakness score per cat */
export function categoryPerformance(
  data: Pick<AppData, "questions" | "cards">,
  leitner: Record<string, LeitnerState>,
  qstats: Record<string, QuestionStat>
): Map<string, CatPerf> {
  const attempts = new Map<string, { n: number; ok: number }>();
  for (const q of data.questions) {
    const s = qstats[q.id];
    if (!s || s.seen === 0) continue;
    const a = attempts.get(q.cat) ?? { n: 0, ok: 0 };
    a.n += s.seen;
    a.ok += s.ok;
    attempts.set(q.cat, a);
  }
  const cardAgg = new Map<string, { total: number; seen: number; boxSum: number }>();
  for (const c of data.cards) {
    const g = cardAgg.get(c.cat) ?? { total: 0, seen: 0, boxSum: 0 };
    g.total += 1;
    const st = leitner[c.id];
    if (st && st.box > 0) {
      g.seen += 1;
      g.boxSum += st.box;
    }
    cardAgg.set(c.cat, g);
  }
  const cats = new Set<string>([...data.questions.map((q) => q.cat), ...data.cards.map((c) => c.cat)]);
  const out = new Map<string, CatPerf>();
  for (const cat of cats) {
    const a = attempts.get(cat);
    const acc = a && a.n > 0 ? Math.round((a.ok / a.n) * 100) : 50;
    const g = cardAgg.get(cat);
    const mastery = g && g.total > 0 && g.seen > 0 ? g.boxSum / (g.total * 5) : 0;
    // unknown cats sit in the middle so new material still flows in
    const quizWeak = a && a.n >= 4 ? 1 - acc / 100 : 0.5;
    const cardWeak = g && g.total > 0 ? 1 - mastery : 0.5;
    const weakness = a || g ? Math.max(0, Math.min(1, 0.55 * quizWeak + 0.45 * cardWeak)) : 0.5;
    out.set(cat, { cat, attempts: a?.n ?? 0, acc, mastery, weakness });
  }
  return out;
}

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 14), 1)) >>> 0;
    return t / 4294967296;
  };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export interface AdaptiveOpts {
  pool: Question[];
  count: number;
  qstats: Record<string, QuestionStat>;
  mistakes: Record<string, number>;
  perf: Map<string, CatPerf>;
  seed: number;
  now?: number;
}

/**
 * Pick `count` questions from `pool`, weighted toward what the user is weak at
 * and what is due for review, then ordered so each session ramps up in
 * difficulty: ~30% warm-up (already partly mastered), ~45% core (due/weak),
 * ~25% stretch (fresh material from weak cats).
 */
export function pickAdaptiveQuestions(o: AdaptiveOpts): Question[] {
  const now = o.now ?? Date.now();
  const rng = mulberry(o.seed);
  const scored = o.pool.map((q) => {
    const st = o.qstats[q.id];
    const w = o.perf.get(q.cat)?.weakness ?? 0.5;
    let s = 1 + 2.2 * w;
    if (st) {
      const overdue = st.due > 0 && st.due <= now;
      if (overdue) s += 3 + Math.min(2, (now - st.due) / 86400000); // spaced repetition
      else s *= 0.25; // not yet due — let it rest
      const m = o.mistakes[q.id] ?? 0;
      if (m > 0) s += 1.2 * Math.min(m, 3); // mistakes keep coming back
      if (st.box >= 4) s *= 0.35; // nearly mastered — rare polish only
    } else {
      s += 0.8; // fresh material
    }
    return { q, st, s };
  });
  scored.sort((a, b) => b.s - a.s);
  const cands = scored.slice(0, Math.max(o.count * 2, o.count));

  const warmQ = cands.filter((c) => c.st && c.st.box >= 2).map((c) => c.q);
  const coreQ = cands.filter((c) => c.st && c.st.box < 2).map((c) => c.q);
  const freshQ = cands.filter((c) => !c.st).map((c) => c.q);
  const buckets: Question[][] = [warmQ, coreQ, freshQ];
  const quota = [Math.round(o.count * 0.3), Math.round(o.count * 0.45), Math.round(o.count * 0.25)];

  const order: Question[] = [];
  const seen = new Set<string>();
  const push = (arr: Question[], k: number) => {
    for (const q of shuffle(arr, rng)) {
      if (order.length >= o.count || k <= 0 || seen.has(q.id)) continue;
      order.push(q);
      seen.add(q.id);
      k--;
    }
  };
  buckets.forEach((b, i) => push(b, quota[i]));
  // back-fill from whichever bucket still has material
  for (const b of buckets) {
    if (order.length >= o.count) break;
    push(b, o.count - order.length);
  }
  return order.slice(0, Math.max(1, Math.min(o.count, o.pool.length)));
}
