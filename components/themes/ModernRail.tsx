"use client";

import { useEffect, useState } from "react";

export function ModernRail({
  address,
  logoUrl,
  temp,
  weatherLabel,
  candles,
  parsha,
  rates,
  notices,
}: {
  address: string;
  logoUrl: string;
  temp: number | null;
  weatherLabel: string;
  candles: string;
  parsha: string;
  rates: { name: string; value: string }[];
  notices: string[];
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
      <div className="modern-notices">
        <b>הודעות בניין</b>
        {notices.length === 0 ? <p>אין הודעות</p> : notices.map((item) => <p key={item}>{item}</p>)}
      </div>
    </div>
  );
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
