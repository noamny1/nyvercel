"use client";

import { useEffect, useRef, useState } from "react";
import { lobbyClock } from "@/modules/broadcast/lobby-clock";
import { HEALTH_NOTE, chipLabel } from "@/modules/broadcast/news-sources";
import { useFreshHeadlines, type Headline } from "@/modules/player/useFreshHeadlines";
import { useNewsOn } from "@/modules/player/useNewsOn";

type Item = { tag: string; text: string; chip: string };

function blocks(news: Item[], notes: Item[], take = 4) {
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
  if (!order.length) return notes.slice(0, take);
  const mixed: Item[] = [];
  let noteAt = 0;
  for (const chip of order) {
    mixed.push(...(grouped.get(chip) || []).slice(0, take));
    if (!notes.length) continue;
    const count = Math.min(take, notes.length);
    for (let index = 0; index < count; index += 1) mixed.push(notes[(noteAt + index) % notes.length]);
    noteAt = (noteAt + count) % notes.length;
  }
  return mixed;
}

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
  const [active, setActive] = useState("");
  const feedRef = useRef<HTMLDivElement>(null);
  const news = (newsOn ? (sourceId ? fresh : headlines) : []).filter((item) => item.title).map((item) => ({
    tag: item.source || "חדשות",
    text: item.title,
    chip: item.source || "חדשות",
  }));
  const notes = notices.filter(Boolean).map((text) => ({ tag: "הודעת בניין", text, chip: "הודעות" }));
  const base = blocks(news, notes, 4);
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
    <div className="az-feed" dir="rtl">
      <div className="az-chips">
        {chips.map((chip) => <span key={chip} className={chip === running ? "is-on" : ""}>{chipLabel(chip)}</span>)}
      </div>
      <div className="az-scroll" ref={feedRef}>
        {loop.length === 0 ? <p className="az-empty">אין עדכונים כרגע</p> : (
          <div className="az-track" style={{ animationDuration: `${Math.max(loop.length, 4) * 8}s` }}>
            {[0, 1].map((copy) => (
              <div key={copy}>
                {loop.map((item, index) => (
                  <article className="az-item" key={`${copy}-${index}`} data-chip={item.chip}>
                    <small>{item.tag === "חדשות בריאות" ? "בריאות" : item.tag}</small>
                    <p>{item.text}</p>
                    {item.chip === "חדשות בריאות" ? <em>{HEALTH_NOTE}</em> : null}
                  </article>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
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
      <div className="az-hello" dir="rtl">
        <small>ברוכים הבאים</small>
        {place ? <strong>{place}</strong> : null}
      </div>
      <div className="az-info" dir="rtl">
        <img src="/logo-nymedia.png" alt="NYmedia" />
        <div className="az-time">
          <strong dir="ltr">{time}</strong>
          <span>{temp === null ? "—" : `${temp}°`} {weatherLabel}</span>
        </div>
      </div>
    </>
  );
}
