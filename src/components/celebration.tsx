"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export type ResultTier = "perfect" | "good" | "effort" | "oops";

/** accuracy 0..100 → animation tier (v1.6.3): 100% perfect «آفرین!» ·
 *  50-99% good «ادامه بده!» · 1-49% needs-more-effort · 0% all-wrong */
export function tierForPct(pct: number): ResultTier {
  if (pct >= 100) return "perfect";
  if (pct >= 50) return "good";
  if (pct > 0) return "effort";
  return "oops";
}

const ALL_COLORS = ["#10b981", "#38bdf8", "#f59e0b", "#f43f5e", "#a78bfa", "#f97316", "#14b8a6"];
const SOFT_COLORS = ["#34d399", "#38bdf8", "#fbbf24", "#a7f3d0"];

const TIER: Record<
  ResultTier,
  { title: string; sub: string; titleCls: string; subCls: string; glowCls: string; colors: string[]; size: string }
> = {
  perfect: {
    title: "آفرین!",
    sub: "همه درست بود — فوق‌العاده‌ای!",
    titleCls: "text-amber-600 dark:text-amber-400",
    subCls: "text-emerald-600 dark:text-emerald-400",
    glowCls: "bg-amber-300/35 dark:bg-amber-400/20",
    colors: ALL_COLORS,
    size: "h-36 w-36",
  },
  good: {
    title: "آفرین، ادامه بده!",
    sub: "بیشترش درست بود — همین‌طور پیش برو!",
    titleCls: "text-emerald-600 dark:text-emerald-400",
    subCls: "text-teal-600 dark:text-teal-400",
    glowCls: "bg-emerald-300/30 dark:bg-emerald-400/15",
    colors: SOFT_COLORS,
    size: "h-32 w-32",
  },
  effort: {
    title: "نیاز به یه تلاش بیشتره!",
    sub: "اشتباه‌ها پله‌ی یادگیری‌اند — برگرد و دوباره تلاش کن!",
    titleCls: "text-orange-600 dark:text-orange-400",
    subCls: "text-amber-600 dark:text-amber-400",
    glowCls: "bg-orange-300/30 dark:bg-orange-400/15",
    colors: [],
    size: "h-32 w-32",
  },
  oops: {
    title: "اشکالی نداره!",
    sub: "همه از جایی شروع می‌کنند — مطلب را بخوان و برگرد!",
    titleCls: "text-sky-600 dark:text-sky-400",
    subCls: "text-muted-foreground",
    glowCls: "bg-sky-300/25 dark:bg-sky-400/15",
    colors: [],
    size: "h-32 w-32",
  },
};

/* ---------- per-tier animated SVG art (pure SVG/CSS, no dependency) ---------- */

/** perfect: smiling star with spinning rays, blinking eyes, self-drawing smile */
function PerfectArt() {
  return (
    <>
      <g className="celebrate-rays" style={{ transformOrigin: "60px 60px" }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <rect key={i} x="57.5" y="4" width="5" height="14" rx="2.5" fill="#f59e0b" opacity={0.7} transform={`rotate(${i * 30} 60 60)`} />
        ))}
      </g>
      <path
        d="M60 16 L70.6 44.8 L101.6 46.2 L77.6 65.4 L86.2 95.2 L60 78.4 L33.8 95.2 L42.4 65.4 L18.4 46.2 L49.4 44.8 Z"
        fill="#fbbf24"
        stroke="#f59e0b"
        strokeWidth="3"
        strokeLinejoin="round"
        className="celebrate-star"
        style={{ transformOrigin: "60px 62px" }}
      />
      <circle cx="51" cy="58" r="3.2" fill="#7c2d12" className="celebrate-eye" />
      <circle cx="69" cy="58" r="3.2" fill="#7c2d12" className="celebrate-eye" />
      <path d="M50 67 Q60 76 70 67" fill="none" stroke="#7c2d12" strokeWidth="3.4" strokeLinecap="round" className="celebrate-smile" />
      <circle cx="44.5" cy="64.5" r="3.6" fill="#fb7185" opacity="0.5" />
      <circle cx="75.5" cy="64.5" r="3.6" fill="#fb7185" opacity="0.5" />
    </>
  );
}

