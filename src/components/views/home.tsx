"use client";

import { useMemo, useState } from "react";
import {
  FlaskConical,
  Layers,
  ClipboardCheck,
  BookOpen,
  Star,
  ChevronLeft,
  Sparkles,
  GraduationCap,
  Lightbulb,
  Shuffle,
  ChevronLeft as ArrowLeftIcon,
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
import { useActivityMedal, type Activity as ActivityInfo } from "@/lib/achievements";
import { faNum, cn } from "@/lib/utils";

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

function dayIndex(): number {
  const d = new Date();
  return d.getFullYear() * 1000 + d.getMonth() * 40 + d.getDate();
}

function ClinicalPearl({ data, navigate }: { data: AppData; navigate: (r: Route) => void }) {
  const pearls = data.pearls ?? [];
  const [idx, setIdx] = useState(() => (pearls.length ? dayIndex() % pearls.length : 0));
  if (!pearls.length) return null;
  const pearl = pearls[idx % pearls.length];
  const next = () => setIdx((Math.floor(Math.random() * pearls.length * 13) + idx + 1) % pearls.length);
  return (
    <section>
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/25 bg-gradient-to-bl from-amber-400/15 via-orange-300/10 to-amber-100/5 p-4 shadow-sm dark:from-amber-500/10 dark:via-orange-500/8 dark:to-amber-500/5">
        <div className="absolute -left-8 -top-8 h-24 w-24 rounded-full bg-amber-400/15 blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-300">
              <Lightbulb className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[13px] font-bold">نکته بالینی</div>
              <div className="truncate text-[11px] text-muted-foreground">
                {pearl.cat} • {pearl.test}
              </div>
            </div>
            <span className="mr-auto grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-muted/60 text-amber-600 transition-colors active:scale-95 dark:text-amber-300" onClick={next} aria-label="نکته بعدی" role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && next()}>
              <Shuffle className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 text-[13.5px] leading-8 text-foreground/90 text-justify">{pearl.text}</p>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={next}
              className="flex items-center gap-1.5 rounded-xl bg-amber-500/15 px-3.5 py-2 text-xs font-bold text-amber-700 transition-transform active:scale-95 dark:text-amber-300"
            >
              <Shuffle className="h-3.5 w-3.5" /> نکته بعدی
            </button>
            {pearl.tid && (
              <button
                onClick={() => navigate({ v: "test", id: pearl.tid })}
                className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 px-3.5 py-2 text-xs font-bold text-amber-700 transition-colors hover:bg-amber-500/10 dark:text-amber-300"
              >
                مطالعه مطلب
                <ArrowLeftIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Honorary medal earned from real activity: studying, Leitner reviews and quizzes. */
function MedalCard({ activity: a }: { activity: ActivityInfo }) {
  const t = a.tier;
  return (
    <section className={cn("relative overflow-hidden rounded-3xl border p-5 shadow-sm", t.bg, t.border)}>
      <div className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-white/25 blur-2xl" />
      <div className="absolute -left-8 bottom-0 h-24 w-24 rounded-full bg-white/15 blur-2xl" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[13px] font-bold">
            <Sparkles className={cn("h-4 w-4", t.text)} />
            مدال افتخار آزمـیار
          </div>
          <span className={cn("rounded-lg bg-white/50 px-2 py-0.5 text-[11px] font-black dark:bg-white/10", t.text)}>
            سطح {faNum(a.tierIndex + 1)} از {faNum(6)}
          </span>
        </div>

        <div className="mt-3.5 flex items-center gap-4">
          <div className={cn("grid h-[76px] w-[76px] shrink-0 place-items-center rounded-full bg-gradient-to-br p-[3px] shadow-md", t.grad)}>
            <div className="grid h-full w-full place-items-center rounded-full bg-card text-[2.1rem] leading-none">
              {t.emoji}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[1.15rem] font-black leading-7">{t.name}</div>
            <div className="mt-0.5 text-xs font-semibold text-muted-foreground">
              {faNum(a.points)} امتیاز فعالیت
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground/85">
              مطالعه {faNum(a.studyPts)} • مرور {faNum(a.cardPts)} • آزمون {faNum(a.quizPts)}
            </div>
          </div>
        </div>

        {a.next && (
          <div className="mt-3.5">
            <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold text-muted-foreground">
              <span>
                تا «{a.next.name}» {faNum(a.nextGap)} امتیاز مانده
              </span>
              <span className={t.text}>{faNum(Math.round(a.progress * 100))}٪</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-background/60 shadow-inner">
              <div
                className={cn("h-full rounded-full bg-gradient-to-l transition-all duration-500", t.grad)}
                style={{ width: `${Math.max(4, Math.round(a.progress * 100))}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-3.5 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-white/45 p-2.5 text-center dark:bg-white/8">
            <BookOpen className="mx-auto h-3.5 w-3.5 text-primary" />
            <div className="mt-1 text-sm font-black">{faNum(a.readCount)}</div>
            <div className="text-[10px] text-muted-foreground">مطلب مطالعه‌شده</div>
          </div>
          <div className="rounded-xl bg-white/45 p-2.5 text-center dark:bg-white/8">
            <Layers className="mx-auto h-3.5 w-3.5 text-primary" />
            <div className="mt-1 text-sm font-black">{faNum(a.cardsSeen)}</div>
            <div className="text-[10px] text-muted-foreground">مرور کارت (+{faNum(a.mastered)} مسلط)</div>
          </div>
          <div className="rounded-xl bg-white/45 p-2.5 text-center dark:bg-white/8">
            <ClipboardCheck className="mx-auto h-3.5 w-3.5 text-primary" />
            <div className="mt-1 text-sm font-black">{faNum(a.quizRuns)}</div>
            <div className="text-[10px] text-muted-foreground">آزمون (میانگین {faNum(a.quizAvg)}٪)</div>
          </div>
        </div>

        <p className="mt-3 text-[12px] leading-6 text-muted-foreground">{t.caption}</p>
      </div>
    </section>
  );
}

export function HomeView({ data, navigate }: {  data: AppData;
  navigate: (r: Route) => void;
}) {
  const { lastTest, favorites, leitner } = useAppStore();
  const activity = useActivityMedal();
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

  return (
    <div className="space-y-5">
      {/* Hero */}
      <section className="hero-aurora relative overflow-hidden rounded-3xl p-5 text-white shadow-lg">
        <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-14 -right-6 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-xs font-semibold text-white/85">
            <Sparkles className="h-3.5 w-3.5" />
            اپلیکیشن آموزشی کادر درمان و دانشجویان علوم پزشکی
          </div>
          <h1 className="mt-1.5 text-[1.65rem] font-black leading-snug">
            آزمایش‌های آزمایشگاهی را اصولی بیاموزید
          </h1>
          <p className="mt-2 text-sm leading-6 text-white/85">
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
                <div className="mt-0.5 text-[11px] font-semibold text-white/85">{s.label}</div>
              </button>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white/10 p-2.5 text-[11px] leading-5 text-white/90">
            <GraduationCap className="h-4 w-4 shrink-0" />
            مرجع کامل تفاسیر آزمایش‌های تشخیصی برای کادر درمان و دانشجویان
          </div>
        </div>
      </section>

      {/* Honorary medal — encourages continued useful use of the app */}
      <MedalCard activity={activity} />

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

      {/* Random clinical pearl */}
      <ClinicalPearl data={data} navigate={navigate} />
    </div>
  );
}
