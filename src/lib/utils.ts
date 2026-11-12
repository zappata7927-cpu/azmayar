import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Convert Latin digits to Persian digits — safe against null/undefined/NaN. */
export function faNum(n: number | string | null | undefined): string {
  if (n === null || n === undefined) return "";
  const s = typeof n === "number" && Number.isNaN(n) ? "۰" : String(n);
  return s.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}
