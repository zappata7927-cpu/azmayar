// ---------- Data types parsed from the lab database ----------
export type ItemKind = "bullet" | "num" | "sub" | "image";

export interface SectionItem {
  kind: ItemKind;
  n?: number;
  text: string;
}

export interface ValueRow {
  group: string;
  value: string;
}

export interface Section {
  type:
    | "abbr"
    | "full_name"
    | "aka"
    | "physiology"
    | "clinical"
    | "sampling"
    | "storage"
    | "interference"
    | "drugs_up"
    | "drugs_down"
    | "increase"
    | "decrease"
    | "normal"
    | "critical"
    | "abnormal"
    | "note"
    | "other";
  title?: string;
  unit?: string;
  rows?: ValueRow[];
  items?: SectionItem[];
  paras?: string[];
}

export interface TestRecord {
  id: string;
  cat: string;
  name: string;
  short: string;
  sections: Section[];
}

export interface Category {
  name: string;
  group: string;
  count: number;
  order: number;
}

export interface FlashCard {
  id: string;
  tid: string;
  cat: string;
  type: "abbr" | "normal" | "critical" | "increase" | "decrease" | "note" | "storage";
  front: string;
  back: string;
}

export interface Question {
  id: string;
  type: "abbr" | "full" | "normal" | "critical" | "increase" | "decrease";
  tid: string;
  cat: string;
  q: string;
  options: string[];
  answer: number;
  explanation: string;
}

export interface AppData {
  tests: TestRecord[];
  categories: Category[];
  cards: FlashCard[];
  questions: Question[];
  sources: string[];
}

// ---------- base path (set at build time for GitHub Pages) ----------
export const BASE_PATH: string = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function assetUrl(p: string): string {
  return `${BASE_PATH}${p}`;
}

let cache: AppData | null = null;

export async function loadAppData(): Promise<AppData> {
  if (cache) return cache;
  const [tests, categories, cards, questions, sources] = await Promise.all([
    fetch(assetUrl("/data/tests.json")).then((r) => r.json()),
    fetch(assetUrl("/data/categories.json")).then((r) => r.json()),
    fetch(assetUrl("/data/cards.json")).then((r) => r.json()),
    fetch(assetUrl("/data/questions.json")).then((r) => r.json()),
    fetch(assetUrl("/data/sources.json")).then((r) => r.json()),
  ]);
  cache = { tests, categories, cards, questions, sources };
  return cache;
}

// ---------- text normalization for search ----------
const AR_MAP: Record<string, string> = { "ي": "ی", "ك": "ک", "أ": "ا", "إ": "ا", "ؤ": "و", "ۀ": "ه" };

export function normFa(s: string): string {
  let out = s || "";
  for (const [a, b] of Object.entries(AR_MAP)) out = out.split(a).join(b);
  return out.replace(/\u200c/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
}

export const GROUP_ORDER = [
  "بیوشیمی خون",
  "هورمون‌ها",
  "مارکرها",
  "ادرار و مایعات بدن",
  "هماتولوژی",
  "سرولوژی و میکروب‌شناسی",
  "انگل‌شناسی",
  "قارچ‌شناسی",
  "تجهیزات و تکنیک‌ها",
  "کنترل کیفیت",
];
