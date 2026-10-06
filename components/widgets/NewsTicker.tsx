"use client";

import { useEffect, useState } from "react";
import { useFreshHeadlines } from "@/components/player/useFreshHeadlines";

export function NewsTicker({ titles, seconds = 12, source = "", sourceId = "", take = 8 }: { titles: string[]; seconds?: number; source?: string; sourceId?: string; take?: number }) {
  const fresh = useFreshHeadlines(sourceId || "ynet", take, titles);
  const shown = sourceId ? fresh : titles;
  const [index, setIndex] = useState(0);
  useEffect(() => {
    setIndex(0);
  }, [shown]);
  useEffect(() => {
    if (shown.length < 2) return;
    const timer = setInterval(() => setIndex((value) => (value + 1) % shown.length), Math.max(6, seconds) * 1000);
    return () => clearInterval(timer);
  }, [shown, seconds]);
  const title = shown[index] || "אין חדשות כרגע";
  return (
    <div className="ticker">
      {source ? <span className="ticker-source">{source}</span> : null}
      <span className="ticker-window">
        <span key={index} className="ticker-title">{title}</span>
      </span>
    </div>
  );
}