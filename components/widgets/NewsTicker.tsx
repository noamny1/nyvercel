"use client";

import { useEffect, useState } from "react";
import { useFreshHeadlines, type Headline } from "@/components/player/useFreshHeadlines";
import { useNewsOn } from "@/components/player/useNewsOn";
import { HEALTH_NOTE } from "@/lib/news-sources";

export function NewsTicker({ titles, seconds = 12, sourceId = "", take = 8, mode = "on" }: { titles: Headline[]; seconds?: number; sourceId?: string; take?: number; mode?: string }) {
  const newsOn = useNewsOn(mode);
  const fresh = useFreshHeadlines(sourceId || "ynet", take, titles);
  const shown = newsOn ? (sourceId ? fresh : titles) : [];
  const shownKey = shown.map((item) => item.title).join("\n");
  const [index, setIndex] = useState(0);
  useEffect(() => {
    setIndex(0);
  }, [shownKey]);
  useEffect(() => {
    if (shown.length < 2) return;
    const timer = setInterval(() => setIndex((value) => (value + 1) % shown.length), Math.max(6, seconds) * 1000);
    return () => clearInterval(timer);
  }, [shownKey, shown.length, seconds]);
  const item = shown[index];
  if (!newsOn) return null;
  return (
    <div className="ticker">
      {item?.source ? <span className="ticker-source">{item.source}</span> : null}
      <span className="ticker-window">
        <span key={index} className="ticker-title">{item?.title || "אין חדשות כרגע"}</span>
      </span>
      {item?.source === "חדשות בריאות" ? <small className="health-note">{HEALTH_NOTE}</small> : null}
    </div>
  );
}
