"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Layers,
  Play,
  RotateCcw,
  Check,
  X,
  BrainCircuit,
  Inbox,
  PartyPopper,
  ChevronLeft,
  BookOpen,
  Archive,
  ArchiveRestore,
} from "lucide-react";
import { toast } from "sonner";
import type { AppData } from "@/lib/types";
import type { Route } from "@/lib/nav";
import { useAppStore, BOX_INTERVALS } from "@/lib/store";
import { leitnerInfo, buildSession, type SessionCard } from "@/lib/leitner";
import { faNum } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { tapHaptic } from "@/lib/haptics";
import { pullWidgetState } from "@/lib/widget-bridge";

const BOX_LABELS = ["جدید", "جعبه ۱", "جعبه ۲", "جعبه ۳", "جعبه ۴", "جعبه ۵"];

function BoxBars({ counts, total }: { counts: number[]; total: number }) {
  const colors = ["bg-slate-400", "bg-rose-400", "bg-amber-400", "bg-teal-400", "bg-emerald-500", "bg-emerald-600"];
  return (
    <div className="space-y-2">
      {counts.map((n, i) => (
        <div key={i} className="flex items-center gap-2.5">
          <span className="w-16 shrink-0 text-xs font-semibold text-muted-foreground">{BOX_LABELS[i]}</span>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full transition-all duration-500", colors[i])}
              style={{ width: `${total ? Math.max(n / total * 100, n > 0 ? 4 : 0) : 0}%` }}
            />
          </div>
          <span className="w-10 shrink-0 text-left text-xs font-bold">{faNum(n)}</span>
        </div>
      ))}
    </div>
  );
}

