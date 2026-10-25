"use client";

import { useEffect, useRef, useState } from "react";
import { useFreshHeadlines, type Headline } from "@/modules/player/useFreshHeadlines";
import { useNewsOn } from "@/modules/player/useNewsOn";
import { israelCivil, israelClock, israelWall } from "@/modules/broadcast/israel-time";
import { chipLabel, HEALTH_NOTE } from "@/modules/broadcast/news-sources";

type Item = { tag: string; text: string; chip: string };

function WeatherMark({ label }: { label: string }) {
  const rain = /גשם|ממטר|טפטוף|שלג|רעמים/.test(label);
  const cloud = /מעונן|ערפל/.test(label);
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true" style={{ display: "inline-block", verticalAlign: "middle", marginLeft: 8 }}>
      {rain ? (
        <>
          <path d="M7 15h10a4 4 0 0 0 0-8 5 5 0 0 0-9.5-1A3.5 3.5 0 0 0 7 15z" fill="#e6d3ae" />
          <path d="M8 17.5l-1 3M12 17.5l-1 3M16 17.5l-1 3" stroke="#e6d3ae" strokeWidth="1.4" strokeLinecap="round" />
        </>
      ) : cloud ? (
        <path d="M7 17h10a4 4 0 0 0 0-8 5 5 0 0 0-9.5-1A3.5 3.5 0 0 0 7 17z" fill="#e6d3ae" />
      ) : (
        <>
          <circle cx="12" cy="12" r="4" fill="#e6d3ae" />
          <g stroke="#e6d3ae" strokeWidth="1.6" strokeLinecap="round">
            <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.1 5.1l1.6 1.6M17.3 17.3l1.6 1.6M18.9 5.1l-1.6 1.6M6.7 17.3l-1.6 1.6" />
          </g>
        </>
      )}
    </svg>
  );
}

