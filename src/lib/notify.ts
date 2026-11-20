// Local notification reminders (v1.6.2) — they fire while the app is closed:
//  • «دسته آزمون باز شد» — one notification per locked quiz batch of the today
//    plan, scheduled at its unlock moment (the 30-minute cooldown chain).
//  • Daily absence reminder — rescheduled at EVERY app open for 20:00 the next
//    day, so it only actually fires when a whole day passes without opening.
// Native only (the APK); every call is wrapped so a failure can never break UI.
import { Capacitor } from "@capacitor/core";

const CHANNEL_ID = "azmayar-reminders";
/** fixed id of the daily «یادت نره» reminder (same-id reschedule on every open) */
export const DAILY_REMINDER_ID = 1001;
/** pending unlock notifications live in this id range — canceled/rescheduled wholesale */
const UNLOCK_ID_BASE = 2000;
const UNLOCK_ID_MAX = 2099;
const DAILY_REMINDER_HOUR = 20;
/** Android channel importance — 4 = High (heads-up popup) */
const IMPORTANCE_HIGH = 4;

const native = () => Capacitor.isNativePlatform();

async function plugin() {
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  return LocalNotifications;
}

let channelReady = false;

async function ensureChannel(Local: Awaited<ReturnType<typeof plugin>>) {
  if (channelReady) return;
  try {
    await Local.createChannel({
      id: CHANNEL_ID,
      name: "یادآور آزمـیار",
      description: "یادآور باز شدن دسته‌های آزمون و برنامه امروز",
      importance: IMPORTANCE_HIGH,
    });
  } catch {
    // channel may already exist / not needed on iOS — harmless
  }
  channelReady = true;
}

/** ask (once) for the Android 13+ notification permission; true when granted */
export async function ensureNotifPermission(): Promise<boolean> {
  if (!native()) return false;
  try {
    const Local = await plugin();
    const cur = await Local.checkPermissions();
    if (cur.display === "granted") return true;
    if (cur.display === "prompt") {
      const res = await Local.requestPermissions();
      return res.display === "granted";
    }
    return false;
  } catch {
    return false;
  }
}

/** schedule one notification at `at` — silently skips past moments */
async function scheduleNotif(id: number, title: string, body: string, at: Date): Promise<void> {
  if (!native() || at.getTime() <= Date.now() + 5000) return;
  try {
    const Local = await plugin();
    await ensureChannel(Local);
    await Local.schedule({
      notifications: [{ id, title, body, schedule: { at, allowWhileIdle: true }, channelId: CHANNEL_ID }],
    });
  } catch {
    // notifications unavailable — reminders are best-effort, never critical
  }
}

export async function cancelNotifs(ids: number[]): Promise<void> {
  if (!native() || ids.length === 0) return;
  try {
    (await plugin()).cancel({ notifications: ids.map((id) => ({ id })) });
  } catch {
    // nothing to cancel / not available — ignore
  }
}

function unlockNotifIds(): number[] {
  return Array.from({ length: UNLOCK_ID_MAX - UNLOCK_ID_BASE + 1 }, (_, i) => UNLOCK_ID_BASE + i);
}

/** reschedule unlock notifications for the currently locked quiz batches of the
 *  today plan — stale ones (already unlocked, or from a changed plan) are
 *  canceled first so the pending set always mirrors what the user sees */
export async function scheduleUnlockNotifs(items: { title: string; unlockAt: number }[]): Promise<void> {
  await cancelNotifs(unlockNotifIds());
  const list = items.slice(0, UNLOCK_ID_MAX - UNLOCK_ID_BASE + 1);
  for (let i = 0; i < list.length; i++) {
    await scheduleNotif(
      UNLOCK_ID_BASE + i,
      "دسته آزمون باز شد 🔓",
      `دسته «${list[i].title}» در برنامه امروز باز شد — ادامه بده!`,
      new Date(list[i].unlockAt)
    );
  }
}

/** the daily absence reminder: rescheduled at every app open for 20:00 the next
 *  day — opening the app daily keeps overwriting it, so it only fires after a
 *  genuinely skipped day */
export async function scheduleDailyReminder(): Promise<void> {
  await cancelNotifs([DAILY_REMINDER_ID]);
  const at = new Date();
  at.setDate(at.getDate() + 1);
  at.setHours(DAILY_REMINDER_HOUR, 0, 0, 0);
  await scheduleNotif(
    DAILY_REMINDER_ID,
    "یادت نره! 📚",
    "برنامه امروز و دسته‌های آزمون منتظرت است — یه سر به آزمـیار بزن!",
    at
  );
}

/** turn everything off (used by the settings switch) */
export async function cancelReminders(): Promise<void> {
  await cancelNotifs([DAILY_REMINDER_ID, ...unlockNotifIds()]);
}
