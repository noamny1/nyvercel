"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { chipLabel } from "@/modules/broadcast/news-sources";
import { useFreshHeadlines, type Headline } from "@/modules/player/useFreshHeadlines";
import { useNewsOn } from "@/modules/player/useNewsOn";

type Room = { id: number; name: string; detail: string; logoUrl?: string };
type Floor = { id: number; name: string; rooms: Room[] };

export function FloorsBoard({
  floors,
  pace,
  logoUrl,
  time,
  temp,
  weatherLabel,
  headlines,
  notices,
  sourceId,
  newsCount,
  newsMode,
  seconds,
}: {
  floors: Floor[];
  pace: number;
  caption: "name" | "address";
  title: string;
  logoUrl: string;
  time: string;
  temp: number | null;
  weatherLabel: string;
  headlines: Headline[];
  notices: string[];
  sourceId: string;
  newsCount: number;
  newsMode: string;
  seconds: number;
}) {
  return (
    <div className="floors-board">
      <header className="floors-head">
        <div className="floors-weather">
          <span className="floors-mark">
            <WeatherGlyph label={weatherLabel} />
          </span>
          <span className="floors-temp">
            {temp !== null ? <b>{temp}°</b> : null}
            {weatherLabel ? <small>{weatherLabel}</small> : null}
          </span>
        </div>
        <div className="floors-logo">
          {logoUrl ? <img src={logoUrl} alt="" /> : <span>לוגו הלקוח<small>הבניין</small></span>}
        </div>
        <div className="floors-time">
          <b className="clock">{time}</b>
        </div>
      </header>
      <FloorsRoll pace={pace} watch={floors.reduce((sum, floor) => sum + 1 + floor.rooms.length, 0)}>
        {floors.length === 0 ? <p className="floors-empty">אין קומות להצגה</p> : floors.map((floor, index) => {
          const badge = floor.name.trim() || String(index + 1);
          const rooms = floor.rooms.filter((room) => room.name || room.detail);
          return (
            <article className="floor-card" key={floor.id}>
              <b className={`floor-num${index % 2 === 0 ? " is-green" : " is-black"}${badge.length > 3 ? " is-long" : ""}`}>{badge}</b>
              <div className="floor-copy">
                {rooms.length === 0 ? <strong>{badge}</strong> : rooms.map((room) => (
                  <p className="floor-room" key={room.id}>
                    <span className="floor-who">
                      {room.logoUrl ? <img src={room.logoUrl} alt="" /> : null}
                      <strong>{room.name}</strong>
                    </span>
                    {room.detail ? <i className="floor-leader" /> : null}
                    {room.detail ? <em>{room.detail}</em> : null}
                  </p>
                ))}
              </div>
            </article>
          );
        })}
      </FloorsRoll>
      <FloorsNews headlines={headlines} notices={notices} sourceId={sourceId} newsCount={newsCount} newsMode={newsMode} seconds={seconds} />
    </div>
  );
}

function WeatherGlyph({ label }: { label: string }) {
  const rain = /גשם|ממטר|טפטוף|שלג|רעמים/.test(label);
  const cloud = /מעונן|ערפל/.test(label);
  const color = "#e8d7b0";
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true">
      {rain ? (
        <>
          <path d="M7 15h10a4 4 0 0 0 0-8 5 5 0 0 0-9.5-1A3.5 3.5 0 0 0 7 15z" fill={color} />
          <path d="M8 17.5l-1 3M12 17.5l-1 3M16 17.5l-1 3" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
        </>
      ) : cloud ? (
        <path d="M7 17h10a4 4 0 0 0 0-8 5 5 0 0 0-9.5-1A3.5 3.5 0 0 0 7 17z" fill={color} />
      ) : (
        <>
          <circle cx="12" cy="12" r="4" fill={color} />
          <g stroke={color} strokeWidth="1.6" strokeLinecap="round">
            <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.1 5.1l1.6 1.6M17.3 17.3l1.6 1.6M18.9 5.1l-1.6 1.6M6.7 17.3l-1.6 1.6" />
          </g>
        </>
      )}
    </svg>
  );
}

function FloorsRoll({ children, pace, watch }: { children: ReactNode; pace: number; watch: number }) {
  const viewRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [distance, setDistance] = useState(0);

  useLayoutEffect(() => {
    const view = viewRef.current;
    const list = listRef.current;
    if (!view || !list) return;
    const measure = () => {
      const extra = list.offsetHeight - view.clientHeight;
      const next = extra > 12 ? list.offsetHeight : 0;
      setDistance((prev) => (prev === next ? prev : next));
    };
    measure();
    const late = window.setTimeout(measure, 500);
    return () => window.clearTimeout(late);
  }, [watch, pace]);

  const rolling = distance > 0;
  const duration = rolling ? Math.max(12, distance / Math.max(8, pace)) : 0;

  return (
    <div className="floors-view" ref={viewRef}>
      <div className={rolling ? "floors-track is-roll" : "floors-track"} style={rolling ? { animationDuration: `${duration}s` } : undefined}>
        <div ref={listRef}>{children}</div>
        {rolling ? <div aria-hidden="true">{children}</div> : null}
      </div>
    </div>
  );
}

function FloorsNews({
  headlines,
  notices,
  sourceId,
  newsCount,
  newsMode,
  seconds,
}: {
  headlines: Headline[];
  notices: string[];
  sourceId: string;
  newsCount: number;
  newsMode: string;
  seconds: number;
}) {
  const newsOn = useNewsOn(newsMode);
  const fresh = useFreshHeadlines(sourceId || "ynet", newsCount, headlines);
  const lines = newsOn
    ? fresh.filter((item) => item.title)
    : notices.filter(Boolean).map((title) => ({ title, source: "" }));
  const [index, setIndex] = useState(0);
  const key = lines.map((item) => `${item.source}|${item.title}`).join("\n");
  const item = lines[index];
  const source = item?.source ? sourceMark(item.source) : "";

  useEffect(() => {
    setIndex(0);
  }, [key]);

  useEffect(() => {
    if (lines.length < 2) return;
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % lines.length), Math.max(6, seconds) * 1000);
    return () => window.clearInterval(timer);
  }, [key, lines.length, seconds]);

  return (
    <footer className="floors-news">
      {source ? <b className="floors-source">{source}</b> : null}
      <span>{item?.title || (newsOn ? "אין חדשות כרגע" : "")}</span>
    </footer>
  );
}

function sourceMark(name: string) {
  const label = chipLabel(name);
  return label.toLowerCase() === "ynet" ? "YNET" : label;
}
