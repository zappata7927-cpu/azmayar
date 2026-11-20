// Subtle tap feedback: a tiny ~10 ms tick so the user just *feels* the press,
// never a strong buzz. Uses the native haptics engine on Android/iOS; silently
// does nothing on web so the PWA experience is unchanged.
import { Capacitor } from "@capacitor/core";

let lastTick = 0;

/** very light "tick" for taps on buttons / options / actions */
export async function tapHaptic(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const now = Date.now();
  if (now - lastTick < 120) return; // collapse double fires (direct call + global listener)
  lastTick = now;
  try {
    const { Haptics } = await import("@capacitor/haptics");
    await Haptics.vibrate({ duration: 10 });
  } catch {
    // haptics unavailable (permission missing, unsupported device) — ignore
  }
}
