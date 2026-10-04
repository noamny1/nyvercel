"use client";

import { useEffect, useState } from "react";

export function NewsTicker({ titles, seconds = 12, source = "" }: { titles: string[]; seconds?: number; source?: string }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (titles.length < 2) return;
    const timer = setInterval(() => setIndex((value) => (value + 1) % titles.length), Math.max(6, seconds) * 1000);
    return () => clearInterval(timer);
  }, [titles, seconds]);
  const title = titles[index] || "אין חדשות כרגע";
  return (
    <div className="ticker">
      {source ? <span className="ticker-source">{source}</span> : null}
      <span className="ticker-title">{title}</span>
    </div>
  );
}