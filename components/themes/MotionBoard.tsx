"use client";

import { useEffect, useState } from "react";
import { useNewsOn } from "@/components/player/useNewsOn";

type Story = { title: string };

export function GlassBoard({
  temp,
  weatherLabel,
  notices,
  headlines,
  street,
  number,
  city,
  logoUrl,
  newsMode = "on",
}: BoardProps) {
  const clock = useClock();
  const newsOn = useNewsOn(newsMode);
  const line = useLine(notices, newsOn ? headlines : []);
  const place = [street, number].filter(Boolean).join(" ");
  return (
    <aside className="glass-slab">
      <div>
        <strong className="motion-clock">{clock.time}</strong>
        <p className="motion-meta">{[clock.weekday, clock.hebrew].filter(Boolean).join(" · ")}</p>
        <p className="motion-meta">{temp === null ? weatherLabel : `${temp}° ${weatherLabel}`}</p>
      </div>
      <div>
        <div className="motion-hello">{clock.hello}</div>
        <p className={line.out ? "motion-line is-out" : "motion-line"}>{line.text}</p>
      </div>
      <div className="motion-foot">
        <div>
          {place ? <div>{place}</div> : null}
          {city ? <div className="motion-meta">{city}</div> : null}
          {logoUrl ? <img className="motion-client" src={logoUrl} alt="" /> : null}
        </div>
        <img className="motion-ny" src="/logo-white.png" alt="NYmedia" />
      </div>
    </aside>
  );
}

export function CinemaBoard({
  temp,
  weatherLabel,
  notices,
  headlines,
  street,
  number,
  city,
  logoUrl,
  newsMode = "on",
}: BoardProps) {
  const clock = useClock();
  const newsOn = useNewsOn(newsMode);
  const line = useLine(notices, newsOn ? headlines : []);
  const place = [street, number].filter(Boolean).join(" ");
  const address = [place, city].filter(Boolean).join(" · ");
  return (
    <>
      <div className="cinema-hair" />
      <footer className="cinema-bar">
        <img className="motion-ny" src="/logo-white.png" alt="NYmedia" />
        <div className="cinema-story">
          <b className={line.out ? "motion-line is-out" : "motion-line"}>{line.text}</b>
          {address ? <span>{address}</span> : null}
          {logoUrl ? <img className="motion-client" src={logoUrl} alt="" /> : null}
        </div>
        <div className="cinema-time">
          <strong className="motion-clock">{clock.time}</strong>
          <span>{temp === null ? weatherLabel : `${temp}° ${weatherLabel}`}</span>
        </div>
      </footer>
    </>
  );
}

type BoardProps = {
  temp: number | null;
  weatherLabel: string;
  notices: string[];
  headlines: Story[];
  street: string;
  number: string;
  city: string;
  logoUrl: string;
  newsMode?: string;
};

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const time = now ? now.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }) : "";
  const weekday = now ? now.toLocaleDateString("he-IL", { weekday: "long" }) : "";
  const hour = now ? now.getHours() : 9;
  const hello = hour < 12 ? "בוקר טוב" : hour < 17 ? "צהריים טובים" : hour < 21 ? "ערב טוב" : "לילה טוב";
  return { time, weekday, hebrew: now ? hebrewDate(now) : "", hello };
}

function useLine(notices: string[], headlines: Story[]) {
  const lines = [...notices.map((item) => item.trim()), ...headlines.map((item) => item.title.trim())].filter(Boolean).slice(0, 8);
  const key = lines.join("|");
  const [index, setIndex] = useState(0);
  const [out, setOut] = useState(false);
  useEffect(() => {
    setIndex(0);
    if (lines.length < 2) return;
    const timer = setInterval(() => {
      setOut(true);
      window.setTimeout(() => {
        setIndex((value) => (value + 1) % lines.length);
        setOut(false);
      }, 420);
    }, 4600);
    return () => clearInterval(timer);
  }, [key, lines.length]);
  return { text: lines[index] || "ברוכים הבאים", out };
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
