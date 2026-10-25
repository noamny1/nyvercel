"use client";

import { useEffect, useState } from "react";
import { israelCivil, israelClock } from "@/modules/broadcast/israel-time";

export function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const time = now ? israelClock(now) : "";
  const date = now ? israelCivil(now, false) : "";
  return (
    <div className="widget">
      <div className="clock">{time}</div>
      <div>{date}</div>
    </div>
  );
}
