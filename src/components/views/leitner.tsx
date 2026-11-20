"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Layers,
  Play,
  Check,
  X,
  BrainCircuit,
  PartyPopper,
  BookOpen,
  ArchiveRestore,
  ChevronLeft,
  MousePointerClick,
  Clock3,
} from "lucide-react";
import { toast } from "sonner";
import type { AppData } from "@/lib/types";
import type { Route } from "@/lib/nav";
import { useAppStore, BOX_INTERVALS } from "@/lib/store";
import { leitnerInfo, buildSession, boxCards, type SessionCard } from "@/lib/leitner";
import { faNum } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { tapHaptic } from "@/lib/haptics";
import { pullWidgetState } from "@/lib/widget-bridge";
import { Celebration, tierForPct } from "@/components/celebration";

const BOX_LABELS = ["جدید", "جعبه ۱", "جعبه ۲", "جعبه ۳", "جعبه ۴", "جعبه ۵"];
const BOX_COLORS = ["bg-slate-400", "bg-rose-400", "bg-amber-400", "bg-teal-400", "bg-emerald-500", "bg-emerald-600"];
const BOX_INTERVAL_TEXT = [
  "کارت‌هایی که هنوز مرور نشده‌اند — با لمس این ردیف اولین کارت‌ها را یاد بگیر",
  "کارت‌هایی که بلد نبودیدی؛ هر ۱ روز یک‌بار مرور می‌شوند",
  "مرور هر ۳ روز — با لمس این ردیف می‌توانی زودتر از موعد هم مرور کنی",
  "مرور هر ۷ روز — با لمس این ردیف می‌توانی زودتر از موعد هم مرور کنی",
  "مرور هر ۱۴ روز — با لمس این ردیف می‌توانی زودتر از موعد هم مرور کنی",
  "مرور هر ۳۰ روز — با لمس این ردیف می‌توانی زودتر از موعد هم مرور کنی",
];

function BoxBars({ counts, onPick }: { counts: number[]; onPick: (box: number) => void }) {
  return (
    <div className="space-y-2">
      {counts.map((n, i) => (
        <button
          key={i}
          onClick={() => onPick(i)}
          disabled={n === 0}
          aria-label={`مرور ${BOX_LABELS[i]} (${n} کارت)`}
          className={cn(
            "group flex w-full items-center gap-2.5 rounded-xl p-1.5 transition-colors",
            n > 0 ? "hover:bg-muted active:scale-[0.99]" : "opacity-55"
          )}
        >
          <span className="w-16 shrink-0 text-right text-xs font-bold">{BOX_LABELS[i]}</span>
          <span className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
            <span
              className={cn("block h-full rounded-full transition-all duration-500", BOX_COLORS[i])}
              style={{ width: `${Math.max(n / Math.max(counts.reduce((a, b) => a + b, 0), 1) * 100, n > 0 ? 6 : 0)}%` }}
            />
          </span>
          <span className="w-9 shrink-0 text-left text-xs font-bold">{faNum(n)}</span>
          <ChevronLeft
            className={cn(
              "h-4 w-4 shrink-0 transition-transform group-active:-translate-x-0.5",
              n > 0 ? "text-muted-foreground group-hover:text-primary" : "invisible"
            )}
          />
        </button>
      ))}
    </div>
  );
}

