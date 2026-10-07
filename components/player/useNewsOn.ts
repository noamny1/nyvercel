"use client";

import { useEffect, useState } from "react";
import { newsTickerOn } from "@/lib/schedule";

export function useNewsOn(mode: string) {
  const [on, setOn] = useState(() => newsTickerOn(mode));
  useEffect(() => {
    const tick = () => setOn(newsTickerOn(mode));
    tick();
    const timer = setInterval(tick, 60_000);
    return () => clearInterval(timer);
  }, [mode]);
  return on;
}
