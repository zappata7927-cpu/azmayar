// Subtle iPhone-like tap feedback. Uses the native haptics engine on Android/iOS;
// silently does nothing on web so the PWA experience is unchanged.
import { Capacitor } from "@capacitor/core";

/** very light "tick" for taps on options / actions (iOS-style subtle feedback) */
export async function tapHaptic(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    // haptics unavailable (permission missing, unsupported device) — ignore
  }
}
