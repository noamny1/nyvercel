"use client";

import { useEffect, useRef, useState } from "react";
import { useTurn } from "@/components/player/useTurn";

function same(left: string[], right: string[]) {
  return left.length === right.length && left.every((title, index) => title === right[index]);
}

export function useFreshHeadlines(sourceId: string, take: number, initial: string[]) {
  const [titles, setTitles] = useState(initial);
  const turn = useTurn();
  const seen = useRef(turn);
  const key = initial.join("\n");

  useEffect(() => {
    setTitles(initial);
  }, [key]);

  useEffect(() => {
    if (seen.current === turn) return;
    seen.current = turn;
    const load = async () => {
      try {
        const response = await fetch(`/api/headlines?source=${encodeURIComponent(sourceId)}&take=${take}`, { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { titles?: string[] };
        const next = (data.titles || []).map((title) => title.trim()).filter(Boolean);
        if (next.length === 0) return;
        setTitles((current) => (same(current, next) ? current : next));
      } catch {
        /* keep the headlines already on screen */
      }
    };
    void load();
  }, [turn, sourceId, take]);

  return titles;
}
