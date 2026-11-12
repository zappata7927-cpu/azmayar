"use client";

import type { AppData, FlashCard } from "./types";
import { useAppStore, type LeitnerState } from "./store";

export interface DueInfo {
  dueCount: number;
  newCount: number;
  boxCounts: number[]; // index 0 = new, 1..5
  total: number;
  learned: number; // box 4-5
}

export function leitnerInfo(data: AppData, state: Record<string, LeitnerState>): DueInfo {
  const now = Date.now();
  let dueCount = 0;
  let newCount = 0;
  const boxCounts = [0, 0, 0, 0, 0, 0];
  for (const c of data.cards) {
    const st = state[c.id];
    if (!st) {
      newCount++;
      if (true) boxCounts[0]++;
      continue;
    }
    boxCounts[st.box]++;
    if (st.due <= now) dueCount++;
  }
  const total = data.cards.length;
  const learned = data.cards.filter((c) => state[c.id] && state[c.id].box >= 4).length;
  return { dueCount: dueCount + newCount, newCount, boxCounts, total, learned };
}

export interface SessionCard {
  card: FlashCard;
  isNew: boolean;
  box: number;
}

export function buildSession(data: AppData, state: Record<string, LeitnerState>, limit: number): SessionCard[] {
  const now = Date.now();
  const due: SessionCard[] = [];
  for (const card of data.cards) {
    const st = state[card.id];
    if (!st) due.push({ card, isNew: true, box: 0 });
    else if (st.due <= now) due.push({ card, isNew: false, box: st.box });
  }
  // prioritize lower boxes, then oldest due
  due.sort((a, b) => a.box - b.box || (state[a.card.id]?.due ?? 0) - (state[b.card.id]?.due ?? 0));
  return due.slice(0, limit);
}

export function categoryOfCard(data: AppData, card: FlashCard): string {
  return card.cat;
}
