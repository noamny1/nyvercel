"use client";

import { useEffect, useState } from "react";
import { useFreshHeadlines, type Headline } from "@/components/player/useFreshHeadlines";

export function NewsTicker({ titles, seconds = 12, sourceId = "", take = 8 }: { titles: Headline[]; seconds?: number; sourceId?: string; take?: number }) {
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
  const item = shown[index];
  return (
    <div className="ticker">
      {item?.source ? <span className="ticker-source">{item.source}</span> : null}
      <span className="ticker-window">
        <span key={index} className="ticker-title">{item?.title || "אין חדשות כרגע"}</span>
      </span>
    </div>
  );
}
