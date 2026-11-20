// Bridge between the app and the native Android home-screen Leitner widget.
// On web (browser / PWA) all calls are no-op.
//
// Design (v1.2.3 hardening):
//  - Every native write (widget answer or app push) bumps a "rev" counter.
//  - loadState() returns { value, rev }; the app merges only when rev changed,
//    so widget-side answers are never missed, even if JS visibility events fail.
//  - The native plugin fires a "widgetChanged" event on every Android onResume,
//    giving a guaranteed pull trigger that does not depend on the WebView.
//  - All pull/push calls run through a sequential queue so an in-flight push can
//    never land after (and clobber) a fresh pull.
//  - No push may run before the first successful pull of this session.

import { registerPlugin, Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { App } from "@capacitor/app";
import { toast } from "sonner";
import { useAppStore, type LeitnerState } from "./store";

export interface LeitnerBridgePlugin {
  saveState(opts: { value: string }): Promise<{ ok?: boolean; rev?: number }>;
  loadState(): Promise<{ value: string | null; rev?: number }>;
  addListener(eventName: "widgetChanged", cb: () => void): Promise<PluginListenerHandle>;
}

const LeitnerBridge = registerPlugin<LeitnerBridgePlugin>("LeitnerBridge", {
  web: {
    async saveState() { return {}; },
    async loadState() { return { value: null }; },
    async addListener() {
      return { remove: async () => {} } as PluginListenerHandle;
    },
  },
});

export const isNativeApp = (): boolean => Capacitor.isNativePlatform();

export function serializeLeitner(st: Record<string, LeitnerState>): string {
  const out: Record<string, { box: number; due: number; updatedAt: number }> = {};
  for (const [id, s] of Object.entries(st)) {
    if (s && typeof s.due === "number" && typeof s.box === "number") {
      out[id] = { box: s.box, due: s.due, updatedAt: s.updatedAt ?? 0 };
    }
  }
  return JSON.stringify(out);
}

function parseNative(value: string | null): Record<string, Partial<LeitnerState>> {
  if (!value) return {};
  try {
    const obj = JSON.parse(value);
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}

// ---------- sequential op queue (prevents pull/push interleaving races) ----------
let chain: Promise<unknown> = Promise.resolve();
function queued<T>(op: () => Promise<T>): Promise<T> {
  const run = chain.then(op, op);
  chain = run.catch(() => undefined);
  return run;
}

let lastSeenRev: number | null = null;
let firstPullDone = false;
let lastToastAt = 0;

/** pull widget-side changes into the app store (per-card last-write-wins).
 *  returns the number of cards actually updated from the widget. */
export async function pullWidgetState(): Promise<number> {
  if (!isNativeApp()) return 0;
  return queued(async () => {
    try {
      const { value, rev } = await LeitnerBridge.loadState();
      const changed =
        typeof rev === "number" && lastSeenRev !== null ? rev !== lastSeenRev : true;
      lastSeenRev = typeof rev === "number" ? rev : (lastSeenRev ?? 0);
      const native = parseNative(value);
      if (!Object.keys(native).length || !changed) {
        firstPullDone = true;
        return 0;
      }
      const merged = useAppStore.getState().mergeLeitnerFromWidget(native);
      firstPullDone = true;
      if (merged > 0 && Date.now() - lastToastAt > 5000) {
        lastToastAt = Date.now();
        toast.success("تغییرات ویجت صفحه اصلی اعمال شد ✓");
      }
      return merged;
    } catch (e) {
      console.warn("[widget-sync] pull failed:", e);
      return 0;
    }
  });
}

/** push app-side changes to the native widget (skipped until the first pull) */
export async function pushWidgetState(): Promise<void> {
  if (!isNativeApp() || !firstPullDone) return;
  await queued(async () => {
    try {
      await LeitnerBridge.saveState({ value: serializeLeitner(useAppStore.getState().leitner) });
    } catch {
      // ignore
    }
  });
}

/** call once from the app shell: pulls on mount/resume/navigation and pushes on any leitner change */
export function initWidgetSync(): () => void {
  if (!isNativeApp()) return () => {};

  let timer: ReturnType<typeof setTimeout> | null = null;
  const unsub = useAppStore.subscribe((state, prev) => {
    if (state.leitner === prev.leitner) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void pushWidgetState(), 300);
  });

  const onVisible = () => {
    if (document.visibilityState === "visible") void pullWidgetState();
    else void pushWidgetState();
  };
  document.addEventListener("visibilitychange", onVisible);

  // safety net: while the app is visible, poll the native state every few seconds so
  // widget answers reach the app even if every event path (visibility, appStateChange,
  // native onResume) fails to fire
  const poll = setInterval(() => {
    if (document.visibilityState === "visible") void pullWidgetState();
  }, 8000);

  const appSub = App.addListener("appStateChange", (s) => {
    if (s.isActive) void pullWidgetState();
    else void pushWidgetState();
  });

  // native onResume event from the plugin — guaranteed trigger even when
  // visibilitychange/appStateChange fail to reach a paused WebView
  let bridgeSub: PluginListenerHandle | null = null;
  void LeitnerBridge.addListener("widgetChanged", () => {
    void pullWidgetState();
  }).then((h) => {
    bridgeSub = h;
  }).catch(() => {});

  void pullWidgetState();

  return () => {
    unsub();
    clearInterval(poll);
    document.removeEventListener("visibilitychange", onVisible);
    void Promise.resolve(appSub)
      .then((h) => h.remove())
      .catch(() => {});
    void Promise.resolve(bridgeSub)
      .then((h) => h?.remove())
      .catch(() => {});
    if (timer) clearTimeout(timer);
  };
}
