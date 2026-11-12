"use client";

import { useMemo } from "react";
import {
  FlaskConical,
  Layers,
  ClipboardCheck,
  BookOpen,
  Star,
  ChevronLeft,
  Download,
  Sparkles,
  GraduationCap,
  ArrowLeft,
  Droplets,
  HeartPulse,
  Bug,
  Worm,
  Microscope,
  Cog,
  BadgeCheck,
  Activity,
  type LucideIcon,
} from "lucide-react";
import type { AppData } from "@/lib/types";
import type { Route } from "@/lib/nav";
import { useAppStore } from "@/lib/store";
import { faNum } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const GROUP_ICONS: Record<string, LucideIcon> = {
  "بیوشیمی خون": FlaskConical,
  "هورمون‌ها": Activity,
  "مارکرها": Sparkles,
  "ادرار و مایعات بدن": Droplets,
  "هماتولوژی": HeartPulse,
  "سرولوژی و میکروب‌شناسی": Bug,
  "انگل‌شناسی": Worm,
  "قارچ‌شناسی": Microscope,
  "تجهیزات و تکنیک‌ها": Cog,
  "کنترل کیفیت": BadgeCheck,
};

export const GROUP_COLORS: Record<string, string> = {
  "بیوشیمی خون": "bg-teal-500",
  "هورمون‌ها": "bg-fuchsia-500",
  "مارکرها": "bg-rose-500",
  "ادرار و مایعات بدن": "bg-amber-500",
  "هماتولوژی": "bg-red-500",
  "سرولوژی و میکروب‌شناسی": "bg-violet-500",
  "انگل‌شناسی": "bg-orange-500",
  "قارچ‌شناسی": "bg-lime-600",
  "تجهیزات و تکنیک‌ها": "bg-slate-500",
  "کنترل کیفیت": "bg-emerald-500",
};

function InstallBanner({ installEvt }: { installEvt: { prompt: () => void } | null }) {
  if (!installEvt) return null;
  return (
    <button
      onClick={() => installEvt.prompt()}
      className="flex w-full items-center gap-3 rounded-2xl border border-primary/30 bg-primary/10 p-3.5 text-right transition-transform active:scale-[0.99]"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-white">
        <Download className="h-5 w-5" />
      </span>
      <span className="flex-1">
        <span className="block text-sm font-bold text-primary">نصب اپلیکیشن روی گوشی</span>
        <span className="block text-xs text-muted-foreground">برای دسترسی آفلاین، اپ را نصب کنید</span>
      </span>
      <ChevronLeft className="h-5 w-5 text-primary" />
    </button>
  );
}

