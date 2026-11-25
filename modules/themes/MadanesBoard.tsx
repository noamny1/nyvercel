"use client";

import { useEffect, useState } from "react";

type Weather = { day: string; temp: number; desc: string; icon: string };

export function MadanesBoard({
  logo,
  weather,
  news,
  newsOn,
}: {
  logo: string;
  weather: { temp: number | null; label: string };
  news: { title: string; source: string }[];
  newsOn: boolean;
}) {
  const [now, setNow] = useState(new Date());
  const [newsIdx, setNewsIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!news.length) return;
    const t = setInterval(() => setNewsIdx((i) => (i + 1) % news.length), 8000);
    return () => clearInterval(t);
  }, [news.length]);

  const hebrewDate = new Intl.DateTimeFormat("he-IL-u-ca-hebrew", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);

  const gregDate = new Intl.DateTimeFormat("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);

  const time = now.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  const item = news[newsIdx];

  return (
    <div className="layout-madanes">
      <main className="madanes-main">
        {/* Slides area - empty for now, slides render here */}
      </main>
      <aside className="madanes-side">
        <div className="madanes-logo">
          {logo ? <img src={logo} alt="" /> : <span>לוגו</span>}
        </div>
        <div className="madanes-clock">
          <div className="madanes-time">{time}</div>
          <div className="madanes-date">{gregDate}</div>
          <div className="madanes-hebrew">{hebrewDate}</div>
        </div>
        <div className="madanes-weather">
          <div className="madanes-day">
            <span className="madanes-day-name">היום</span>
            <span className="madanes-day-temp">{weather.temp ?? "--"}°</span>
            <span className="madanes-day-desc">{weather.label}</span>
          </div>
        </div>
      </aside>
      <footer className="madanes-news">
        <img className="madanes-brand" src="/logo-white.png" alt="NYMedia" />
        <span>{item?.title || (newsOn ? "אין חדשות כרגע" : "")}</span>
        {item?.source ? <b className="madanes-source">{item.source}</b> : null}
      </footer>
    </div>
  );
}
