// Whisper-light tap feedback: one tiny native "tick" — the faintest, shortest
// pulse the engine offers (barely a dot under the finger, over in a blink).
// Silently does nothing on web so the PWA experience is unchanged.
import { Capacitor } from "@capacitor/core";

let lastTick = 0;

/** ultra-light micro-tick for buttons / options / actions */
export async function tapHaptic(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const now = Date.now();
  if (now - lastTick < 120) return; // collapse double fires (direct call + global listener)
  lastTick = now;
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    // light impact = the subtle native tick (EFFECT_TICK on Android): a tiny,
    // low-energy dot of a pulse — far weaker and shorter than a vibration
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    // haptics unavailable (permission missing, unsupported device) — ignore
  }
}
