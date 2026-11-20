"use client";

import { useMemo, useState } from "react";
import { BadgeCheck, CalendarDays, ChevronDown, ListChecks } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GOALS } from "@/lib/study-plan";
import { useAppStore, type StudyGoalKey } from "@/lib/store";
import type { AppData } from "@/lib/types";
import { cn, faNum } from "@/lib/utils";
import { formatJalaliLong } from "@/lib/jalali";
import { JalaliCalendar } from "@/components/jalali-calendar";
import { tapHaptic } from "@/lib/haptics";
import { toast } from "sonner";

/** Pick a study goal (5 options) + optional Jalali exam date + the topics the
 *  whole plan/tips/quiz content should scope to (empty = all topics).
 *  The picker remounts on every open, so it always starts from the saved goal. */
export function GoalDialog({ open, onOpenChange, data }: { open: boolean; onOpenChange: (v: boolean) => void; data: AppData }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-base">برای چه هدفی درس می‌خوانید؟</DialogTitle>
        </DialogHeader>
        {open && <GoalPicker onDone={() => onOpenChange(false)} data={data} />}
      </DialogContent>
    </Dialog>
  );
}

function GoalPicker({ onDone, data }: { onDone: () => void; data: AppData }) {
  const studyGoal = useAppStore((s) => s.studyGoal);
  const setStudyGoal = useAppStore((s) => s.setStudyGoal);
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
    <div className="space-y-2">
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

      {/* topics the whole experience scopes to */}
      <div className="rounded-2xl border p-3">
        <div className="mb-1.5 flex items-center gap-2">
          <ListChecks className="h-4 w-4 shrink-0 text-primary" />
          <span className="text-xs font-bold">موضوعات موردنظر شما</span>
          <span className="mr-auto text-[10px] font-bold text-muted-foreground">
            {focus.length ? `${faNum(focus.length)} موضوع انتخاب شده` : "همه موضوعات"}
          </span>
        </div>
        <p className="mb-2.5 text-[11px] leading-5 text-muted-foreground">
          اگر موضوع خاصی مدنظرتان است انتخابش کنید؛ برنامه مطالعه، آزمون‌ها و نکته‌ها فقط از همین موضوع‌ها ساخته می‌شوند.
        </p>
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

      <button
        onClick={save}
        disabled={!sel}
        className="flex min-h-[46px] w-full items-center justify-center rounded-2xl bg-primary font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-40"
      >
        ثبت هدف
      </button>
      <p className="text-center text-[11px] leading-5 text-muted-foreground">
        برنامه هر روز بر اساس هدف، موضوعات، تاریخ آزمون، حجم محتوا و عملکرد شما ساخته می‌شود.
      </p>
    </div>
  );
}
