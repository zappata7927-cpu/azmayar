// Crisp tap feedback: a short-but-strong native "knock" (heavy impact pulse —
// more punch than a raw vibration, and over in a blink, like a small tap).
// Silently does nothing on web so the PWA experience is unchanged.
import { Capacitor } from "@capacitor/core";

let lastTick = 0;

/** short, punchy tap for buttons / options / actions */
export async function tapHaptic(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const now = Date.now();
  if (now - lastTick < 120) return; // collapse double fires (direct call + global listener)
  lastTick = now;
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    // heavy impact = one strong, very short knock: the native engine renders it
    // as a crisp high-energy pulse instead of a long buzz
    await Haptics.impact({ style: ImpactStyle.Heavy });
  } catch {
    // haptics unavailable (permission missing, unsupported device) — ignore
  }
}
