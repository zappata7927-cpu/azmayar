"use client";

import { useMemo, useState } from "react";
import {
  Stethoscope,
  ChevronLeft,
  RotateCcw,
  Info,
  AlertTriangle,
  ShieldAlert,
  BadgeCheck,
  ArrowUp,
  ArrowDown,
  Flame,
} from "lucide-react";
import type { AppData } from "@/lib/types";
import { PANELS, interpretPanel, INTERPRETATION_DISCLAIMER, type Sex, type PanelDef, type AnalyteResult } from "@/lib/interpretation";
import { cn, faNum } from "@/lib/utils";

const STATUS_STYLE: Record<string, { chip: string; border: string; text: string; icon: typeof BadgeCheck }> = {
  ok: { chip: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", border: "border-emerald-500/40", text: "text-emerald-600 dark:text-emerald-300", icon: BadgeCheck },
  low: { chip: "bg-sky-500/15 text-sky-700 dark:text-sky-300", border: "border-sky-500/40", text: "text-sky-600 dark:text-sky-300", icon: ArrowDown },
  high: { chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300", border: "border-amber-500/40", text: "text-amber-600 dark:text-amber-300", icon: ArrowUp },
  "critical-low": { chip: "bg-rose-500/15 text-rose-700 dark:text-rose-300", border: "border-rose-500/50", text: "text-rose-600 dark:text-rose-300", icon: AlertTriangle },
  "critical-high": { chip: "bg-rose-500/15 text-rose-700 dark:text-rose-300", border: "border-rose-500/50", text: "text-rose-600 dark:text-rose-300", icon: Flame },
};

const SEV_BANNER: Record<number, string> = {
  0: "bg-emerald-500/12 border-emerald-500/35 text-emerald-700 dark:text-emerald-300",
  1: "bg-amber-500/12 border-amber-500/35 text-amber-700 dark:text-amber-300",
  2: "bg-orange-500/12 border-orange-500/35 text-orange-700 dark:text-orange-300",
  3: "bg-rose-500/12 border-rose-500/40 text-rose-700 dark:text-rose-300",
};

function NumInput({ value, onChange, unit, label, refLabel }: {
  value: string;
  onChange: (v: string) => void;
  unit: string;
  label: string;
  refLabel: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label className="text-[13px] font-bold leading-6">{label}</label>
        <span className="shrink-0 text-[10px] text-muted-foreground">مرجع: {refLabel}</span>
      </div>
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          dir="ltr"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="—"
          className="h-11 w-full rounded-xl border bg-muted/40 px-3 text-left text-base font-semibold outline-none transition-colors focus:border-primary focus:bg-card"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground" dir="ltr">{unit}</span>
      </div>
    </div>
  );
}

function ResultCard({ label, unit, value, refLabel, r }: { label: string; unit: string; value: number; refLabel: string; r: AnalyteResult }) {
  const st = STATUS_STYLE[r.status] ?? STATUS_STYLE.ok;
  const Icon = st.icon;
  return (
    <div className={cn("rounded-2xl border-2 bg-card p-4 shadow-sm", st.border)}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-black", st.chip)}>
          <Icon className="h-3.5 w-3.5" /> {r.title}
        </span>
        <span className="text-xs text-muted-foreground" dir="ltr">{faNum(value)} {unit}</span>
        <span className="text-[10px] text-muted-foreground/70">مرجع: {refLabel}</span>
      </div>
      <p className={cn("mt-2 text-[13px] font-bold", st.text)}>{label}</p>
      <p className="mt-1 text-[13px] leading-7 text-foreground/85">{r.detail}</p>
      {r.advice.length > 0 && (
        <ul className="mt-2 space-y-1.5 rounded-xl bg-muted/50 p-3">
          {r.advice.map((a, i) => (
            <li key={i} className="flex items-start gap-2 text-xs leading-6 text-foreground/80">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
              {a}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function InterpretView({ data }: { data: AppData; navigate?: unknown }) {
  const [panelKey, setPanelKey] = useState<string | null>(null);
  const [sex, setSex] = useState<Sex>("male");
  const [age, setAge] = useState("");
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof interpretPanel> | null>(null);
  const [touched, setTouched] = useState(false);

  const panel: PanelDef | undefined = useMemo(() => PANELS.find((p) => p.key === panelKey), [panelKey]);
  const ageNum = parseInt(age, 10);

  const startPanel = (key: string) => {
    setPanelKey(key);
    setInputs({});
    setResult(null);
    setTouched(false);
  };

  const compute = () => {
    if (!panel) return;
    setTouched(true);
    const values: Record<string, number> = {};
    for (const a of panel.analytes) {
      const raw = inputs[a.key];
      if (raw != null && raw.trim() !== "") {
        const n = parseFloat(raw);
        if (!Number.isNaN(n) && n > 0 && n < 100000) values[a.key] = n;
      }
    }
    const anyValue = Object.keys(values).length > 0;
    if (!anyValue) {
      setResult(null);
      return;
    }
    setResult(interpretPanel(panel, values, sex, Number.isFinite(ageNum) && ageNum > 0 && ageNum < 120 ? ageNum : undefined));
  };

  return (
    <div className="space-y-5">
      {/* hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-bl from-teal-700 via-teal-600 to-teal-500 p-5 text-white shadow-lg">
        <div className="absolute -left-10 -top-10 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-100/90">
            <Stethoscope className="h-4 w-4" /> تفسیر بالینی نتایج آزمایش
          </div>
          <h1 className="mt-1.5 text-[1.4rem] font-black leading-snug">اعداد آزمایش‌تان را وارد کنید</h1>
          <p className="mt-2 text-sm leading-6 text-teal-50/90">
            بر اساس مقادیر مرجع استاندارد، معنای هر عدد، الگوی ترکیبی یافته‌ها و پیشنهاد گام بعدی را به‌صورت آموزشی توضیح می‌دهیم.
          </p>
        </div>
      </section>

      {/* panel picker */}
      {!panel && (
        <section>
          <h2 className="mb-3 text-[15px] font-bold">انتخاب پنل آزمایش</h2>
          <div className="grid grid-cols-2 gap-3">
            {PANELS.map((p) => (
              <button
                key={p.key}
                onClick={() => startPanel(p.key)}
                className="flex flex-col gap-2 rounded-2xl border bg-card p-4 text-right shadow-sm transition-transform active:scale-[0.98]"
              >
                <span className="text-2xl">{p.emoji}</span>
                <span className="text-sm font-bold leading-6">{p.title}</span>
                <span className="text-[11px] leading-5 text-muted-foreground">{p.desc}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* panel form */}
      {panel && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setPanelKey(null); setResult(null); }}
              className="flex items-center gap-1.5 rounded-xl border bg-card px-3 py-2 text-xs font-bold"
            >
              <RotateCcw className="h-3.5 w-3.5" /> تغییر پنل
            </button>
            <h2 className="flex items-center gap-2 text-[15px] font-bold">
              <span>{panel.emoji}</span> {panel.title}
            </h2>
          </div>

          {panel.needSex && (
            <div className="rounded-2xl border bg-card p-3.5 shadow-sm">
              <p className="mb-2 text-[13px] font-bold">جنسیت (بازه‌های مرجع متفاوت است)</p>
              <div className="grid grid-cols-2 gap-2">
                {(["male", "female"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSex(s)}
                    className={cn(
                      "rounded-xl border py-2.5 text-sm font-bold transition-colors",
                      sex === s ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                    )}
                  >
                    {s === "male" ? "مرد" : "زن"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {panel.needAge && (
            <div className="grid grid-cols-2 gap-3">
              <NumInput value={age} onChange={setAge} unit="سال" label="سن" refLabel="برای بازه‌های سنی" />
            </div>
          )}

          <section className="rounded-2xl border bg-card p-4 shadow-sm">
            <p className="mb-3 text-[13px] leading-6 text-muted-foreground">
              فقط مواردی که نتیجه‌شان را دارید وارد کنید؛ باقی موارد خالی بماند.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {panel.analytes.map((a) => (
                <NumInput
                  key={a.key}
                  label={a.label}
                  unit={a.unit}
                  refLabel={a.refLabel}
                  value={inputs[a.key] ?? ""}
                  onChange={(v) => setInputs((s) => ({ ...s, [a.key]: v }))}
                />
              ))}
            </div>
            <button
              onClick={compute}
              className="mt-4 flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-primary font-bold text-white transition-transform active:scale-[0.99]"
            >
              <Stethoscope className="h-5 w-5" /> تفسیر کن
            </button>
            {touched && Object.keys(inputs).filter((k) => (inputs[k] ?? "").trim() !== "").length === 0 && (
              <p className="mt-2 text-xs font-semibold text-amber-600 dark:text-amber-400">حداقل یک مقدار را وارد کنید.</p>
            )}
          </section>

          {/* results */}
          {result && (
            <div className="space-y-3.5">
              <div className={cn("slide-up rounded-2xl border-2 p-4", SEV_BANNER[result.overallSeverity])}>
                <p className="flex items-center gap-2 text-sm font-black">
                  <ShieldAlert className="h-4.5 w-4.5" /> خلاصه تفسیر
                </p>
                <p className="mt-1.5 text-[13px] leading-7">{result.summary}</p>
              </div>

              {result.patterns.map((p, i) => (
                <div key={i} className={cn("slide-up rounded-2xl border-2 p-4", SEV_BANNER[p.severity])}>
                  <p className="flex items-center gap-2 text-sm font-black">
                    <Info className="h-4.5 w-4.5" /> {p.title}
                  </p>
                  <p className="mt-1.5 text-[13px] leading-7">{p.detail}</p>
                </div>
              ))}

              {result.results.map(({ analyte, value, result: r }) => (
                <ResultCard key={analyte.key} label={analyte.label} unit={analyte.unit} value={value} refLabel={analyte.refLabel} r={r} />
              ))}

              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/8 p-4">
                <p className="mb-1.5 flex items-center gap-1.5 text-[13px] font-black text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" /> سلب مسئولیت
                </p>
                <p className="text-xs leading-6 text-foreground/80">{INTERPRETATION_DISCLAIMER}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
