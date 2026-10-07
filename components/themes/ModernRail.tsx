"use client";

import { useEffect, useState } from "react";
import { useFreshHeadlines, type Headline } from "@/components/player/useFreshHeadlines";
import { useNewsOn } from "@/components/player/useNewsOn";

type Page = { chip: string; headlines: string[]; notes: string[] };

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
  const pages = wheelPages(news, notices);
  const chips = pageChips(pages);
  const hold = 11;

  return (
    <div className="modern-rail">
      <header className="modern-mast">
        <div className="modern-address">
          {logoUrl ? <img src={logoUrl} alt="" /> : <House />}
          <span>{address}</span>
        </div>
        <div className="modern-clock">
          <strong>{time}</strong>
          <small>{civil}{hebrew ? ` · ${hebrew}` : ""}</small>
        </div>
      </header>
      <section className="modern-facts">
        <div className="modern-fact">
          <Sun />
          <b>{temp === null ? "—" : `${temp}°`}</b>
          <small>{weatherLabel}</small>
        </div>
        <div className="modern-fact">
          <Candle />
          <small>הדלקת נרות</small>
          <b>{candles || "—"}</b>
          {parsha ? <small>פרשת {parsha}</small> : null}
        </div>
        <div className="modern-rates">
          {shown.length === 0 ? <span><b>—</b></span> : shown.map((row) => (
            <span key={row.name}><b>{row.value}</b><small>{row.name}</small></span>
          ))}
        </div>
      </section>
      <Wheel pages={pages} chips={chips} seconds={hold} />
    </div>
  );
}

function Wheel({ pages, chips, seconds }: { pages: Page[]; chips: string[]; seconds: number }) {
  const [index, setIndex] = useState(0);
  const [leave, setLeave] = useState(false);
  const key = pages.map((item) => `${item.chip}|${item.headlines.join("|")}|${item.notes.join("|")}`).join("\n");
  useEffect(() => {
    setIndex(0);
    setLeave(false);
  }, [key]);
  useEffect(() => {
    if (pages.length < 2) return;
    const timer = setInterval(() => setLeave(true), seconds * 1000);
    return () => clearInterval(timer);
  }, [key, pages.length, seconds]);
  useEffect(() => {
    if (!leave) return;
    const done = window.setTimeout(() => {
      setIndex((value) => (value + 1) % pages.length);
      setLeave(false);
    }, 980);
    return () => clearTimeout(done);
  }, [leave, pages.length]);
  const at = pages.length ? index % pages.length : 0;
  const current = pages[at];

  return (
    <div className="modern-feed">
      {chips.length > 1 ? (
        <div className="modern-chips">
          {chips.map((chip) => (
            <span key={chip} className={`${chip === current?.chip ? "is-on" : ""} ${chip === "הודעות" ? "is-note" : ""}`}>{chip}</span>
          ))}
        </div>
      ) : null}
      <div className="modern-stage">
        <svg className="modern-arc" viewBox="0 0 120 120" aria-hidden="true">
          <circle className="is-track" cx="60" cy="60" r="54" />
          {current ? <circle className="is-sweep" key={`${key}-${at}`} cx="60" cy="60" r="54" style={{ animationDuration: `${seconds}s` }} /> : null}
        </svg>
        {current ? (
          <article key={at} className={`modern-face${leave ? " is-out" : " is-in"}`}>
            <Board page={current} />
          </article>
        ) : <p className="modern-empty">אין עדכונים כרגע</p>}
      </div>
    </div>
  );
}

function Board({ page }: { page?: Page }) {
  const lines = page?.headlines.length ? page.headlines : page?.notes || [];
  const label = page?.headlines.length ? page.chip : "הודעות הבניין";
  const note = !page?.headlines.length;
  return (
    <>
      <b className={note ? "is-note" : ""}>{label}</b>
      <ul>
        {lines.map((text, index) => (
          <li key={`${index}-${text}`}><i aria-hidden="true" /><span>{text}</span></li>
        ))}
      </ul>
    </>
  );
}

function wheelPages(items: Headline[], notices: string[]) {
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
  const notes = notices.map((item) => item.trim()).filter(Boolean);
  const notePages: Page[] = [];
  for (let index = 0; index < notes.length; index += 3) {
    notePages.push({ chip: "הודעות", headlines: [], notes: notes.slice(index, index + 3) });
  }
  const newsPages: Page[] = order.map((chip) => ({ chip, headlines: groups.get(chip) || [], notes: [] }));
  if (!newsPages.length) return notePages;
  if (!notePages.length) return newsPages;
  const pages: Page[] = [];
  const count = Math.max(newsPages.length, notePages.length);
  for (let index = 0; index < count; index += 1) {
    pages.push(newsPages[index % newsPages.length]);
    pages.push(notePages[index % notePages.length]);
  }
  return pages;
}

function pageChips(pages: Page[]) {
  const chips = [...new Set(pages.map((page) => page.chip).filter((chip) => chip !== "הודעות"))];
  if (pages.some((page) => page.notes.length)) chips.push("הודעות");
  return chips;
}

function House() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M8 22 24 8l16 14v16a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2Z" fill="none" stroke="#5A1F2B" strokeWidth="2.4" />
      <path d="M20 40V28h8v12" fill="none" stroke="#5A1F2B" strokeWidth="2.4" />
    </svg>
  );
}

function Sun() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="7" fill="#e6d3ae" stroke="#5A1F2B" strokeWidth="1.6" />
      <path d="M24 6v5M24 37v5M6 24h5M37 24h5M11 11l3.5 3.5M33.5 33.5 37 37M37 11l-3.5 3.5M14.5 33.5 11 37" stroke="#5A1F2B" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function Candle() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M24 18c3.2 0 4.6-3.4 3-6.6-3.2 1.8-6.4 1.6-6.4 5 0 1 .5 1.6 1.6 1.6.8 0 1.1-.3 1.8 0Z" fill="#e6d3ae" />
      <rect x="21" y="18" width="6" height="16" rx="1.5" fill="#F4F1ED" stroke="#5A1F2B" strokeWidth="1.6" />
    </svg>
  );
}
