"use client";

import { memo } from "react";
import {
  FlaskConical,
  BookOpenText,
  Stethoscope,
  Droplets,
  Thermometer,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Pill,
  Lightbulb,
  Table2,
  Ban,
  FileText,
  ArrowLeftRight,
  type LucideIcon,
} from "lucide-react";
import type { Section, SectionItem } from "@/lib/types";
import { cn } from "@/lib/utils";

// ---------------- small building blocks ----------------

function Prose({ paras, className }: { paras: string[]; className?: string }) {
  return (
    <div className={cn("reading-body text-[0.95em] text-foreground/90", className)}>
      {paras.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}

function BulletList({ items, ordered }: { items: SectionItem[]; ordered?: boolean }) {
  const counter = { n: 0 };
  return (
    <ul className="space-y-2.5">
      {items.map((it, idx) => {
        if (it.kind === "sub") {
          return (
            <li key={idx} className="pt-2 first:pt-0">
              <span className="font-bold text-primary/90">{it.text}</span>
            </li>
          );
        }
        counter.n++;
        const n = it.kind === "num" ? it.n : counter.n;
        return (
          <li key={idx} className="flex gap-2.5 items-start leading-7">
            <span
              className={cn(
                "mt-0.5 shrink-0 flex items-center justify-center",
                ordered || it.kind === "num"
                  ? "w-6 h-6 rounded-lg bg-primary/10 text-primary text-xs font-bold"
                  : "w-2 h-2 rounded-full bg-primary/60 mt-[0.7rem]"
              )}
            >
              {ordered || it.kind === "num" ? n : ""}
            </span>
            <span className="text-foreground/90">{it.text}</span>
          </li>
        );
      })}
    </ul>
  );
}

function Chips({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((s, i) => (
        <span
          key={i}
          className="rounded-xl bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground border border-border/60"
          dir="auto"
        >
          {s}
        </span>
      ))}
    </div>
  );
}

// ---------------- section shell ----------------

interface ShellProps {
  icon: LucideIcon;
  title: string;
  tone: "teal" | "rose" | "amber" | "violet" | "emerald" | "red" | "slate" | "sky";
  unit?: string;
  children: React.ReactNode;
  className?: string;
}

const TONES: Record<ShellProps["tone"], { chip: string; icon: string; ring: string }> = {
  teal: { chip: "bg-teal-500/10 text-teal-700 dark:text-teal-300", icon: "bg-teal-500", ring: "border-teal-500/25" },
  rose: { chip: "bg-rose-500/10 text-rose-700 dark:text-rose-300", icon: "bg-rose-500", ring: "border-rose-500/25" },
  amber: { chip: "bg-amber-500/10 text-amber-700 dark:text-amber-300", icon: "bg-amber-500", ring: "border-amber-500/25" },
  violet: { chip: "bg-violet-500/10 text-violet-700 dark:text-violet-300", icon: "bg-violet-500", ring: "border-violet-500/25" },
  emerald: { chip: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", icon: "bg-emerald-500", ring: "border-emerald-500/25" },
  red: { chip: "bg-red-500/10 text-red-700 dark:text-red-300", icon: "bg-red-500", ring: "border-red-500/30" },
  slate: { chip: "bg-slate-500/10 text-slate-700 dark:text-slate-300", icon: "bg-slate-500", ring: "border-slate-400/25" },
  sky: { chip: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300", icon: "bg-cyan-500", ring: "border-cyan-500/25" },
};

function SectionShell({ icon: Icon, title, tone, unit, children, className }: ShellProps) {
  const t = TONES[tone];
  return (
    <section className={cn("rounded-2xl border bg-card p-4 sm:p-5 shadow-sm", t.ring, className)}>
      <header className="mb-3.5 flex items-center gap-2.5">
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-sm", t.icon)}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <h3 className="text-[1.02rem] font-bold">{title}</h3>
        {unit && (
          <span className="mr-auto rounded-lg bg-muted px-2 py-1 text-[11px] font-semibold text-muted-foreground" dir="ltr">
            {unit}
          </span>
        )}
      </header>
      {children}
    </section>
  );
}

function ValueRows({ rows, tone }: { rows: { group: string; value: string }[]; tone: "emerald" | "red" }) {
  const badge = tone === "emerald" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-red-500/10 text-red-700 dark:text-red-300";
  return (
    <div className="divide-y divide-border/70 rounded-xl border border-border/60 overflow-hidden">
      {rows.map((r, i) => (
        <div key={i} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-3.5 py-2.5 odd:bg-muted/40">
          {r.group && (
            <span className={cn("rounded-lg px-2 py-0.5 text-xs font-bold shrink-0", badge)}>{r.group}</span>
          )}
          <span className="font-semibold leading-7 text-[0.95em]" dir="auto">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------- main renderer ----------------

export const SectionRenderer = memo(function SectionRenderer({ section }: { section: Section }) {
  const s = section;
  switch (s.type) {
    case "abbr":
    case "full_name":
    case "aka": {
      const items = (s.items ?? []).filter((i) => i.kind !== "sub").map((i) => i.text);
      if (!items.length) return null;
      return (
        <div className="rounded-2xl border border-primary/25 bg-gradient-to-l from-primary/8 via-primary/4 to-transparent p-4 shadow-sm">
          <div className="mb-2.5 flex items-center gap-2 text-primary">
            <FlaskConical className="h-4.5 w-4.5" />
            <span className="text-sm font-bold">
              {s.type === "abbr" ? "نام اختصاری" : s.type === "full_name" ? "نام کامل" : "نام‌های دیگر"}
            </span>
          </div>
          <Chips items={items} />
        </div>
      );
    }
    case "physiology":
      return (
        <SectionShell icon={BookOpenText} title="تشریح تست و فیزیولوژی" tone="teal">
          <Prose paras={s.paras ?? []} />
        </SectionShell>
      );
    case "clinical":
      return (
        <SectionShell icon={Stethoscope} title="کاربردهای بالینی" tone="sky">
          <BulletList items={s.items ?? []} ordered />
        </SectionShell>
      );
    case "sampling":
      return (
        <SectionShell icon={Droplets} title="شرایط و ملاحظات نمونه‌گیری" tone="sky">
          <BulletList items={s.items ?? []} />
        </SectionShell>
      );
    case "storage":
      return (
        <SectionShell icon={Thermometer} title="شرایط نگهداری نمونه" tone="slate">
          {s.paras?.length ? <Prose paras={s.paras} /> : <BulletList items={s.items ?? []} />}
        </SectionShell>
      );
    case "interference":
      return (
        <SectionShell icon={ArrowLeftRight} title="عوامل مداخله‌گر و تداخلات" tone="amber">
          <BulletList items={s.items ?? []} />
        </SectionShell>
      );
    case "drugs_up":
    case "drugs_down": {
      const all = (s.items ?? []).map((i) => i.text).filter(Boolean);
      return (
        <SectionShell
          icon={Pill}
          title={s.type === "drugs_up" ? "داروهای افزایش‌دهنده" : "داروهای کاهش‌دهنده"}
          tone={s.type === "drugs_up" ? "rose" : "emerald"}
        >
          <div className="flex flex-wrap gap-2">
            {all.map((d, i) => (
              <span
                key={i}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-sm font-medium border",
                  s.type === "drugs_up"
                    ? "bg-rose-500/8 text-rose-700 dark:text-rose-300 border-rose-500/20"
                    : "bg-emerald-500/8 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                )}
                dir="auto"
              >
                {d}
              </span>
            ))}
          </div>
        </SectionShell>
      );
    }
    case "increase":
    case "decrease":
      return (
        <SectionShell
          icon={s.type === "increase" ? TrendingUp : TrendingDown}
          title={s.type === "increase" ? "در چه شرایطی افزایش می‌یابد؟" : "در چه شرایطی کاهش می‌یابد؟"}
          tone={s.type === "increase" ? "rose" : "emerald"}
        >
          <BulletList items={s.items ?? []} ordered />
        </SectionShell>
      );
    case "normal":
      return (
        <SectionShell icon={Table2} title="مقادیر طبیعی" tone="emerald" unit={s.unit}>
          <ValueRows rows={s.rows ?? []} tone="emerald" />
        </SectionShell>
      );
    case "critical":
      return (
        <SectionShell icon={AlertTriangle} title="مقادیر بحرانی" tone="red" unit={s.unit}>
          <ValueRows rows={s.rows ?? []} tone="red" />
        </SectionShell>
      );
    case "abnormal":
      return (
        <SectionShell icon={Ban} title="یافته‌های غیرطبیعی" tone="amber">
          <ValueRows rows={s.rows ?? []} tone="red" />
        </SectionShell>
      );
    case "note":
      return (
        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-l from-amber-500/10 via-amber-500/5 to-transparent p-4">
          <div className="mb-2 flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <Lightbulb className="h-[18px] w-[18px]" />
            <span className="font-bold text-[1.02rem]">نکته</span>
          </div>
          {s.paras?.length ? <Prose paras={s.paras} className="text-foreground/90" /> : null}
          {s.items?.length ? <BulletList items={s.items} /> : null}
        </div>
      );
    case "other":
    default: {
      const hasList = (s.items?.length ?? 0) > 0;
      return (
        <SectionShell icon={FileText} title={s.title || "توضیحات"} tone="teal">
          {s.paras?.length ? <Prose paras={s.paras} /> : null}
          {hasList ? (
            <div className={s.paras?.length ? "mt-3" : ""}>
              <BulletList items={s.items ?? []} ordered={s.items?.every((i) => i.kind === "num")} />
            </div>
          ) : null}
        </SectionShell>
      );
    }
  }
});

export function SectionList({ sections }: { sections: Section[] }) {
  return (
    <div className="space-y-4">
      {sections.map((s, i) => (
        <SectionRenderer key={i} section={s} />
      ))}
    </div>
  );
}
