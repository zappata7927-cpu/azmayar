// Keyboard-typing micro feedback: a ~6 ms, barely-there blip — weaker and
// shorter than any native click effect, like a soft key-press tick.
// Silently does nothing on web so the PWA experience is unchanged.
import { Capacitor } from "@capacitor/core";

let lastTick = 0;

/** ultra-soft key-press style blip for buttons / options / actions */
export async function tapHaptic(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const now = Date.now();
  if (now - lastTick < 120) return; // collapse double fires (direct call + global listener)
  lastTick = now;
  try {
    const { Haptics } = await import("@capacitor/haptics");
    // raw short vibration: 6 ms is both weaker and briefer than the native
    // impact effects (EFFECT_TICK runs ~20-30 ms) — closest to keyboard typing
    await Haptics.vibrate({ duration: 6 });
  } catch {
    // haptics unavailable (permission missing, unsupported device) — ignore
  }
}