export function LuxuryRail({
  temp,
  weatherLabel,
  headlines,
  notices,
  sourceId = "",
  newsCount = 8,
  newsMode = "on",
  compact = false,
  initialTime = "",
  initialCivil = "",
  initialHebrew = "",
}: {
  temp: number | null;
  weatherLabel: string;
  mode?: "news" | "notices" | "both";
  headlines: Headline[];
  notices: string[];
  sourceId?: string;
  newsCount?: number;
  newsMode?: string;
  compact?: boolean;
  initialTime?: string;
  initialCivil?: string;
  initialHebrew?: string;
}) {
  const [time, setTime] = useState(initialTime);
  const [civil, setCivil] = useState(initialCivil);
  const [hebrew, setHebrew] = useState(initialHebrew);
  const [active, setActive] = useState("");
  const feedRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(clockText(now));
      setCivil(civilDate(now));
      setHebrew(hebrewDate(now));
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);
  const fresh = useFreshHeadlines(sourceId || "ynet", newsCount, headlines);
  const newsOn = useNewsOn(newsMode);
  const news = (newsOn ? (sourceId ? fresh : headlines) : []).filter((item) => item.title).map((item) => ({
    tag: item.source || "חדשות",
    text: item.title,
    chip: item.source || "חדשות",
  }));
  const notes = notices.filter(Boolean).map((text) => ({ tag: "הודעת בניין", text, chip: "הודעות" }));
  const base = blocks(news, notes, compact ? 3 : 4);
  const loop = base.length ? Array.from({ length: compact ? 1 : Math.max(2, Math.ceil(4 / base.length)) }, () => base).flat() : [];
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
      <div className="lux-brand">
        <img className="lux-brand-color" src="/logo-nymedia.png" alt="NYmedia" />
        <img className="lux-brand-white" src="/logo-white.png" alt="" />
      </div>
      <div className="lux-top">
        <strong className="lux-clock">{time}</strong>
        <div className="lux-civil">{civil}</div>
        <div className="lux-hebrew">{hebrew}</div>
        <div
          className="lux-weather"
          style={{ display: "block", width: "100%", marginTop: 10, color: "#F4F1ED", fontSize: 22, fontWeight: 400, lineHeight: "28px", textAlign: "center", whiteSpace: "normal" }}
        >
          <WeatherMark label={weatherLabel} />
          <span style={{ color: "#F4F1ED" }}>{temp === null ? "—" : `${temp}°`}</span>
          <span style={{ color: "#e6d3ae", marginRight: 10 }}>{weatherLabel}</span>
        </div>
        <hr className="lux-rule" />
        <div className="lux-chips">
          {chips.map((chip) => <span key={chip} className={chip === running ? "is-on" : ""}>{chipLabel(chip)}</span>)}
        </div>
      </div>
      <div className="lux-feed" ref={feedRef}>
        {loop.length === 0 ? <p className="lux-empty">אין עדכונים כרגע</p> : (
          <div className="lux-track" style={{ animationDuration: `${Math.max(loop.length, 4) * 8}s` }}>
            {[0, 1].map((copy) => (
              <div key={copy}>
                {loop.map((item, index) => (
                  <article className="lux-item" key={`${copy}-${index}`} data-chip={item.chip}>
                    <small>{item.tag === "חדשות בריאות" ? "בריאות" : item.tag}</small>
                    <p>{item.text}</p>
                    {item.chip === "חדשות בריאות" ? <em className="health-note">{HEALTH_NOTE}</em> : null}
                  </article>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

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

function clockText(date: Date) {
  return israelClock(date);
}

function civilDate(date: Date) {
  return israelCivil(date);
}

function hebrewDate(date: Date) {
  return hebrewFallback(israelWall(date));
}

function hebrewFallback(date: Date) {
  const abs = julianDay(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
  let year = 5780;
  while (hebrewNewYear(year) > abs) year -= 1;
  while (hebrewNewYear(year + 1) <= abs) year += 1;
  const months = hebrewMonths(year);
  let left = abs - hebrewNewYear(year);
  let month = 0;
  for (; month < months.length; month += 1) {
    if (left < months[month].days) break;
    left -= months[month].days;
  }
  return `${hebrewNumber(left + 1)} ב${months[month].name} ${hebrewYear(year)}`;
}

function julianDay(year: number, month: number, day: number) {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

function isLeap(year: number) {
  return ((7 * year) + 1) % 19 < 7;
}

function hebrewNewYear(year: number) {
  const months = Math.floor((235 * year - 234) / 19);
  const parts = 12084 + 13753 * months;
  let day = 1 + 29 * months + Math.floor(parts / 25920);
  const rem = parts % 25920;
  if (rem >= 19440) day += 1;
  const weekday = day % 7;
  if (weekday === 0 || weekday === 3 || weekday === 5) day += 1;
  else if (weekday === 2 && rem >= 9924 && !isLeap(year)) day += 1;
  else if (weekday === 1 && rem >= 16789 && isLeap(year - 1)) day += 1;
  return day + 347997;
}

function hebrewMonths(year: number) {
  const length = hebrewNewYear(year + 1) - hebrewNewYear(year);
  const cheshvan = length === 355 || length === 385 ? 30 : 29;
  const kislev = length === 353 || length === 383 ? 29 : 30;
  const names = ["תשרי", "חשוון", "כסלו", "טבת", "שבט"];
  const days = [30, cheshvan, kislev, 29, 30];
  if (isLeap(year)) {
    names.push("אדר א׳", "אדר ב׳");
    days.push(30, 29);
  } else {
    names.push("אדר");
    days.push(29);
  }
  names.push("ניסן", "אייר", "סיוון", "תמוז", "אב", "אלול");
  days.push(30, 29, 30, 29, 30, 29);
  return names.map((name, index) => ({ name, days: days[index] }));
}

function hebrewYear(year: number) {
  const ones = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
  const tens = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"];
  const hundreds = ["", "ק", "ר", "ש", "ת", "תק", "תר", "תש", "תת", "תתק"];
  let rest = year % 1000;
  const head = hundreds[Math.floor(rest / 100)] || "";
  rest %= 100;
  let tail = "";
  if (rest === 15) tail = "ט״ו";
  else if (rest === 16) tail = "ט״ז";
  else if (rest > 0) {
    const letters = `${tens[Math.floor(rest / 10)] || ""}${ones[rest % 10] || ""}`;
    tail = letters.length < 2 ? `${letters}׳` : `${letters.slice(0, -1)}״${letters.slice(-1)}`;
  }
  return `${head}${tail}`;
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