export function HomeView({ data, navigate, installEvt }: {
  data: AppData;
  navigate: (r: Route) => void;
  installEvt: { prompt: () => void } | null;
}) {
  const { lastTest, favorites, leitner } = useAppStore();
  const last = useMemo(() => data.tests.find((t) => t.id === lastTest), [data.tests, lastTest]);
  const favTests = useMemo(
    () => favorites.map((id) => data.tests.find((t) => t.id === id)).filter(Boolean) as typeof data.tests,
    [favorites, data.tests]
  );
  const due = useMemo(() => {
    const now = Date.now();
    return data.cards.filter((c) => {
      const st = leitner[c.id];
      return !st || st.due <= now;
    }).length;
  }, [data.cards, leitner]);

  const stats = [
    { label: "مطلب آموزشی", value: data.tests.length, href: () => navigate({ v: "cats" }) },
    { label: "کارت مرور", value: data.cards.length, href: () => navigate({ v: "leitner" }) },
    { label: "سوال آزمون", value: data.questions.length, href: () => navigate({ v: "quiz" }) },
  ];

  const mainGroups = [
    "بیوشیمی خون",
    "هورمون‌ها",
    "ادرار و مایعات بدن",
    "هماتولوژی",
    "سرولوژی و میکروب‌شناسی",
    "انگل‌شناسی",
  ];

  return (
    <div className="space-y-5">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-bl from-teal-700 via-teal-600 to-teal-500 p-5 text-white shadow-lg">
        <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-14 -right-6 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-100/90">
            <Sparkles className="h-3.5 w-3.5" />
            اپلیکیشن آموزشی کادر درمان و دانشجویان علوم پزشکی
          </div>
          <h1 className="mt-1.5 text-[1.65rem] font-black leading-snug">
            آزمایش‌های آزمایشگاهی را اصولی بیاموزید
          </h1>
          <p className="mt-2 text-sm leading-6 text-teal-50/90">
            مرجع کامل تفسیر آزمایش‌ها با دسته‌بندی موضوعی، جعبه لایتنر برای مرور هوشمند و آزمون از مباحث خوانده‌شده
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {stats.map((s) => (
              <button
                key={s.label}
                onClick={s.href}
                className="rounded-2xl bg-white/12 p-3 text-center backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                <div className="text-lg font-black">{faNum(s.value)}</div>
                <div className="mt-0.5 text-[11px] font-semibold text-teal-50/85">{s.label}</div>
              </button>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white/10 p-2.5 text-[11px] leading-5 text-teal-50/95">
            <GraduationCap className="h-4 w-4 shrink-0" />
            طراحی و ساخت: سید مجتبی کاظمی — عضو هیأت علمی گروه پرستاری، دانشکده علوم پزشکی بهبهان
          </div>
        </div>
      </section>

      <InstallBanner installEvt={installEvt} />

      {/* Quick actions */}
      <section className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate({ v: "leitner" })}
          className="flex items-center gap-3 rounded-2xl border bg-card p-3.5 text-right shadow-sm transition-transform active:scale-[0.99]"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-teal-500/12 text-teal-600 dark:text-teal-300">
            <Layers className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-bold">مرور امروز</span>
            <span className="block text-xs text-muted-foreground">{due > 0 ? `${faNum(due)} کارت آماده مرور` : "مروری باقی نمانده"}</span>
          </span>
        </button>
        <button
          onClick={() => navigate({ v: "quiz" })}
          className="flex items-center gap-3 rounded-2xl border bg-card p-3.5 text-right shadow-sm transition-transform active:scale-[0.99]"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-rose-500/12 text-rose-600 dark:text-rose-300">
            <ClipboardCheck className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-bold">آزمون سریع</span>
            <span className="block text-xs text-muted-foreground">از مباحث خوانده‌شده</span>
          </span>
        </button>
      </section>

      {/* Continue reading */}
      {last && (
        <section>
          <h2 className="mb-2.5 flex items-center gap-2 text-[15px] font-bold">
            <BookOpen className="h-4 w-4 text-primary" /> ادامه مطالعه
          </h2>
          <button
            onClick={() => navigate({ v: "test", id: last.id })}
            className="flex w-full items-center gap-3 rounded-2xl border bg-card p-4 text-right shadow-sm transition-transform active:scale-[0.99]"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <FlaskConical className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-bold">{last.name}</span>
              <span className="block truncate text-xs text-muted-foreground">{last.cat}</span>
            </span>
            <ChevronLeft className="h-5 w-5 shrink-0 text-muted-foreground" />
          </button>
        </section>
      )}

      {/* Favorites */}
      {favTests.length > 0 && (
        <section>
          <h2 className="mb-2.5 flex items-center gap-2 text-[15px] font-bold">
            <Star className="h-4 w-4 text-amber-500" /> علاقه‌مندی‌ها
          </h2>
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
            {favTests.map((t) => (
              <button
                key={t.id}
                onClick={() => navigate({ v: "test", id: t.id })}
                className="shrink-0 rounded-2xl border bg-card px-4 py-3 text-sm font-semibold shadow-sm"
              >
                {t.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Groups */}
      <section>
        <h2 className="mb-2.5 flex items-center justify-between text-[15px] font-bold">
          <span>دسته‌بندی موضوعی</span>
          <button onClick={() => navigate({ v: "cats" })} className="text-xs font-semibold text-primary">
            مشاهده همه
          </button>
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {mainGroups.map((g) => {
            const Icon = GROUP_ICONS[g] ?? FlaskConical;
            const count = data.categories.filter((c) => c.group === g).reduce((a, c) => a + c.count, 0);
            return (
              <button
                key={g}
                onClick={() => navigate({ v: "cats" })}
                className="flex items-center gap-3 rounded-2xl border bg-card p-3.5 text-right shadow-sm transition-transform active:scale-[0.98]"
              >
                <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-white", GROUP_COLORS[g])}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">{g}</span>
                  <span className="block text-[11px] text-muted-foreground">{faNum(count)} مطلب</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
