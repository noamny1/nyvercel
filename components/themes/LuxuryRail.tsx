"use client";

import { useEffect, useRef, useState } from "react";
import { useFreshHeadlines, type Headline } from "@/components/player/useFreshHeadlines";

type Item = { tag: string; text: string; chip: string };

export function LuxuryRail({
  temp,
  weatherLabel,
  headlines,
  notices,
  sourceId = "",
  newsCount = 8,
}: {
  temp: number | null;
  weatherLabel: string;
  mode?: "news" | "notices" | "both";
  headlines: Headline[];
  notices: string[];
  sourceId?: string;
  newsCount?: number;
}) {
  const [now, setNow] = useState<Date | null>(null);
  const [active, setActive] = useState("");
  const feedRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const time = now ? now.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }) : "";
  const civil = now ? now.toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "";
  const hebrew = now ? hebrewDate(now) : "";
  const fresh = useFreshHeadlines(sourceId || "ynet", newsCount, headlines);
  const news = (sourceId ? fresh : headlines).filter((item) => item.title).map((item) => ({
    tag: item.source || "חדשות",
    text: item.title,
    chip: item.source || "חדשות",
  }));
  const notes = notices.filter(Boolean).map((text) => ({ tag: "הודעת בניין", text, chip: "הודעות" }));
  const base = blocks(news, notes);
  const loop = base.length ? Array.from({ length: Math.max(2, Math.ceil(4 / base.length)) }, () => base).flat() : [];
  const chips = [...news.reduce((names, item) => names.add(item.chip), new Set<string>()), ...(notes.length ? ["הודעות"] : [])];
  const running = active || chips[0] || "";

  useEffect(() => {
    const root = feedRef.current;
    if (!root || loop.length === 0) return;
    let frame = 0;
    const tick = () => {
      const box = root.getBoundingClientRect();
      const focus = box.top + box.height * 0.22;
      let best = "";
      let bestDist = Number.POSITIVE_INFINITY;
      root.querySelectorAll<HTMLElement>("[data-chip]").forEach((item) => {
        const rect = item.getBoundingClientRect();
        if (rect.bottom < box.top || rect.top > box.bottom) return;
        const dist = Math.abs(rect.top - focus);
        if (dist < bestDist) {
          bestDist = dist;
          best = item.dataset.chip || "";
        }
      });
      if (best) setActive((prev) => (prev === best ? prev : best));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [loop.length, chips.join("|")]);

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
          {chips.map((chip) => <span key={chip} className={chip === running ? "is-on" : ""}>{chip}</span>)}
        </div>
      </div>
      <div className="lux-feed" ref={feedRef}>
        {loop.length === 0 ? <p className="lux-empty">אין עדכונים כרגע</p> : (
          <div className="lux-track" style={{ animationDuration: `${Math.max(loop.length, 4) * 8}s` }}>
            {[0, 1].map((copy) => (
              <div key={copy}>
                {loop.map((item, index) => (
                  <article className="lux-item" key={`${copy}-${index}`} data-chip={item.chip}>
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

function blocks(news: Item[], notes: Item[]) {
  const order: string[] = [];
  const grouped = new Map<string, Item[]>();
  for (const item of news) {
    const list = grouped.get(item.chip);
    if (list) list.push(item);
    else {
      grouped.set(item.chip, [item]);
      order.push(item.chip);
    }
  }
  if (!order.length) return notes.slice(0, 4);
  const mixed: Item[] = [];
  let noteAt = 0;
  for (const chip of order) {
    mixed.push(...(grouped.get(chip) || []).slice(0, 4));
    if (!notes.length) continue;
    const count = Math.min(4, notes.length);
    for (let index = 0; index < count; index += 1) mixed.push(notes[(noteAt + index) % notes.length]);
    noteAt = (noteAt + count) % notes.length;
  }
  return mixed;
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