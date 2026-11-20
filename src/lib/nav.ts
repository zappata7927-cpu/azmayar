"use client";

import { useCallback, useEffect, useState } from "react";

export type Route =
  | { v: "home" }
  | { v: "cats" }
  | { v: "cat"; cat: string }
  | { v: "test"; id: string }
  | { v: "leitner" }
  | { v: "quiz"; mode?: "mistakes"; cat?: string; count?: number }
  | { v: "session"; kind: "cards" | "quiz" | "mistakes"; id?: string; count?: number }
  | { v: "interpret" }
  | { v: "about" };

export function parseHash(hash: string): Route {
  const h = hash.replace(/^#\/?/, "");
  if (!h) return { v: "home" };
  const parts = h.split("/").map(decodeURIComponent);
  switch (parts[0]) {
    case "cats":
      return { v: "cats" };
    case "c":
      return { v: "cat", cat: parts[1] ?? "" };
    case "t":
      return { v: "test", id: parts[1] ?? "" };
    case "leitner":
      return { v: "leitner" };
    case "quiz":
      if (parts[1] === "mistakes") return { v: "quiz", mode: "mistakes" };
      if (parts[1] === "c") return { v: "quiz", cat: parts[2] ?? "" };
      return { v: "quiz" };
    case "session": {
      // #/session/cards/t/<tid>/<n> · #/session/quiz/t/<tid>/<n> · #/session/quiz/mistakes
      const kind = parts[1] === "cards" ? "cards" : parts[1] === "quiz" ? "quiz" : "mistakes";
      if (kind === "mistakes") return { v: "session", kind };
      const id = parts[3] ?? "";
      if (!id) return { v: "home" };
      const n = Number(parts[4]);
      return { v: "session", kind, id, count: Number.isFinite(n) && n > 0 ? n : undefined };
    }
    case "interpret":
      return { v: "interpret" };
    case "about":
      return { v: "about" };
    default:
      return { v: "home" };
  }
}

export function routeToHash(r: Route): string {
  switch (r.v) {
    case "home":
      return "#/";
    case "cats":
      return "#/cats";
    case "cat":
      return `#/c/${encodeURIComponent(r.cat)}`;
    case "test":
      return `#/t/${encodeURIComponent(r.id)}`;
    case "leitner":
      return "#/leitner";
    case "quiz":
      if (r.mode === "mistakes") return "#/quiz/mistakes";
      if (r.cat) return `#/quiz/c/${encodeURIComponent(r.cat)}`;
      return "#/quiz";
    case "session":
      if (r.kind === "mistakes") return "#/session/quiz/mistakes";
      return `#/session/${r.kind}/t/${encodeURIComponent(r.id ?? "")}${r.count ? `/${r.count}` : ""}`;
    case "interpret":
      return "#/interpret";
    case "about":
      return "#/about";
  }
}

export function useRoute(): [Route, (r: Route) => void] {
  const [route, setRoute] = useState<Route>({ v: "home" });

  useEffect(() => {
    const onHash = () => setRoute(parseHash(window.location.hash));
    onHash(); // sync on first client render (avoids SSR hydration mismatch)
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const navigate = useCallback((r: Route) => {
    const h = routeToHash(r);
    if (window.location.hash !== h) window.location.hash = h;
    else setRoute(r);
    window.scrollTo({ top: 0 });
  }, []);

  return [route, navigate];
}

export function goBack(defaultHash = "#/"): void {
  if (window.history.length > 1) window.history.back();
  else window.location.hash = defaultHash;
}
