"use client";

import { useMemo, useState } from "react";
import { BadgeCheck, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ListChecks } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GOALS } from "@/lib/study-plan";
import { useAppStore, type StudyGoalKey } from "@/lib/store";
import type { AppData } from "@/lib/types";
import { cn, faNum } from "@/lib/utils";
import { formatJalaliLong } from "@/lib/jalali";
import { JalaliCalendar } from "@/components/jalali-calendar";
import { tapHaptic } from "@/lib/haptics";
import { toast } from "sonner";

/** Two-step goal wizard (v1.5.1): step 1 = goal (+ Jalali exam date for
 *  exam-style goals), step 2 = the topics the whole plan/tips/quiz content
 *  scopes to (empty = all topics). The dialog body scrolls while the step
 *  header and action footer stay put, so even the full topic list stays
 *  reachable on small screens. The wizard remounts on every open, so it
 *  always starts from the saved goal. */
export function GoalDialog({ open, onOpenChange, data }: { open: boolean; onOpenChange: (v: boolean) => void; data: AppData }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88dvh] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-sm">
        {open && <GoalWizard onDone={() => onOpenChange(false)} data={data} />}
      </DialogContent>
    </Dialog>
  );
}

function GoalWizard({ onDone, data }: { onDone: () => void; data: AppData }) {
  const studyGoal = useAppStore((s) => s.studyGoal);
  const setStudyGoal = useAppStore((s) => s.setStudyGoal);
  const [step, setStep] = useState<1 | 2>(1);
  const [sel, setSel] = useState<StudyGoalKey | null>(studyGoal.goal);
  const [date, setDate] = useState<string | null>(studyGoal.examDate);
  const [calOpen, setCalOpen] = useState(false);
  const [focus, setFocus] = useState<string[]>(studyGoal.focus ?? []);
  const goal = GOALS.find((g) => g.key === sel);

  // topic chips: categories sorted by content volume (questions + cards)
  const cats = useMemo(() => {
    const m = new Map<string, number>();
    for (const q of data.questions) m.set(q.cat, (m.get(q.cat) ?? 0) + 1);
    for (const c of data.cards) m.set(c.cat, (m.get(c.cat) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [data]);

  const save = () => {
    void tapHaptic();
    if (!sel) return;
    setStudyGoal({ goal: sel, examDate: GOALS.find((g) => g.key === sel)?.examDate ? date || null : null, focus: focus.length ? focus : null });
    onDone();
    toast.success(focus.length ? `هدف ثبت شد — ${faNum(focus.length)} موضوع انتخابی ✓` : "هدف مطالعه ثبت شد ✓");
  };

  const toggleCat = (cat: string) => {
    void tapHaptic();
    setFocus((f) => (f.includes(cat) ? f.filter((x) => x !== cat) : [...f, cat]));
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* fixed step header */}
      <DialogHeader className="border-b px-5 pb-3 pt-5 ps-14 text-right">
        <div className="mb-1.5 flex items-center gap-1.5">
          {[1, 2].map((n) => (
            <span key={n} className={cn("h-1.5 w-6 rounded-full transition-colors", step >= n ? "bg-primary" : "bg-muted")} />
          ))}
          <span className="ms-1.5 text-[10px] font-bold text-muted-foreground">
            قدم {faNum(step)} از {faNum(2)}
          </span>
        </div>
        <DialogTitle className="text-base">{step === 1 ? "برای چه هدفی درس می‌خوانید؟" : "موضوعات موردنظر شما"}</DialogTitle>
      </DialogHeader>

      {/* scrollable body */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
        <div key={step} className="slide-up space-y-2">
          {step === 1 ? (
            <>
              {GOALS.map((g) => (
                <button
                  key={g.key}
                  onClick={() => {
                    void tapHaptic();
                    setSel(g.key);
                  }}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-2xl border-2 p-3 text-right transition-colors",
                    sel === g.key ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
                  )}
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <g.icon className="h-4.5 w-4.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold">{g.title}</span>
                    <span className="block text-[11px] leading-5 text-muted-foreground">{g.desc}</span>
                  </span>
                  {sel === g.key && <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
                </button>
              ))}

              {goal?.examDate && (
                <div>
                  <button
                    onClick={() => {
                      void tapHaptic();
                      setCalOpen((v) => !v);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-2xl border p-3 transition-colors",
                      calOpen ? "border-primary bg-primary/5" : "border-border"
                    )}
                  >
                    <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1 text-right">
                      <span className="block text-xs font-semibold">تاریخ آزمون (اختیاری)</span>
                      <span className={cn("block text-[12px] font-bold", date ? "text-primary" : "text-muted-foreground")}>
                        {date ? formatJalaliLong(date) : "برای شمارش معکوس انتخاب کنید"}
                      </span>
                    </span>
                    <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", calOpen && "rotate-180")} />
                  </button>
                  {calOpen && (
                    <div className="slide-up mt-2">
                      <JalaliCalendar value={date} onChange={(iso) => setDate(iso)} />
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              {/* chosen goal summary — tap to go back and change it */}
              <button
                onClick={() => {
                  void tapHaptic();
                  setStep(1);
                }}
                className="flex w-full items-center gap-2 rounded-2xl border bg-primary/5 p-3 text-right transition-colors"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  {goal ? <goal.icon className="h-4 w-4" /> : <ListChecks className="h-4 w-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold">{goal?.title ?? "هدف انتخاب نشده"}</span>
                  <span className="block text-[10px] text-muted-foreground">تغییر هدف یا تاریخ آزمون</span>
                </span>
                <ChevronLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
              </button>

              {/* topic picker with its own scroll area */}
              <div className="rounded-2xl border p-3">
                <div className="mb-1.5 flex items-center gap-2">
                  <ListChecks className="h-4 w-4 shrink-0 text-primary" />
                  <span className="text-xs font-bold">انتخاب موضوع‌ها</span>
                  <span className="mr-auto text-[10px] font-bold text-muted-foreground">
                    {focus.length ? `${faNum(focus.length)} موضوع انتخاب شده` : "همه موضوعات"}
                  </span>
                </div>
                <p className="mb-2.5 text-[11px] leading-5 text-muted-foreground">
                  اگر موضوع خاصی مدنظرتان است انتخابش کنید؛ برنامه مطالعه، آزمون‌ها و نکته‌ها فقط از همین موضوع‌ها ساخته می‌شوند.
                </p>
                <div className="max-h-[38dvh] overflow-y-auto overscroll-contain rounded-xl pe-1">
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => {
                        void tapHaptic();
                        setFocus([]);
                      }}
                      className={cn(
                        "rounded-xl border-2 px-2.5 py-1.5 text-[11px] font-bold transition-colors",
                        focus.length === 0 ? "border-primary bg-primary text-white" : "border-border text-muted-foreground"
                      )}
                    >
                      همه موضوعات
                    </button>
                    {cats.map(([cat, n]) => {
                      const on = focus.includes(cat);
                      return (
                        <button
                          key={cat}
                          onClick={() => toggleCat(cat)}
                          className={cn(
                            "rounded-xl border-2 px-2.5 py-1.5 text-[11px] font-bold transition-colors",
                            on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                          )}
                        >
                          {cat} <span className="text-[9px] font-black opacity-70">({faNum(n)})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                {focus.length > 0 && (
                  <p className="mt-2 text-[10px] font-bold text-primary">
                    {faNum(focus.length)} موضوع انتخاب شده — برای حذف، روی همان موضوع بزنید
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* sticky footer — always visible, never scrolls away */}
      <div className="flex items-center gap-2 border-t bg-background px-5 py-3">
        {step === 1 ? (
          <button
            onClick={() => {
              void tapHaptic();
              setStep(2);
            }}
            disabled={!sel}
            className="flex min-h-[46px] w-full items-center justify-center gap-1.5 rounded-2xl bg-primary font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-40"
          >
            ادامه <ChevronLeft className="h-4 w-4" />
          </button>
        ) : (
          <>
            <button
              onClick={() => {
                void tapHaptic();
                setStep(1);
              }}
              className="flex min-h-[46px] items-center justify-center gap-1 rounded-2xl border px-4 font-bold text-muted-foreground transition-colors"
            >
              <ChevronRight className="h-4 w-4" /> بازگشت
            </button>
            <button
              onClick={save}
              className="flex min-h-[46px] flex-1 items-center justify-center rounded-2xl bg-primary font-bold text-white transition-transform active:scale-[0.98]"
            >
              ثبت هدف{focus.length ? ` (${faNum(focus.length)} موضوع)` : ""}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
