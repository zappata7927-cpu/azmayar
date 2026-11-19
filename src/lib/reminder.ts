// Smart daily reminder: if the user has not opened the app by the evening,
// a friendly local notification nudges them back. Tapping the notification
// opens the app (default plugin behaviour on Android).
//
// Strategy: every time the app is opened/resumed we cancel any pending
// reminder and schedule a fresh one for tomorrow evening. So a reminder only
// ever fires on a day the user did NOT visit the app.

import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

const CHANNEL_ID = "azmayar-reminder";
const NOTIF_ID = 1001;
const HOUR = 20;
const MIN = 30;

const REMINDER_TEXTS: string[] = [
  "امروز به آزمـیار سر نزدی! نکنه با کارت‌های لایتنر قهر کردی؟ 😄",
  "جعبه‌های لایتنر دارن خمیازه می‌کشن… بیا یه مرور سریع بزنیم! 📚",
  "فقط ۵ دقیقه! یه مرور کوچیک امروز، یه نتیجه بزرگ فردا 🎯",
  "سلام! کارت‌های امروز منتظرتن؛ نذار یادگیری فرار کنه 🧠",
  "آزمـیار منتظرته! امروز چند تا کارت جواب می‌دی؟ 💪",
  "یادت نره: مرور امروز بهترین سرمایه‌گذاری ۵ دقیقه‌ای زندگیه ⏰",
  "می‌دونستی مرور امروز می‌تونه نمره فردا رو نجات بده؟ بیا شروع کنیم 🚀",
  "کارت‌های «بلد نبودم» دیشب زنگ زدن: بیا دوباره امتحانم کن! 🃏",
  "یه خبر خوب: امروز هم می‌تونی یه قدم جلوتر بری! کارت‌ها آماده‌ن ✨",
  "لایتنر می‌گه: تکرار، راز ماندگاریه! بیا امروز رو جا نندازیم 🌟",
];

function nextScheduleTime(): Date {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  t.setHours(HOUR, MIN + Math.floor(Math.random() * 40), Math.floor(Math.random() * 60), 0);
  return t;
}

/** idempotent: safe to call on every app open/resume */
export async function initReminder(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    // Android 13+ runtime permission
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== "granted") {
      const req = await LocalNotifications.requestPermissions();
      if (req.display !== "granted") return;
    }

    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: "یادآور مرور روزانه",
      description: "یادآور دوستانه برای مرور کارت‌های لایتنر",
      importance: 4, // high
      visibility: 1, // public
      vibration: true,
      lights: true,
      lightColor: "#2E86C1",
    });

    // cancel any pending reminder from a previous session
    await LocalNotifications.cancel({ notifications: [{ id: NOTIF_ID }] });

    await LocalNotifications.schedule({
      notifications: [
        {
          id: NOTIF_ID,
          title: "آزمـیار 🧠",
          body: REMINDER_TEXTS[Math.floor(Math.random() * REMINDER_TEXTS.length)],
          schedule: { at: nextScheduleTime(), allowWhileIdle: true },
          channelId: CHANNEL_ID,
        },
      ],
    });
  } catch {
    // notifications unavailable (e.g. permission denied) — silently skip
  }
}
