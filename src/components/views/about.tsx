"use client";

import {
  GraduationCap,
  BookMarked,
  ShieldAlert,
  Database,
  Info,
  WifiOff,
  Users,
  UserRound,
} from "lucide-react";
import type { AppData } from "@/lib/types";
import { faNum, cn } from "@/lib/utils";

const AUTHOR = {
  name: "سید مجتبی کاظمی",
  role: "عضو هیأت علمی گروه پرستاری",
  org: "دانشکده علوم پزشکی بهبهان",
};

const COLLABORATORS = [
  {
    name: "دکتر هادی حسین‌پور",
    role: "استادیار باکتری‌شناسی",
    org: "دانشکده علوم پزشکی بهبهان",
  },
  {
    name: "فاطمه‌السادات معاشی",
    role: "دانشجوی پرستاری",
    org: "دانشکده علوم پزشکی بهبهان",
  },
];

export function AboutView({ data }: { data: AppData }) {
  return (
    <div className="space-y-5">
      {/* author card */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-bl from-teal-700 via-teal-600 to-teal-500 p-6 text-center text-white shadow-lg">
        <div className="absolute -left-10 -top-10 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-12 -right-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <span className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-white/15 backdrop-blur-sm">
            <GraduationCap className="h-10 w-10" />
          </span>
          <p className="mt-2 text-[11px] font-bold uppercase tracking-widest text-teal-100/85">طراح و سازنده</p>
          <h1 className="mt-1 text-[1.5rem] font-black">{AUTHOR.name}</h1>
          <p className="mt-2 text-sm leading-7 text-teal-50/95">
            {AUTHOR.role}
            <br />
            {AUTHOR.org}
          </p>
        </div>
      </section>

      {/* about app */}
      <section className="rounded-2xl border bg-card p-4 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-[15px] font-bold">
          <Info className="h-4.5 w-4.5 text-primary" /> درباره آزمـیار
        </h2>
        <p className="text-sm leading-8 text-foreground/85 text-justify">
          «آزمـیار» یک اپلیکیشن آموزشی برای دانشجویان و کادر درمان، به‌ویژه پرستاران و پزشکان است که روی{" "}
          <b>{faNum(data.tests.length)}</b> مطلب آموزشی از دیتابیس جامع آزمایش‌های تشخیصی و آزمایشگاهی ساخته شده است.
          مطالب در <b>{faNum(data.categories.length)}</b> دسته‌بندی موضوعی سازمان‌یافته‌اند و برای تثبیت یادگیری،{" "}
          <b>{faNum(data.cards.length)}</b> کارت جعبه لایتنر و <b>{faNum(data.questions.length)}</b> سوال آزمون از دل همین مطالب تولید شده است.
        </p>
        <div className="mt-3.5 grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2 rounded-xl bg-muted/60 p-2.5">
            <Database className="h-4 w-4 text-primary" /> دیتابیس جامع آزمایش‌های تشخیصی
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-muted/60 p-2.5">
            <WifiOff className="h-4 w-4 text-primary" /> بدون اینترنت هم کار می‌کند
          </div>
        </div>
      </section>

      {/* scientific collaborators */}
      <section className="rounded-2xl border bg-card p-4 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-[15px] font-bold">
          <Users className="h-4.5 w-4.5 text-primary" /> همکاران علمی
        </h2>
        <div className="space-y-2.5">
          {COLLABORATORS.map((c) => (
            <div key={c.name} className="flex items-center gap-3 rounded-2xl bg-muted/50 p-3.5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                <UserRound className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{c.name}</p>
                <p className="truncate text-xs leading-6 text-muted-foreground">
                  {c.role} — {c.org}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* sources */}
      <section className="rounded-2xl border bg-card p-4 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-[15px] font-bold">
          <BookMarked className="h-4.5 w-4.5 text-primary" /> منابع علمی دیتابیس
        </h2>
        <ul className="space-y-2">
          {data.sources.map((s, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm leading-7 text-foreground/80">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
              {s}
            </li>
          ))}
        </ul>
      </section>

      {/* disclaimer */}
      <section className="rounded-2xl border border-amber-500/30 bg-amber-500/8 p-4">
        <h2 className="mb-2 flex items-center gap-2 text-[15px] font-bold text-amber-700 dark:text-amber-400">
          <ShieldAlert className="h-4.5 w-4.5" /> سلب مسئولیت
        </h2>
        <p className="text-sm leading-7 text-foreground/80">
          محتوای این اپ صرفاً جنبه آموزشی دارد و جایگزین استانداردهای کاری، پروتکل‌های مرکز درمانی یا تصمیم‌گیری بالینی نیست.
          مقادیر مرجع آزمایشگاه‌ها ممکن است بر اساس روش آزمایش و جمعیت مورد بررسی متفاوت باشد؛ همیشه مقادیر مرجع آزمایشگاه خود را مبنا قرار دهید.
        </p>
      </section>

      {/* credit footer */}
      <div className="pb-2 text-center text-[11px] leading-6 text-muted-foreground">
        <p className="mt-1">
          آزمـیار نسخه ۱٫۲٫۱ — طراحی و ساخت: {AUTHOR.name}
        </p>
      </div>
    </div>
  );
}
