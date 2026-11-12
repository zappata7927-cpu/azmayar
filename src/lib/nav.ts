"use client";

import { useCallback, useEffect, useState } from "react";

export type Route =
  | { v: "home" }
  | { v: "cats" }
  | { v: "cat"; cat: string }
  | { v: "test"; id: string }
  | { v: "leitner" }
  | { v: "quiz" }
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
      return { v: "quiz" };
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
      return "#/quiz";
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
