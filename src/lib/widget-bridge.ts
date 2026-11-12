// Bridge between the app and the native Android home-screen Leitner widget.
// On web (browser / PWA) all calls are no-ops.

import { registerPlugin, Capacitor } from "@capacitor/core";
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

/** call once from the app shell: pulls on mount/resume and pushes on any leitner change */
export function initWidgetSync(): () => void {
  if (!isNativeApp()) return () => {};

  let timer: ReturnType<typeof setTimeout> | null = null;
  const unsub = useAppStore.subscribe((state, prev) => {
    if (state.leitner === prev.leitner) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void pushWidgetState(), 700);
  });

  const onVisible = () => {
    if (document.visibilityState === "visible") void pullWidgetState();
  };
  document.addEventListener("visibilitychange", onVisible);
  void pullWidgetState();

  return () => {
    unsub();
    document.removeEventListener("visibilitychange", onVisible);
    if (timer) clearTimeout(timer);
  };
}
