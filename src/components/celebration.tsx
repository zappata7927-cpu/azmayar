"use client";

import { useEffect, useMemo, useState } from "react";

const RIBBON_COLORS = ["#10b981", "#38bdf8", "#f59e0b", "#f43f5e", "#a78bfa", "#f97316", "#14b8a6"];

/** «آفرین!» celebration (v1.6.1) — a perfect 100% quiz greets the user with an
 *  animated SVG smiley-star (spinning rays, pulsing, blinking eyes, smile that
 *  draws itself) while colorful confetti ribbons rain from the top for a few
 *  seconds. Pure CSS/SVG — no dependency, then it removes itself. */
export function Celebration() {
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setGone(true), 4400);
    return () => clearTimeout(t);
  }, []);

  // deterministic pseudo-random ribbons (left / delay / duration / size / color)
  const ribbons = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        left: (i * 3.85 + ((i * 37) % 5)) % 100,
        delay: (i % 9) * 0.16 + ((i * 13) % 7) * 0.05,
        dur: 2.3 + ((i * 29) % 10) / 8,
        w: 5 + ((i * 17) % 5),
        h: 14 + ((i * 23) % 10),
        color: RIBBON_COLORS[i % RIBBON_COLORS.length],
        rot: (i * 53) % 360,
      })),
    []
  );

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
        {/* soft warm glow behind the badge */}
        <div className="celebrate-glow absolute h-72 w-72 rounded-full bg-amber-300/35 blur-3xl dark:bg-amber-400/20" />

        <div className="celebrate-pop relative flex flex-col items-center">
          <svg viewBox="0 0 120 120" className="h-36 w-36 drop-shadow-lg">
            {/* spinning rays */}
            <g className="celebrate-rays" style={{ transformOrigin: "60px 60px" }}>
              {Array.from({ length: 12 }).map((_, i) => (
                <rect key={i} x="57.5" y="4" width="5" height="14" rx="2.5" fill="#f59e0b" opacity={0.7} transform={`rotate(${i * 30} 60 60)`} />
              ))}
            </g>
            {/* smiling star */}
            <path
              d="M60 16 L70.6 44.8 L101.6 46.2 L77.6 65.4 L86.2 95.2 L60 78.4 L33.8 95.2 L42.4 65.4 L18.4 46.2 L49.4 44.8 Z"
              fill="#fbbf24"
              stroke="#f59e0b"
              strokeWidth="3"
              strokeLinejoin="round"
              className="celebrate-star"
              style={{ transformOrigin: "60px 62px" }}
            />
            {/* face — eyes blink, smile draws itself */}
            <circle cx="51" cy="58" r="3.2" fill="#7c2d12" className="celebrate-eye" />
            <circle cx="69" cy="58" r="3.2" fill="#7c2d12" className="celebrate-eye" />
            <path d="M50 67 Q60 76 70 67" fill="none" stroke="#7c2d12" strokeWidth="3.4" strokeLinecap="round" className="celebrate-smile" />
            {/* cheeks */}
            <circle cx="44.5" cy="64.5" r="3.6" fill="#fb7185" opacity="0.5" />
            <circle cx="75.5" cy="64.5" r="3.6" fill="#fb7185" opacity="0.5" />
          </svg>
          <p className="celebrate-pop mt-1 rounded-2xl bg-card/95 px-7 py-2.5 text-2xl font-black text-amber-600 shadow-lg dark:text-amber-400">
            آفرین!
          </p>
          <p className="celebrate-pop mt-2 rounded-xl bg-card/90 px-4 py-1.5 text-xs font-bold text-emerald-600 shadow dark:text-emerald-400">
            همه پاسخ‌ها درست بود — فوق‌العاده‌ای!
          </p>
        </div>
      </div>
    </div>
  );
}
