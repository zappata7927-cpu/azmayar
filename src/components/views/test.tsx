"use client";

import { useEffect, useMemo, useRef } from "react";
import { Star, ChevronLeft, Type, FlaskConical } from "lucide-react";
import type { AppData } from "@/lib/types";
import type { Route } from "@/lib/nav";
import { useAppStore } from "@/lib/store";
import { SectionList } from "@/components/section-renderer";
import { faNum } from "@/lib/utils";
import { cn } from "@/lib/utils";

const FONT_SIZES = { sm: "15px", md: "16.5px", lg: "18px", xl: "20px" };

export function TestView({ data, id, navigate }: { data: AppData; id: string; navigate: (r: Route) => void }) {
  const { favorites, toggleFav, markRead, settings, setSettings } = useAppStore();
  const test = useMemo(() => data.tests.find((t) => t.id === id), [data, id]);
  const marked = useRef(false);

  useEffect(() => {
    if (test && !marked.current) {
      marked.current = true;
      markRead(test.id);
    }
  }, [test, markRead]);

  const { cat, siblings, index } = useMemo(() => {
    if (!test) return { cat: "", siblings: [] as typeof data.tests, index: 0 };
    const sib = data.tests.filter((t) => t.cat === test.cat);
    return { cat: test.cat, siblings: sib, index: sib.findIndex((t) => t.id === test.id) };
  }, [data, test]);

  if (!test) {
    return <p className="py-16 text-center text-sm text-muted-foreground">این مطلب یافت نشد</p>;
  }

  const fav = favorites.includes(test.id);
  const prev = index > 0 ? siblings[index - 1] : null;
  const next = index < siblings.length - 1 ? siblings[index + 1] : null;

  return (
    <div className="space-y-4">
      {/* header card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-bl from-teal-700 via-teal-600 to-teal-500 p-5 text-white shadow-lg">
        <div className="absolute -left-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-xl" />
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="inline-block rounded-xl bg-white/15 px-2.5 py-1 text-[11px] font-bold">{cat}</span>
              <h1 className="mt-2.5 text-[1.4rem] font-black leading-8">{test.name}</h1>
              {test.short && (
                <span className="mt-2 inline-block rounded-xl bg-white/15 px-3 py-1 text-sm font-bold tracking-wide" dir="ltr">
                  {test.short}
                </span>
              )}
            </div>
            <button
              onClick={() => toggleFav(test.id)}
              aria-label={fav ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/15 transition-colors hover:bg-white/25"
            >
              <Star className={cn("h-5 w-5", fav ? "fill-amber-300 text-amber-300" : "text-white")} />
            </button>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-teal-50/80">
            <span>
              مطلب {faNum(index + 1)} از {faNum(siblings.length)} در این دسته
            </span>
            <span className="flex items-center gap-1">
              <FlaskConical className="h-3.5 w-3.5" />
              آزمـیار
            </span>
          </div>
        </div>
      </div>

      {/* font size quick control */}
      <div className="flex items-center justify-between rounded-2xl border bg-card px-3 py-2 shadow-sm">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <Type className="h-4 w-4" /> اندازه متن
        </span>
        <div className="flex items-center gap-1.5">
          {(["sm", "md", "lg", "xl"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setSettings({ fontSize: f })}
              aria-label={`اندازه ${f}`}
              className={cn(
                "h-8 rounded-lg px-2 font-bold transition-colors",
                f === "sm" && "text-[11px]", f === "md" && "text-xs", f === "lg" && "text-sm", f === "xl" && "text-base",
                settings.fontSize === f ? "bg-primary text-white" : "bg-muted text-muted-foreground"
              )}
            >
              آ
            </button>
          ))}
        </div>
      </div>

      {/* sections */}
      <div style={{ fontSize: FONT_SIZES[settings.fontSize] }}>
        <SectionList sections={test.sections} />
      </div>

      {/* prev / next */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        {prev ? (
          <button
            onClick={() => navigate({ v: "test", id: prev.id })}
            className="flex items-center gap-2 rounded-2xl border bg-card p-3 text-right shadow-sm transition-transform active:scale-[0.98]"
          >
            <ChevronLeft className="h-4 w-4 shrink-0 rotate-180" />
            <span className="min-w-0">
              <span className="block text-[10px] text-muted-foreground">قبلی</span>
              <span className="block truncate text-xs font-bold">{prev.name}</span>
            </span>
          </button>
        ) : <span />}
        {next ? (
          <button
            onClick={() => navigate({ v: "test", id: next.id })}
            className="flex items-center justify-end gap-2 rounded-2xl border bg-card p-3 text-left shadow-sm transition-transform active:scale-[0.98]"
          >
            <span className="min-w-0">
              <span className="block text-[10px] text-muted-foreground">بعدی</span>
              <span className="block truncate text-xs font-bold">{next.name}</span>
            </span>
            <ChevronLeft className="h-4 w-4 shrink-0" />
          </button>
        ) : <span />}
      </div>
    </div>
  );
}
