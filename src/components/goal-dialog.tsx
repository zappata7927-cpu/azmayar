"use client";

import { useState } from "react";
import { BadgeCheck, CalendarDays } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GOALS } from "@/lib/study-plan";
import { useAppStore, type StudyGoalKey } from "@/lib/store";
import { cn } from "@/lib/utils";
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
  const [date, setDate] = useState(studyGoal.examDate ?? "");
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
        <label className="flex items-center gap-2 rounded-2xl border p-3">
          <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
          <span className="shrink-0 text-xs font-semibold">تاریخ آزمون (اختیاری)</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            dir="ltr"
            className="min-w-0 flex-1 rounded-lg border bg-muted/50 px-2 py-1.5 text-xs"
          />
        </label>
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