export function LeitnerView({ data, navigate }: { data: AppData; navigate: (r: Route) => void }) {
  const { leitner, answerCard, settings } = useAppStore();
  const [session, setSession] = useState<SessionCard[] | null>(null);
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState<{ good: number; bad: number }>({ good: 0, bad: 0 });

  const info = useMemo(() => leitnerInfo(data, leitner), [data, leitner]);

  // pull widget-side edits so the dashboard always matches the home-screen widget
  useEffect(() => {
    void pullWidgetState();
  }, []);

  const start = () => {
    void tapHaptic();
    const cards = buildSession(data, leitner, settings.dailyCards);
    if (!cards.length) {
      toast.info("در حال حاضر کارتی برای مرور ندارید");
      return;
    }
    setSession(cards);
    setPos(0);
    setFlipped(false);
    setResults({ good: 0, bad: 0 });
  };

  const answer = (good: boolean) => {
    void tapHaptic();
    const cur = session![pos];
    answerCard(cur.card.id, good);
    setResults((r) => ({ good: r.good + (good ? 1 : 0), bad: r.bad + (good ? 0 : 1) }));
    if (pos + 1 >= session!.length) {
      // finish
      setSession(null);
      setPos(0);
      const pct = Math.round(((results.good + (good ? 1 : 0)) / session!.length) * 100);
      toast.success(`جلسه مرور تمام شد — دقت ${faNum(pct)}٪`);
    } else {
      setPos(pos + 1);
      setFlipped(false);
    }
  };

  // ---------- session mode ----------
  if (session && session.length > 0) {
    const cur = session[pos];
    return (
      <div className="space-y-5">
        {/* progress */}
        <div>
          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span>
              کارت {faNum(pos + 1)} از {faNum(session.length)}
            </span>
            <span className="flex items-center gap-2">
              <span className="text-emerald-600">✓ {faNum(results.good)}</span>
              <span className="text-rose-500">✗ {faNum(results.bad)}</span>
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${((pos + (flipped ? 0.5 : 0)) / session.length) * 100}%` }}
            />
          </div>
        </div>

        {/* card */}
        <div
          key={cur.card.id + pos}
          className={cn(
            "flip-in cursor-pointer select-none rounded-3xl border-2 bg-card p-6 text-center shadow-lg transition-colors",
            flipped ? "border-primary/50" : "border-border hover:border-primary/30"
          )}
          onClick={() => {
            void tapHaptic();
            setFlipped((f) => !f);
          }}
        >
          <div className="mb-3 flex items-center justify-center gap-2 text-[11px] font-bold text-muted-foreground">
            <span className="rounded-lg bg-primary/10 px-2 py-1 text-primary">{cur.card.cat}</span>
            <span className="rounded-lg bg-muted px-2 py-1">
              {cur.isNew ? "کارت جدید" : BOX_LABELS[cur.box]}
            </span>
          </div>
          {!flipped ? (
            <div>
              <p className="text-[1.15rem] font-bold leading-9">{cur.card.front}</p>
              <p className="mt-6 text-xs text-muted-foreground">برای دیدن پاسخ، کارت را لمس کنید</p>
            </div>
          ) : (
            <div className="pop-in">
              <p className="text-[1.05rem] leading-9 text-foreground/95">{cur.card.back}</p>
            </div>
          )}
        </div>

        {/* actions */}
        {flipped ? (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => answer(false)}
              className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border-2 border-rose-500/40 bg-rose-500/10 font-bold text-rose-600 transition-transform active:scale-[0.97] dark:text-rose-300"
            >
              <X className="h-5 w-5" /> بلد نبودم
            </button>
            <button
              onClick={() => answer(true)}
              className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-emerald-600 font-bold text-white transition-transform active:scale-[0.97]"
            >
              <Check className="h-5 w-5" /> بلد بودم
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              void tapHaptic();
              setFlipped(true);
            }}
            className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-primary font-bold text-white transition-transform active:scale-[0.97]"
          >
            <BrainCircuit className="h-5 w-5" /> نمایش پاسخ
          </button>
        )}

        <button
          onClick={() => setSession(null)}
          className="mx-auto block text-xs font-semibold text-muted-foreground underline-offset-4 hover:underline"
        >
          پایان جلسه
        </button>
      </div>
    );
  }

  // ---------- dashboard ----------
  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-bl from-teal-700 via-teal-600 to-teal-500 p-5 text-white shadow-lg">
        <div className="absolute -left-10 -top-10 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-100/90">
            <Layers className="h-4 w-4" />
            جعبه لایتنر — مرور فاصله‌دار
          </div>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <div className="text-4xl font-black">{faNum(info.dueCount)}</div>
              <div className="mt-1 text-sm text-teal-50/85">کارت آماده مرور امروز</div>
            </div>
            <div className="text-left text-xs text-teal-50/85">
              <p>مجموع کارت‌ها: <b>{faNum(info.total)}</b></p>
              <p className="mt-1">مسلط‌شده (جعبه ۴ و ۵): <b>{faNum(info.learned)}</b></p>
            </div>
          </div>
          <button
            onClick={start}
            disabled={info.dueCount === 0}
            className="mt-4 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-white font-black text-teal-700 shadow-sm transition-transform active:scale-[0.98] disabled:opacity-40"
          >
            <Play className="h-5 w-5 fill-current" />
            شروع جلسه مرور ({faNum(Math.min(settings.dailyCards, info.dueCount))} کارت)
          </button>
        </div>
      </div>

      {/* boxes */}
      <section className="rounded-2xl border bg-card p-4 shadow-sm">
        <h2 className="mb-3.5 text-[15px] font-bold">وضعیت جعبه‌ها</h2>
        <BoxBars counts={info.boxCounts} total={info.total} />
        <p className="mt-3.5 rounded-xl bg-muted/60 p-3 text-[11px] leading-5 text-muted-foreground">
          سیستم لایتنر: کارت‌های «بلد بودم» به جعبه بعدی می‌روند و با فاصله‌های
          {" "}{BOX_INTERVALS.map((d) => faNum(d)).join("، ")} روز بازبینی می‌شوند؛ «بلد نبودم» به جعبه ۱ برمی‌گردد.
        </p>
      </section>

      {info.dueCount === 0 && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/8 p-5 text-center">
          <PartyPopper className="mx-auto h-8 w-8 text-emerald-500" />
          <p className="mt-2 text-sm font-bold">همه کارت‌های امروز مرور شد!</p>
          <p className="mt-1 text-xs text-muted-foreground">فردا دوباره سر بزنید یا جلسه جدیدی از کارت‌های جدید بسازید.</p>
        </div>
      )}

      <section className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate({ v: "cats" })}
          className="flex items-center gap-2.5 rounded-2xl border bg-card p-3.5 text-right shadow-sm"
        >
          <BookOpen className="h-5 w-5 text-primary" />
          <span className="text-sm font-bold">مطالعه مطلب جدید</span>
        </button>
        <button
          onClick={() => navigate({ v: "quiz" })}
          className="flex items-center gap-2.5 rounded-2xl border bg-card p-3.5 text-right shadow-sm"
        >
          <ArchiveRestore className="h-5 w-5 text-rose-500" />
          <span className="text-sm font-bold">آزمون مرور</span>
        </button>
      </section>
    </div>
  );
}