export function LeitnerView({ data, navigate }: { data: AppData; navigate: (r: Route) => void }) {
  const { leitner, answerCard, settings } = useAppStore();
  const [session, setSession] = useState<SessionCard[] | null>(null);
  const [sessionLabel, setSessionLabel] = useState("مرور امروز");
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState<{ good: number; bad: number }>({ good: 0, bad: 0 });
  // finished session summary (v1.6.3) — drives the tiered result animation
  const [finished, setFinished] = useState<{ good: number; bad: number; label: string } | null>(null);

  const info = useMemo(() => leitnerInfo(data, leitner), [data, leitner]);

  // pull widget-side edits so the dashboard always matches the home-screen widget
  useEffect(() => {
    void pullWidgetState();
  }, []);

  const beginSession = (cards: SessionCard[], label: string) => {
    if (!cards.length) return;
    setFinished(null);
    setSession(cards);
    setSessionLabel(label);
    setPos(0);
    setFlipped(false);
    setResults({ good: 0, bad: 0 });
  };

  const start = () => {
    void tapHaptic();
    const cards = buildSession(data, leitner, settings.dailyCards);
    if (!cards.length) {
      toast.info("در حال حاضر کارتی برای مرور ندارید");
      return;
    }
    beginSession(cards, "مرور امروز");
  };

  const startBox = (box: number) => {
    void tapHaptic();
    const cards = boxCards(data, leitner, box).slice(0, settings.dailyCards);
    if (!cards.length) return;
    beginSession(
      cards,
      box === 0 ? "یادگیری کارت‌های جدید" : `مرور ${BOX_LABELS[box]}`
    );
  };

  const answer = (good: boolean) => {
    void tapHaptic();
    const cur = session![pos];
    answerCard(cur.card.id, good);
    const g = results.good + (good ? 1 : 0);
    const b = results.bad + (good ? 0 : 1);
    setResults({ good: g, bad: b });
    if (pos + 1 >= session!.length) {
      // finish — land on the session summary with the tiered result animation
      setSession(null);
      setPos(0);
      setFinished({ good: g, bad: b, label: sessionLabel });
      const pct = Math.round((g / session!.length) * 100);
      toast.success(`${sessionLabel} تمام شد — دقت ${faNum(pct)}٪`);
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
            <span className="rounded-lg bg-primary/10 px-2 py-1 text-primary">{sessionLabel}</span>
            <span className="flex items-center gap-2">
              <span className="text-emerald-600">✓ {faNum(results.good)}</span>
              <span className="text-rose-500">✗ {faNum(results.bad)}</span>
              <span>
                کارت {faNum(pos + 1)} از {faNum(session.length)}
              </span>
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

  // ---------- session result (v1.6.3) — summary card + tiered animation ----------
  if (finished) {
    const total = Math.max(finished.good + finished.bad, 1);
    const pct = Math.round((finished.good / total) * 100);
    return (
      <div className="space-y-5">
        <Celebration tier={tierForPct(pct)} />
        <div className="rounded-3xl border bg-card p-6 text-center shadow-md">
          <PartyPopper className="mx-auto h-9 w-9 text-emerald-500" />
          <p className="mt-2 text-lg font-black">جلسه مرور تمام شد</p>
          <p className="mt-1 text-xs text-muted-foreground">{finished.label}</p>
          <div className="mx-auto mt-5 grid h-32 w-32 place-items-center rounded-full" style={{ background: `conic-gradient(var(--primary) ${pct}%, var(--muted) 0)` }}>
            <div className="grid h-[104px] w-[104px] place-items-center rounded-full bg-card">
              <div>
                <div className="text-2xl font-black">{faNum(pct)}٪</div>
                <div className="text-[11px] text-muted-foreground">دقت جلسه</div>
              </div>
            </div>
          </div>
          <div className="mx-auto mt-5 grid max-w-[220px] grid-cols-2 gap-3">
            <div className="rounded-xl bg-emerald-500/10 p-2.5">
              <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">✓ {faNum(finished.good)}</div>
              <div className="text-[10px] text-muted-foreground">بلد بودم</div>
            </div>
            <div className="rounded-xl bg-rose-500/10 p-2.5">
              <div className="text-sm font-black text-rose-600 dark:text-rose-400">✗ {faNum(finished.bad)}</div>
              <div className="text-[10px] text-muted-foreground">بلد نبودم</div>
            </div>
          </div>
          <button
            onClick={() => {
              void tapHaptic();
              setFinished(null);
            }}
            className="mt-6 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-primary font-bold text-white transition-transform active:scale-[0.98]"
          >
            <Layers className="h-4.5 w-4.5" /> بازگشت به جعبه لایتنر
          </button>
        </div>
      </div>
    );
  }

  // ---------- dashboard ----------
  return (
    <div className="space-y-5">
      <div className="hero-aurora relative overflow-hidden rounded-3xl p-5 text-white shadow-lg">
        <div className="absolute -left-10 -top-10 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-xs font-semibold text-white/85">
            <Layers className="h-4 w-4" />
            جعبه لایتنر — مرور فاصله‌دار
          </div>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <div className="text-4xl font-black">{faNum(info.dueCount)}</div>
              <div className="mt-1 text-sm text-white/85">کارت آماده مرور امروز</div>
            </div>
            <div className="text-left text-xs text-white/85">
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
        <h2 className="mb-1 flex items-center gap-2 text-[15px] font-bold">
          <MousePointerClick className="h-4 w-4 text-primary" />
          وضعیت جعبه‌ها
        </h2>
        <p className="mb-3.5 text-[11px] leading-5 text-muted-foreground">
          روی هر ردیف بزن تا کارت‌های همان جعبه را مرور کنی — حتی اگر موعدشان نرسیده باشد.
        </p>
        <BoxBars counts={info.boxCounts} onPick={startBox} />
        <p className="mt-3.5 flex items-start gap-1.5 rounded-xl bg-muted/60 p-3 text-[11px] leading-5 text-muted-foreground">
          <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            سیستم لایتنر: «بلد بودم» کارت را یک جعبه جلو می‌برد و با فاصله‌های
            {" "}{BOX_INTERVALS.map((d) => faNum(d)).join("، ")} روز دوباره پرسیده می‌شود؛ «بلد نبودم» به جعبه ۱ برمی‌گردد.
            مرور زودتر از موعد هم کارت را جلو می‌برد.
          </span>
        </p>
      </section>

      {info.dueCount === 0 && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/8 p-5 text-center">
          <PartyPopper className="mx-auto h-8 w-8 text-emerald-500" />
          <p className="mt-2 text-sm font-bold">همه کارت‌های امروز مرور شد!</p>
          <p className="mt-1 text-xs text-muted-foreground">فردا دوباره سر بزن، یا همین حالا از ردیف جعبه‌ها مرور دستی بزن.</p>
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
