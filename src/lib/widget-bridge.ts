// Bridge between the app and the native Android home-screen Leitner widget.
// On web (browser / PWA) all calls are no-ops.

import { registerPlugin, Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { useAppStore, type LeitnerState } from "./store";

export interface LeitnerBridgePlugin {
  /** push app leitner progress to native (widget merges per-card by updatedAt) */
  saveState(opts: { value: string }): Promise<void>;
  /** read widget-side progress so the app can merge it */
  loadState(): Promise<{ value: string | null }>;
}

const LeitnerBridge = registerPlugin<LeitnerBridgePlugin>("LeitnerBridge", {
  web: {
    async saveState() {},
    async loadState() {
      return { value: null };
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

/** pull widget-side changes into the app store (last-write-wins per card) */
export async function pullWidgetState(): Promise<void> {
  if (!isNativeApp()) return;
  try {
    const { value } = await LeitnerBridge.loadState();
    const native = parseNative(value);
    if (Object.keys(native).length) {
      useAppStore.getState().mergeLeitnerFromWidget(native);
    }
  } catch {
    // native side not available — ignore
  }
}

/** push app-side changes to the native widget */
export async function pushWidgetState(): Promise<void> {
  if (!isNativeApp()) return;
  try {
    await LeitnerBridge.saveState({ value: serializeLeitner(useAppStore.getState().leitner) });
  } catch {
    // ignore
  }
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

  // pull widget-side edits whenever the WebView becomes visible again;
  // flush pending app edits before it pauses (e.g. user switches to home screen)
  const onVisible = () => {
    if (document.visibilityState === "visible") void pullWidgetState();
    else void pushWidgetState();
  };
  document.addEventListener("visibilitychange", onVisible);

  // native resume/pause event — fires even when visibilitychange is unreliable inside the WebView
  const appSub = App.addListener("appStateChange", (s) => {
    if (s.isActive) void pullWidgetState();
    else void pushWidgetState();
  });

  void pullWidgetState();

  return () => {
    unsub();
    document.removeEventListener("visibilitychange", onVisible);
    void Promise.resolve(appSub)
      .then((h) => h.remove())
      .catch(() => {});
    if (timer) clearTimeout(timer);
  };
}
