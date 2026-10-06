"use client";

import { useEffect, useState } from "react";
import { currentTurn } from "@/lib/turn";

export function useTurn() {
  const [turn, setTurn] = useState(currentTurn);
  useEffect(() => {
    const sync = () => {
      const next = currentTurn();
      setTurn((prev) => (prev === next ? prev : next));
    };
    const timer = setInterval(sync, 60_000);
    const onShow = () => {
      if (document.visibilityState === "visible") sync();
    };
    document.addEventListener("visibilitychange", onShow);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onShow);
    };
  }, []);
  return turn;
}
