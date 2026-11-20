"use client";

import { useMemo, useState } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { JALALI_MONTHS, JALALI_WEEKDAYS, faDigits, jalaliMonthLength, jalaliToIso, toGregorian, toJalali, jalaliWeekday } from "@/lib/jalali";
import { cn } from "@/lib/utils";

/** A clean Jalali (Persian) month-grid calendar. Emits the persisted gregorian
 *  "YYYY-MM-DD" so the exam-date field stays locale-neutral. */
export function JalaliCalendar({ value, onChange }: { value: string | null; onChange: (iso: string | null) => void }) {
  const today = useMemo(() => toJalali(new Date()), []);
  const todayKey = today.jy * 10000 + today.jm * 100 + today.jd;

  const init = useMemo(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split("-").map(Number);
      return toJalali(new Date(y, m - 1, d));
    }
    return today;
  }, [value, today]);
  const [view, setView] = useState({ jy: init.jy, jm: init.jm });

  const selected = useMemo(() => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [y, m, d] = value.split("-").map(Number);
    return toJalali(new Date(y, m - 1, d));
  }, [value]);
  const selectedKey = selected ? selected.jy * 10000 + selected.jm * 100 + selected.jd : null;

  const moveMonth = (delta: number) => {
    setView((v) => {
      let jm = v.jm + delta;
      let jy = v.jy;
      if (jm < 1) {
        jm = 12;
        jy -= 1;
      }
      if (jm > 12) {
        jm = 1;
        jy += 1;
      }
      return { jy, jm };
    });
  };

  // month grid: leading blanks from the weekday of day 1 (شنبه-first)
  const len = jalaliMonthLength(view.jy, view.jm);
  const firstWeekday = jalaliWeekday(toGregorian(view.jy, view.jm, 1));
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: len }, (_, i) => i + 1),
  ];

  return (
    <div className="rounded-2xl border bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <button
          onClick={() => moveMonth(-1)}
          aria-label="ماه قبل"
          className="grid h-8 w-8 place-items-center rounded-xl bg-muted text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <div className="text-sm font-black">
          {JALALI_MONTHS[view.jm - 1]} {faDigits(view.jy)}
        </div>
        <button
          onClick={() => moveMonth(1)}
          aria-label="ماه بعد"
          className="grid h-8 w-8 place-items-center rounded-xl bg-muted text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1">
        {JALALI_WEEKDAYS.map((d, i) => (
          <div key={i} className={cn("py-1 text-center text-[11px] font-bold", i === 6 ? "text-rose-500" : "text-muted-foreground")}>
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((jd, i) => {
          if (jd === null) return <div key={`b${i}`} />;
          const key = view.jy * 10000 + view.jm * 100 + jd;
          const isToday = key === todayKey;
          const isSel = key === selectedKey;
          const isPast = key < todayKey;
          const isFri = i % 7 === 6;
          return (
            <button
              key={jd}
              disabled={isPast}
              onClick={() => onChange(jalaliToIso(view.jy, view.jm, jd))}
              className={cn(
                "grid h-9 place-items-center rounded-xl text-[13px] font-bold transition-colors",
                isPast && "text-muted-foreground/35",
                !isPast && !isSel && "hover:bg-primary/10 active:scale-95",
                isFri && !isSel && !isPast && "text-rose-500",
                isToday && !isSel && "border border-primary/50 text-primary",
                isSel && "bg-primary text-white shadow-sm"
              )}
            >
              {faDigits(jd)}
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="mt-2 flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2">
          <span className="text-xs font-bold text-primary">
            {selected.jd} {JALALI_MONTHS[selected.jm - 1]} {faDigits(selected.jy)}
          </span>
          <button onClick={() => onChange(null)} className="text-[11px] font-bold text-rose-500">
            حذف انتخاب
          </button>
        </div>
      )}
    </div>
  );
}
