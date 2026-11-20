"use client";

import { useState } from "react";
import { BadgeCheck, CalendarDays, ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GOALS } from "@/lib/study-plan";
import { useAppStore, type StudyGoalKey } from "@/lib/store";
import { cn } from "@/lib/utils";
import { formatJalaliLong } from "@/lib/jalali";
import { JalaliCalendar } from "@/components/jalali-calendar";
import { tapHaptic } from "@/lib/haptics";
import { toast } from "sonner";

/** Pick a study goal (5 options) + optional exam date for exam-style goals.
 *  The picker remounts on every open, so it always starts from the saved goal. */
export function GoalDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-base">برای چه هدفی درس می‌خوانید؟</DialogTitle>
        </DialogHeader>
        {open && <GoalPicker onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function GoalPicker({ onDone }: { onDone: () => void }) {
  const studyGoal = useAppStore((s) => s.studyGoal);
  const setStudyGoal = useAppStore((s) => s.setStudyGoal);
  const [sel, setSel] = useState<StudyGoalKey | null>(studyGoal.goal);
  const [date, setDate] = useState<string | null>(studyGoal.examDate);
  const [calOpen, setCalOpen] = useState(false);
  const goal = GOALS.find((g) => g.key === sel);

  const save = () => {
    void tapHaptic();
    if (!sel) return;
    setStudyGoal({ goal: sel, examDate: GOALS.find((g) => g.key === sel)?.examDate ? date || null : null });
    onDone();
    toast.success("هدف مطالعه ثبت شد ✓");
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

      <button
        onClick={save}
        disabled={!sel}
        className="flex min-h-[46px] w-full items-center justify-center rounded-2xl bg-primary font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-40"
      >
        ثبت هدف
      </button>
      <p className="text-center text-[11px] leading-5 text-muted-foreground">
        برنامه هر روز بر اساس هدف، تاریخ آزمون، حجم محتوا و عملکرد شما ساخته می‌شود.
      </p>
    </div>
  );
}