/** good: star-eyed smiley with twinkling sparkles and a self-drawing smile */
function GoodArt() {
  return (
    <>
      <circle cx="60" cy="62" r="44" fill="#10b981" stroke="#059669" strokeWidth="3.5" />
      {/* star eyes, twinkling in turn */}
      <path d="M48 46 L50 51 L55 53 L50 55 L48 60 L46 55 L41 53 L46 51 Z" fill="#fbbf24" className="fx-twinkle" />
      <path d="M72 46 L74 51 L79 53 L74 55 L72 60 L70 55 L65 53 L70 51 Z" fill="#fbbf24" className="fx-twinkle" style={{ animationDelay: "0.5s" }} />
      <path d="M48 70 Q60 82 72 70" fill="none" stroke="#065f46" strokeWidth="3.5" strokeLinecap="round" className="celebrate-smile" />
      <circle cx="42" cy="67" r="4" fill="#6ee7b7" opacity="0.75" />
      <circle cx="78" cy="67" r="4" fill="#6ee7b7" opacity="0.75" />
      {/* sparkles around */}
      <path d="M98 32 L99.5 36 L103 37.5 L99.5 39 L98 43 L96.5 39 L93 37.5 L96.5 36 Z" fill="#fbbf24" className="fx-twinkle" style={{ animationDelay: "1s" }} />
      <path d="M22 38 L23.5 42 L27 43.5 L23.5 45 L22 49 L20.5 45 L17 43.5 L20.5 42 Z" fill="#34d399" className="fx-twinkle" style={{ animationDelay: "1.4s" }} />
    </>
  );
}

/** effort: rocket climbing with a flickering flame — keep going, you'll get there */
function EffortArt() {
  return (
    <>
      {/* speed puffs behind */}
      <circle cx="30" cy="86" r="3" fill="#fdba74" opacity="0.7" className="fx-twinkle" />
      <circle cx="24" cy="72" r="2.4" fill="#fdba74" opacity="0.5" className="fx-twinkle" style={{ animationDelay: "0.7s" }} />
      <g className="fx-rise">
        <g transform="rotate(45 60 60)">
          {/* flame (drawn first so the body overlays its root) */}
          <g className="fx-flame">
            <path d="M53 66 Q60 92 67 66 Z" fill="#fbbf24" />
            <path d="M57 66 Q60 80 63 66 Z" fill="#fef3c7" />
          </g>
          {/* body */}
          <path d="M60 18 C70 30 75 50 75 66 L45 66 C45 50 50 30 60 18 Z" fill="#f97316" stroke="#ea580c" strokeWidth="3" strokeLinejoin="round" />
          {/* window */}
          <circle cx="60" cy="48" r="7.5" fill="#fff7ed" stroke="#ea580c" strokeWidth="2.5" />
          {/* fins */}
          <path d="M45 58 L34 78 L46 70 Z" fill="#ea580c" />
          <path d="M75 58 L86 78 L74 70 Z" fill="#ea580c" />
        </g>
      </g>
    </>
  );
}

