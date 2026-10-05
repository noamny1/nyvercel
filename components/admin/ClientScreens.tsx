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

const PANELS: { id: Panel; label: string }[] = [
  { id: "slides", label: "שקפים" },
  { id: "details", label: "פרטים" },
  { id: "notices", label: "הודעות" },
];

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
              <div>
                <strong>{address}</strong>
                <small>מסך {screen.code || screen.id}</small>
              </div>
              {screen.people.length ? <span>{screen.people.join(" · ")}</span> : null}
            </header>
            <div className="client-actions">
              <a href={`/s/${screen.code || screen.id}`} target="_blank">פתיחה</a>
              {PANELS.map((panel) => (
                <button type="button" key={panel.id} className={tab === panel.id ? "is-on" : ""} onClick={() => pick(screen.id, panel.id)}>{panel.label}</button>
              ))}
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
