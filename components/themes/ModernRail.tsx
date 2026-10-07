"use client";

import { useEffect, useState } from "react";
import { useFreshHeadlines, type Headline } from "@/components/player/useFreshHeadlines";
import { useNewsOn } from "@/components/player/useNewsOn";

type Stop = { chip: string; tag: string; text: string; note: boolean };

export function ModernRail({
  address,
  logoUrl,
  temp,
  weatherLabel,
  candles,
  parsha,
  rates,
  notices,
  headlines,
  sourceId = "",
  newsCount = 8,
  newsMode = "on",
  seconds = 8,
}: {
  address: string;
  logoUrl: string;
  temp: number | null;
  weatherLabel: string;
  candles: string;
  parsha: string;
  rates: { name: string; value: string }[];
  notices: string[];
  headlines: Headline[];
  sourceId?: string;
  newsCount?: number;
  newsMode?: string;
  seconds?: number;
}) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const time = now ? now.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }) : "";
  const civil = now ? now.toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" }) : "";
  const hebrew = now ? now.toLocaleDateString("he-IL-u-ca-hebrew", { day: "numeric", month: "long" }) : "";
  const shown = rates.slice(0, 2);
  const fresh = useFreshHeadlines(sourceId || "ynet", newsCount, headlines);
  const newsOn = useNewsOn(newsMode);
  const news = (newsOn ? (sourceId ? fresh : headlines) : []).filter((item) => item.title);
  const stops = wheelStops(news, notices);
  const chips = [...new Set(stops.map((item) => item.chip))];
  const hold = Math.max(6, seconds);

  return (
    <div className="modern-rail">
      <div className="modern-address">
        {logoUrl ? <img src={logoUrl} alt="" /> : <House />}
        <span>{address}</span>
      </div>
      <div className="modern-clock">
        <ClockMark />
        <strong>{time}</strong>
        <small>{civil}{hebrew ? ` · ${hebrew}` : ""}</small>
      </div>
      <div className="modern-split">
        <div>
          <Sun />
          <strong>{temp === null ? "—" : `${temp}°`}</strong>
          <small>{weatherLabel}</small>
        </div>
        <div>
          <Candle />
          <b>הדלקת נרות</b>
          <strong>{candles || "—"}</strong>
          {parsha ? <small>פרשת {parsha}</small> : null}
        </div>
      </div>
      <div className="modern-markets">
        {shown.length === 0 ? <span>—</span> : shown.map((row) => (
          <span key={row.name}><strong>{row.value}</strong><small>{row.name}</small></span>
        ))}
      </div>
      <Wheel stops={stops} chips={chips} seconds={hold} />
    </div>
  );
}

function Wheel({ stops, chips, seconds }: { stops: Stop[]; chips: string[]; seconds: number }) {
  const [index, setIndex] = useState(0);
  const [spin, setSpin] = useState(false);
  const [lock, setLock] = useState(false);
  const key = stops.map((item) => `${item.chip}|${item.text}`).join("\n");
  useEffect(() => {
    setIndex(0);
    setSpin(false);
  }, [key]);
  useEffect(() => {
    if (stops.length < 2) return;
    const timer = setInterval(() => setSpin(true), seconds * 1000);
    return () => clearInterval(timer);
  }, [key, stops.length, seconds]);
  useEffect(() => {
    if (!spin) return;
    const done = window.setTimeout(() => {
      setLock(true);
      setIndex((value) => (value + 1) % stops.length);
      setSpin(false);
      requestAnimationFrame(() => requestAnimationFrame(() => setLock(false)));
    }, 680);
    return () => clearTimeout(done);
  }, [spin, stops.length]);
  const at = stops.length ? index % stops.length : 0;
  const current = stops[at];
  const previous = stops.length ? stops[(at + stops.length - 1) % stops.length] : undefined;
  const next = stops.length ? stops[(at + 1) % stops.length] : undefined;

  return (
    <div className="modern-feed">
      {chips.length > 1 ? (
        <div className="modern-chips">
          {chips.map((chip) => (
            <span key={chip} className={`${chip === current?.chip ? "is-on" : ""} ${chip === "הודעות" ? "is-note" : ""}`}>{chip}</span>
          ))}
        </div>
      ) : null}
      <div className="modern-window">
        {current ? (
          <div className={`modern-cylinder${spin ? " is-spin" : ""}${lock ? " is-lock" : ""}`}>
            <Face item={previous} />
            <Face item={current} />
            <Face item={next} />
          </div>
        ) : <p className="modern-empty">אין עדכונים כרגע</p>}
      </div>
      {current ? <i className="modern-meter" key={`${key}-${at}`} style={{ animationDuration: `${seconds}s` }} /> : null}
    </div>
  );
}

function Face({ item }: { item?: Stop }) {
  if (!item) return <p />;
  return (
    <p className={item.note ? "is-note" : ""}>
      <small>{item.tag}</small>
      <span>{item.text}</span>
    </p>
  );
}

function wheelStops(items: Headline[], notices: string[]) {
  const groups = new Map<string, string[]>();
  const order: string[] = [];
  for (const item of items) {
    const title = item.title.trim();
    if (!title) continue;
    const chip = item.source.trim() || "חדשות";
    const list = groups.get(chip);
    if (list) {
      if (list.length < 3 && !list.includes(title)) list.push(title);
    } else {
      groups.set(chip, [title]);
      order.push(chip);
    }
  }
  const notes: Stop[] = notices
    .map((item) => item.trim())
    .filter(Boolean)
    .map((text) => ({ chip: "הודעות", tag: "הודעת בניין", text, note: true }));
  if (!order.length) return notes;
  const stops: Stop[] = [];
  for (const chip of order) {
    for (const text of groups.get(chip) || []) stops.push({ chip, tag: chip, text, note: false });
    stops.push(...notes);
  }
  return stops;
}

function House() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M8 22 24 8l16 14v16a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2Z" fill="none" stroke="#2f6fb2" strokeWidth="2.4" />
      <path d="M20 40V28h8v12" fill="none" stroke="#2f6fb2" strokeWidth="2.4" />
    </svg>
  );
}

function ClockMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="14" fill="none" stroke="#222" strokeWidth="1.6" />
      <path d="M24 16v9l6 3" fill="none" stroke="#222" strokeWidth="1.6" />
    </svg>
  );
}

function Sun() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="8" fill="#f2b705" />
      <path d="M24 6v6M24 36v6M6 24h6M36 24h6M11 11l4 4M33 33l4 4M37 11l-4 4M15 33l-4 4" stroke="#f2b705" strokeWidth="2" />
    </svg>
  );
}

function Candle() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M24 20c4 0 6-4 4-8-4 2-8 2-8 6 0 1.2.6 2 2 2 1 0 1.4-.4 2 0Z" fill="#f08a24" />
      <rect x="21" y="20" width="6" height="16" rx="1" fill="#f3e2b8" stroke="#c9a36a" />
    </svg>
  );
}
