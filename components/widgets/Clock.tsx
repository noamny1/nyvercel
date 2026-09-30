"use client";

import { useEffect, useState } from "react";

export function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const time = now
    ? now.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })
    : "";
  const date = now
    ? now.toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" })
    : "";
  return (
    <div className="widget">
      <div className="clock">{time}</div>
      <div>{date}</div>
    </div>
  );
}
