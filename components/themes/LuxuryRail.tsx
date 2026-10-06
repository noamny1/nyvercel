"use client";

import { useEffect, useState } from "react";
import { useFreshHeadlines } from "@/components/player/useFreshHeadlines";

type Item = { tag: string; text: string };

export function LuxuryRail({
  temp,
  weatherLabel,
  mode,
  headlines,
  notices,
  sourceId = "",
  newsCount = 8,
}: {
  temp: number | null;
  weatherLabel: string;
  mode: "news" | "notices" | "both";
  headlines: string[];
  notices: string[];
  sourceId?: string;
  newsCount?: number;
}) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const time = now ? now.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }) : "";
  const civil = now ? now.toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "";
  const hebrew = now ? hebrewDate(now) : "";
  const fresh = useFreshHeadlines(sourceId || "ynet", newsCount, headlines);
  const news = (sourceId ? fresh : headlines).filter(Boolean).map((text) => ({ tag: "חדשות", text }));
  const notes = notices.filter(Boolean).map((text) => ({ tag: "הודעת בניין", text }));
  const base = mode === "news" ? news : mode === "notices" ? notes : weave(notes, news);
  const loop = base.length ? Array.from({ length: Math.max(2, Math.ceil(4 / base.length)) }, () => base).flat() : [];
  const chips = [
    { id: "news", label: "חדשות" },
    { id: "notices", label: "הודעות" },
    { id: "both", label: "שניהם" },
  ] as const;

  return (
    <>
      <div className="lux-top">
        <strong className="lux-clock">{time}</strong>
        <div className="lux-civil">{civil}</div>
        <div className="lux-hebrew">{hebrew}</div>
        <div className="lux-weather">
          <i className="lux-sun" />
          <span>{temp === null ? "—" : `${temp}°`}</span>
          <span>{weatherLabel}</span>
        </div>
        <hr className="lux-rule" />
        <div className="lux-chips">
          {chips.map((chip) => <span key={chip.id} className={chip.id === mode ? "is-on" : ""}>{chip.label}</span>)}
        </div>
      </div>
      <div className="lux-feed">
        {loop.length === 0 ? <p className="lux-empty">אין עדכונים כרגע</p> : (
          <div className="lux-track" style={{ animationDuration: `${Math.max(loop.length, 4) * 4.5}s` }}>
            {[0, 1].map((copy) => (
              <div key={copy}>
                {loop.map((item, index) => (
                  <article className="lux-item" key={`${copy}-${index}`}>
                    <small>{item.tag}</small>
                    <p>{item.text}</p>
                  </article>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="lux-brand">
        <hr className="lux-rule" />
        <img src="/logo-nymedia.png" alt="NYmedia" />
      </div>
    </>
  );
}

function hebrewDate(date: Date) {
  const parts = new Intl.DateTimeFormat("he-IL-u-ca-hebrew", { day: "numeric", month: "long" }).formatToParts(date);
  const day = Number(parts.find((part) => part.type === "day")?.value || "");
  const month = parts.find((part) => part.type === "month")?.value || "";
  if (!day || !month) return "";
  return `${hebrewNumber(day)} ב${month}`;
}

function hebrewNumber(value: number) {
  if (value === 15) return "ט״ו";
  if (value === 16) return "ט״ז";
  const ones = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
  const tens = ["", "י", "כ", "ל"];
  const letters = `${tens[Math.floor(value / 10)] || ""}${ones[value % 10] || ""}`;
  if (letters.length < 2) return `${letters}׳`;
  return `${letters.slice(0, -1)}״${letters.slice(-1)}`;
}

function weave(notes: Item[], news: Item[]) {
  const mixed: Item[] = [];
  const count = Math.max(notes.length, news.length);
  for (let index = 0; index < count; index += 1) {
    if (notes[index]) mixed.push(notes[index]);
    if (news[index]) mixed.push(news[index]);
  }
  return mixed;
}
