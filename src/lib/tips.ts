// Personalized daily tips (v1.5): the pool is built ONLY from the user's chosen
// topics (studyGoal.focus) and the tip style follows the chosen goal —
// exam-style goals lean on question explanations, learning goals on card facts.
import type { AppData } from "./types";
import type { StudyGoalKey } from "./store";

export interface Tip {
  id: string;
  text: string;
  source: string;
  tid: string;
  kind: "card" | "expl";
}

/** interleave a and b taking aPerB items of a per one of b (weighted blend) */
function interleave(a: Tip[], b: Tip[], aPerB: number): Tip[] {
  const out: Tip[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    for (let k = 0; k < aPerB && i < a.length; k++) out.push(a[i++]);
    if (j < b.length) out.push(b[j++]);
    if (i >= a.length) while (j < b.length) out.push(b[j++]);
    if (j >= b.length) while (i < a.length) out.push(a[i++]);
  }
  return out;
}

export function buildTipPool(data: AppData, focus: string[] | null, goal: StudyGoalKey | null): Tip[] {
  const ok = (cat: string) => !focus || focus.length === 0 || focus.includes(cat);
  const testName = new Map<string, string>();
  for (const t of data.tests) testName.set(t.id, t.name);

  const cardTips: Tip[] = [];
  for (const c of data.cards) {
    if (!ok(c.cat)) continue;
    const back = (c.back ?? "").trim();
    if (!back) continue;
    const front = (c.front ?? "").replace(/[؟?+.:：\s]+$/, "").trim();
    const text = front ? `${front}: ${back}` : back;
    if (text.length < 15 || text.length > 220) continue;
    cardTips.push({ id: `card:${c.id}`, text, source: testName.get(c.tid) ?? "", tid: c.tid, kind: "card" });
  }

  const explTips: Tip[] = [];
  for (const q of data.questions) {
    if (!ok(q.cat)) continue;
    const e = (q.explanation ?? "").trim();
    if (e.length < 25 || e.length > 220) continue;
    explTips.push({ id: `expl:${q.id}`, text: e, source: testName.get(q.tid) ?? "", tid: q.tid, kind: "expl" });
  }

  // exam-style goals (uni/hire/msc) → 2 explanations per card tip; learning goals → the reverse
  const examStyle = goal === "hire" || goal === "msc" || goal === "uni";
  const mixed = examStyle ? interleave(explTips, cardTips, 2) : interleave(cardTips, explTips, 2);

  // de-duplicate identical texts (cards and questions can share phrasing)
  const seen = new Set<string>();
  const pool: Tip[] = [];
  for (const t of mixed) {
    const key = t.text.slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);
    pool.push(t);
    if (pool.length >= 400) break;
  }
  return pool;
}

/** deterministic per-day pick; offset>0 = "نکته بعدی" within the same day */
export function pickDailyTip(pool: Tip[], offset = 0): Tip | null {
  if (!pool.length) return null;
  const day = Math.floor(Date.now() / 86400000);
  return pool[((day + offset) % pool.length + pool.length) % pool.length];
}