/** oops: friendly rain cloud (closed eyes) — and a sprout growing after the rain */
function OopsArt() {
  return (
    <>
      <g className="fx-sway">
        <g fill="#94a3b8">
          <circle cx="45" cy="44" r="15" />
          <circle cx="64" cy="38" r="18" />
          <circle cx="82" cy="48" r="12" />
          <rect x="34" y="42" width="56" height="20" rx="10" />
        </g>
        {/* closed eyes + tiny smile — kind, not sad */}
        <path d="M50 46 Q53 49 56 46" fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M68 44 Q71 47 74 44" fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M58 52 Q62 55 66 52" fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
      </g>
      {/* rain */}
      <ellipse cx="46" cy="72" rx="2.4" ry="4" fill="#38bdf8" className="fx-drop" />
      <ellipse cx="60" cy="76" rx="2.4" ry="4" fill="#38bdf8" className="fx-drop" style={{ animationDelay: "0.45s" }} />
      <ellipse cx="74" cy="72" rx="2.4" ry="4" fill="#38bdf8" className="fx-drop" style={{ animationDelay: "0.9s" }} />
      {/* sprout growing after the rain */}
      <g className="fx-grow">
        <path d="M60 114 L60 102" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <path d="M60 106 C55 102 50 103 48 107 C52 109 57 108 60 106 Z" fill="#22c55e" />
        <path d="M60 104 C65 100 70 101 72 105 C68 107 63 106 60 104 Z" fill="#4ade80" />
      </g>
    </>
  );
}

/** Tiered result animation (v1.6.1→v1.6.3) — the accuracy tier picks its own
 *  animated SVG badge, message and confetti: perfect → star + full ribbons,
 *  good → star-eyed smiley + soft ribbons, effort → climbing rocket,
 *  oops → rain cloud with a growing sprout. Pure CSS/SVG, self-removing. */
export function Celebration({ tier = "perfect" }: { tier?: ResultTier }) {
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setGone(true), 4400);
    return () => clearTimeout(t);
  }, []);

  const s = TIER[tier];
  // deterministic pseudo-random ribbons (left / delay / duration / size / color)
  const ribbons = useMemo(() => {
    const n = s.colors.length === 0 ? 0 : tier === "perfect" ? 26 : 14;
    return Array.from({ length: n }, (_, i) => ({
      left: (i * (tier === "perfect" ? 3.85 : 7.2) + ((i * 37) % 5)) % 100,
      delay: (i % 9) * 0.16 + ((i * 13) % 7) * 0.05,
      dur: (tier === "perfect" ? 2.3 : 2.6) + ((i * 29) % 10) / 8,
      w: 5 + ((i * 17) % 5),
      h: 14 + ((i * 23) % 10),
      color: s.colors[i % s.colors.length],
      rot: (i * 53) % 360,
    }));
  }, [tier, s.colors]);

  if (gone) return null;

  return (
    <div className="celebrate-overlay pointer-events-none fixed inset-0 z-[80] overflow-hidden" aria-hidden>
      {/* confetti ribbons falling from the top */}
      {ribbons.map((r, i) => (
        <span
          key={i}
          className="confetti-piece absolute top-0 block rounded-[3px]"
          style={{
            left: `${r.left}%`,
            width: r.w,
            height: r.h,
            background: r.color,
            animationDelay: `${r.delay}s`,
            animationDuration: `${r.dur}s`,
            ["--rot" as string]: `${r.rot}deg`,
          }}
        />
      ))}

      <div className="absolute inset-0 grid place-items-center">
        {/* soft glow behind the badge */}
        <div className={cn("celebrate-glow absolute h-72 w-72 rounded-full blur-3xl", s.glowCls)} />

        <div className="celebrate-pop relative flex flex-col items-center">
          <svg viewBox="0 0 120 120" className={cn(s.size, "drop-shadow-lg")}>
            {tier === "perfect" && <PerfectArt />}
            {tier === "good" && <GoodArt />}
            {tier === "effort" && <EffortArt />}
            {tier === "oops" && <OopsArt />}
          </svg>
          <p className={cn("celebrate-pop mt-1 rounded-2xl bg-card/95 px-7 py-2.5 shadow-lg font-black", tier === "perfect" ? "text-2xl" : "text-xl", s.titleCls)}>
            {s.title}
          </p>
          <p className={cn("celebrate-pop mt-2 rounded-xl bg-card/90 px-4 py-1.5 text-xs font-bold shadow", s.subCls)}>
            {s.sub}
          </p>
        </div>
      </div>
    </div>
  );
}
