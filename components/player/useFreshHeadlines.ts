"use client";

import { useEffect, useRef, useState } from "react";
import { useTurn } from "@/components/player/useTurn";

export type Headline = { title: string; source: string };

function same(left: Headline[], right: Headline[]) {
  return left.length === right.length && left.every((item, index) => item.title === right[index].title && item.source === right[index].source);
}

export function useFreshHeadlines(sourceId: string, take: number, initial: Headline[]) {
  const [items, setItems] = useState(initial);
  const turn = useTurn();
  const seen = useRef(turn);
  const key = initial.map((item) => `${item.source}|${item.title}`).join("\n");

  useEffect(() => {
    setItems(initial);
  }, [key]);

  useEffect(() => {
    if (seen.current === turn) return;
    seen.current = turn;
    const load = async () => {
      try {
        const response = await fetch(`/api/headlines?source=${encodeURIComponent(sourceId)}&take=${take}`, { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { items?: Headline[] };
        const next = (data.items || [])
          .map((item) => ({ title: String(item.title || "").trim(), source: String(item.source || "").trim() }))
          .filter((item) => item.title);
        if (next.length === 0) return;
        setItems((current) => (same(current, next) ? current : next));
      } catch {
        /* keep the headlines already on screen */
      }
    };
    void load();
  }, [turn, sourceId, take]);

  return items;
}
