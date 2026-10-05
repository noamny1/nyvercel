"use client";

import { useState } from "react";
import { ScreenEditor } from "@/components/admin/ScreenEditor";

type Panel = "slides" | "details" | "notices";

type Row = {
  id: number;
  code: number | null;
  name: string;
  street: string;
  number: string;
  city: string;
  theme: string;
  logoUrl: string;
  newsSource: string;
  newsCount: number;
  tickerSeconds: number;
  newsTicker: string;
  musicPlaylist: string;
  people: string[];
  slides: { id: number; imageUrl: string; duration: number; sort: number; weekdays?: string; startsOn?: string; endsOn?: string; active?: boolean; kind?: string; templateId?: string; title?: string; detail?: string; meta?: string }[];
  notices: { id: number; text: string; active: boolean }[];
};

export function ClientScreens({ rows, musicPeers, returnTo }: { rows: Row[]; musicPeers: number; returnTo: string }) {
  const [open, setOpen] = useState<{ id: number; tab: Panel } | null>(null);

  function pick(id: number, tab: Panel) {
    setOpen((current) => (current?.id === id && current.tab === tab ? null : { id, tab }));
  }

  if (!rows.length) return <p>עדיין אין מסכים משויכים.</p>;

  return (
    <section className="client-home">
      {rows.map((screen) => {
        const place = [screen.street, screen.number].filter(Boolean).join(" ");
        const address = [place, screen.city].filter(Boolean).join(", ") || screen.name;
        const tab = open?.id === screen.id ? open.tab : null;
        return (
          <article className={tab ? "client-card is-open" : "client-card"} key={screen.id}>
            <header>
              <strong>{address}</strong>
              <small>משתמשים מורשים</small>
              <span>{screen.people.length ? screen.people.join(" · ") : "—"}</span>
            </header>
            <div className="client-actions">
              <button type="button" className={tab === "details" ? "is-on" : ""} onClick={() => pick(screen.id, "details")}>הגדרות</button>
              <button type="button" className={tab === "slides" ? "is-on" : ""} onClick={() => pick(screen.id, "slides")}>שקפים</button>
              <button type="button" className={tab === "notices" ? "is-on" : ""} onClick={() => pick(screen.id, "notices")}>הודעות</button>
              <a href={`/s/${screen.code || screen.id}`} target="_blank">הצגת המסך</a>
            </div>
            {tab ? (
              <div className="client-panel">
                <ScreenEditor
                  screen={screen}
                  slides={screen.slides}
                  notices={screen.notices}
                  lockAddress
                  musicPeers={musicPeers}
                  panel={tab}
                  returnTo={returnTo}
                />
              </div>
            ) : null}
          </article>
        );
      })}
    </section>
  );
}
