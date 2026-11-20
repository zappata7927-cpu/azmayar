// Jalali (Persian) calendar helpers.
// gregorian → jalali uses the platform's own `Intl` persian calendar (proven
// correct in Chrome/WebView/Node); jalali → gregorian walks the numeric gap and
// matches through `toJalali`, so the two directions are always consistent.

export interface JalaliDate {
  jy: number;
  jm: number; // 1..12
  jd: number; // 1..31
}

const DAY = 86400000;

const persianFmt = () =>
  new Intl.DateTimeFormat("en-u-ca-persian-nu-latn", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    timeZone: "UTC",
  });

/** UTC-noon anchor so a local date never drifts to the previous/next day */
const utcNoon = (d: Date) => new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12));

/** Gregorian Date → Jalali */
export function toJalali(d: Date): JalaliDate {
  const parts = persianFmt().formatToParts(utcNoon(d));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return { jy: get("year"), jm: get("month"), jd: get("day") };
}

/** cumulative day offset of each jalali month (approximate — only used as a
 *  monotone starting guess, never as the final answer) */
const CUM_DAYS = [0, 31, 62, 93, 124, 155, 186, 216, 246, 276, 306, 336];
const jalOrd = (jy: number, jm: number, jd: number) => (jy - 1) * 366 + CUM_DAYS[jm - 1] + jd;

/** Jalali → Gregorian Date (local midnight). An ordinal estimate lands within
 *  a few days, then a bounded ±1-day scan matches the exact date through
 *  toJalali, so both directions always agree. */
export function toGregorian(jy: number, jm: number, jd: number): Date {
  const target = jy * 10000 + jm * 100 + jd;
  let d = new Date(jy + 621, 2, 21); // ~1 Farvardin of the jalali year
  const j0 = toJalali(d);
  d = new Date(d.getTime() + (jalOrd(jy, jm, jd) - jalOrd(j0.jy, j0.jm, j0.jd)) * DAY);
  for (let i = 0; i < 100; i++) {
    const j = toJalali(d);
    const cur = j.jy * 10000 + j.jm * 100 + j.jd;
    if (cur === target) return d;
    d = new Date(d.getTime() + (target > cur ? DAY : -DAY));
  }
  return d;
}

export function jalaliMonthLength(jy: number, jm: number): number {
  const first = toGregorian(jy, jm, 1);
  const nm = jm === 12 ? { jy: jy + 1, jm: 1 } : { jy, jm: jm + 1 };
  const next = toGregorian(nm.jy, nm.jm, 1);
  return Math.round((next.getTime() - first.getTime()) / DAY);
}

export const JALALI_MONTHS = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
/** week columns start on شنبه */
export const JALALI_WEEKDAYS = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

/** column index (0 = شنبه) of a Date's weekday */
export function jalaliWeekday(d: Date): number {
  return (d.getDay() + 1) % 7;
}

export const faDigits = (s: string | number): string => String(s).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);

/** "2026-11-20" → "۱۴۰۵/۰۹/۲۹" */
export function formatJalali(iso: string | null | undefined): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const j = toJalali(new Date(y, m - 1, d));
  return faDigits(`${j.jy}/${String(j.jm).padStart(2, "0")}/${String(j.jd).padStart(2, "0")}`);
}

/** "2026-11-20" → "۲۹ آذر ۱۴۰۵" */
export function formatJalaliLong(iso: string | null | undefined): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const j = toJalali(new Date(y, m - 1, d));
  return `${faDigits(j.jd)} ${JALALI_MONTHS[j.jm - 1]} ${faDigits(j.jy)}`;
}

/** Jalali y/m/d → gregorian "YYYY-MM-DD" (for the persisted examDate field) */
export function jalaliToIso(jy: number, jm: number, jd: number): string {
  const g = toGregorian(jy, jm, jd);
  return `${g.getFullYear()}-${String(g.getMonth() + 1).padStart(2, "0")}-${String(g.getDate()).padStart(2, "0")}`;
}
