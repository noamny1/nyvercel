"use client";

import { useEffect, useState } from "react";
import { lobbyClock } from "@/modules/broadcast/lobby-clock";
import { useFreshHeadlines, type Headline } from "@/modules/player/useFreshHeadlines";
import { useNewsOn } from "@/modules/player/useNewsOn";

export function AzorimFeed({
  headlines,
  notices,
  sourceId = "",
  newsCount = 8,
  newsMode = "on",
}: {
  headlines: Headline[];
  notices: string[];
  sourceId?: string;
  newsCount?: number;
  newsMode?: string;
}) {
  const fresh = useFreshHeadlines(sourceId || "ynet", newsCount, headlines);
  const newsOn = useNewsOn(newsMode);
  const news = (newsOn ? (sourceId ? fresh : headlines) : []).filter((item) => item.title).slice(0, 4);
  const notes = notices.filter(Boolean).slice(0, 4);
  return (
    <div className="az-feed" dir="rtl">
      <h2>חדשות</h2>
      {news.length === 0 ? <p>אין חדשות כרגע</p> : news.map((item) => <p key={item.title}>{item.title}</p>)}
      <hr />
      <h2>הודעות</h2>
      {notes.length === 0 ? <p>אין הודעות כרגע</p> : notes.map((text) => <p key={text}>{text}</p>)}
    </div>
  );
}

export function AzorimBar({
  line,
  city,
  temp,
  weatherLabel,
  initialTime = "",
}: {
  line: string;
  city: string;
  temp: number | null;
  weatherLabel: string;
  initialTime?: string;
}) {
  const [time, setTime] = useState(initialTime);
  useEffect(() => {
    const tick = () => setTime(lobbyClock().time);
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);
  const place = [line, city].filter(Boolean).join("   ·   ");
  return (
    <>
      <div className="az-info">
        <img src="/logo-nymedia.png" alt="NYmedia" />
        <div className="az-time">
          <strong dir="ltr">{time}</strong>
          <span dir="rtl">{temp === null ? "—" : `${temp}°`} {weatherLabel}</span>
        </div>
      </div>
      <div className="az-hello" dir="rtl">
        <small>ברוכים הבאים</small>
        {place ? <strong>{place}</strong> : null}
      </div>
    </>
  );
}
