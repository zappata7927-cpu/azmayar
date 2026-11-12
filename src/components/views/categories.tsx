"use client";

import { useMemo } from "react";
import { ChevronLeft, Star, CheckCircle2, FlaskConical, Search } from "lucide-react";
import { useState } from "react";
import type { AppData } from "@/lib/types";
import { normFa } from "@/lib/types";
import type { Route } from "@/lib/nav";
import { useAppStore } from "@/lib/store";
import { GROUP_ICONS, GROUP_COLORS } from "@/components/views/home";
import { faNum } from "@/lib/utils";
import { GROUP_ORDER } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CategoriesView({ data, navigate }: { data: AppData; navigate: (r: Route) => void }) {
  const [q, setQ] = useState("");
  const { read } = useAppStore();
  const readSet = new Set(read);

  const groups = useMemo(() => {
    const nq = normFa(q);
    const cats = data.categories.filter((c) => !nq || normFa(c.name).includes(nq));
    const ordered = [...cats].sort((a, b) => a.order - b.order);
    const map = new Map<string, typeof data.categories>();
    for (const g of GROUP_ORDER) map.set(g, []);
    for (const c of ordered) {
      if (!map.has(c.group)) map.set(c.group, []);
      map.get(c.group)!.push(c);
    }
    return [...map.entries()].filter(([, list]) => list.length > 0);
  }, [data.categories, q]);

  return (
    <div className="space-y-6">
      <div className="sticky top-[57px] z-20 -mx-3 bg-background/90 px-3 pb-3 pt-1 backdrop-blur-md">
        <div className="flex items-center gap-2 rounded-2xl border bg-muted/50 px-3.5 py-2.5">
          <Search className="h-4.5 w-4.5 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="جستجوی دسته‌بندی…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {groups.map(([group, cats]) => {
        const Icon = GROUP_ICONS[group] ?? FlaskConical;
        const total = cats.reduce((a, c) => a + c.count, 0);
        return (
          <section key={group}>
            <header className="mb-3 flex items-center gap-2.5">
              <span className={cn("grid h-9 w-9 place-items-center rounded-xl text-white shadow-sm", GROUP_COLORS[group] ?? "bg-primary")}>
                <Icon className="h-4.5 w-4.5" />
              </span>
              <div>
                <h2 className="text-[15px] font-bold leading-5">{group}</h2>
                <p className="text-[11px] text-muted-foreground">
                  {faNum(cats.length)} دسته • {faNum(total)} مطلب
                </p>
              </div>
            </header>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {cats.map((c) => {
                const allRead = data.tests.filter((t) => t.cat === c.name).every((t) => readSet.has(t.id));
                return (
                  <button
                    key={c.name}
                    onClick={() => navigate({ v: "cat", cat: c.name })}
                    className="group flex items-center gap-3 rounded-2xl border bg-card p-3.5 text-right shadow-sm transition-all hover:border-primary/40 active:scale-[0.98]"
                  >
                    <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", GROUP_COLORS[group] ?? "bg-primary")} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold leading-6">{c.name}</span>
                      <span className="block text-[11px] text-muted-foreground">{faNum(c.count)} مطلب</span>
                    </span>
                    {allRead && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />}
                    <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground/60 transition-colors group-hover:text-primary" />
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
      {groups.length === 0 && (
        <p className="py-16 text-center text-sm text-muted-foreground">دسته‌ای یافت نشد</p>
      )}
    </div>
  );
}

export function CategoryView({ data, cat, navigate }: { data: AppData; cat: string; navigate: (r: Route) => void }) {
  const { favorites, toggleFav, read } = useAppStore();
  const tests = useMemo(() => data.tests.filter((t) => t.cat === cat), [data, cat]);
  const group = useMemo(() => data.categories.find((c) => c.name === cat)?.group ?? "", [data, cat]);
  const readSet = new Set(read);

  if (!tests.length) {
    return <p className="py-16 text-center text-sm text-muted-foreground">این دسته یافت نشد</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm">
        <span className={cn("grid h-11 w-11 place-items-center rounded-2xl text-white shadow-sm", GROUP_COLORS[group] ?? "bg-primary")}>
          {(() => {
            const Icon = GROUP_ICONS[group] ?? FlaskConical;
            return <Icon className="h-5 w-5" />;
          })()}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-black leading-7">{cat}</h1>
          <p className="text-xs text-muted-foreground">{faNum(tests.length)} مطلب آموزشی</p>
        </div>
      </div>

      <div className="space-y-2.5">
        {tests.map((t) => {
          const fav = favorites.includes(t.id);
          return (
            <div
              key={t.id}
              className="flex items-center gap-1 rounded-2xl border bg-card p-2.5 pl-3 shadow-sm transition-colors hover:border-primary/30"
            >
              <button
                onClick={() => navigate({ v: "test", id: t.id })}
                className="flex min-w-0 flex-1 items-center gap-3 text-right"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/8 text-primary">
                  <FlaskConical className="h-4.5 w-4.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[15px] font-bold">{t.name}</span>
                    {readSet.has(t.id) && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />}
                  </span>
                  {t.short && (
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground" dir="ltr">
                      {t.short}
                    </span>
                  )}
                </span>
                <ChevronLeft className="h-4.5 w-4.5 shrink-0 text-muted-foreground/50" />
              </button>
              <button
                onClick={() => toggleFav(t.id)}
                aria-label={fav ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors hover:bg-muted"
              >
                <Star className={cn("h-4.5 w-4.5", fav ? "fill-amber-400 text-amber-400" : "text-muted-foreground/50")} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
