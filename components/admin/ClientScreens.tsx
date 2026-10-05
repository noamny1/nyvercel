"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
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

  return (
    <div className="table-wrap">
      <table className="screen-table">
        <thead>
          <tr>
            <th>מסך</th>
            <th>רחוב</th>
            <th>מספר</th>
            <th>עיר</th>
            <th>משתמשים</th>
            <th>פעולות</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((screen) => (
            <Fragment key={screen.id}>
              <tr>
                <td data-label="מסך">{screen.code || screen.id}</td>
                <td data-label="רחוב">{screen.street || "—"}</td>
                <td data-label="מספר">{screen.number || "—"}</td>
                <td data-label="עיר">{screen.city || "—"}</td>
                <td data-label="משתמשים">
                  {screen.people.length ? screen.people.map((name) => <span key={name} className="assigned-user">{name}</span>) : "—"}
                </td>
                <td data-label="פעולות" className="acts">
                  <a className="icon-btn" href={`/s/${screen.code || screen.id}`} target="_blank">פתיחה</a>
                  <Link className="icon-btn" href={`/admin/screens/${screen.id}`}>עריכה</Link>
                  <button type="button" className={open?.id === screen.id && open.tab === "slides" ? "is-on" : "light"} onClick={() => pick(screen.id, "slides")}>שקפים</button>
                  <button type="button" className={open?.id === screen.id && open.tab === "details" ? "is-on" : "light"} onClick={() => pick(screen.id, "details")}>פרטים</button>
                  <button type="button" className={open?.id === screen.id && open.tab === "notices" ? "is-on" : "light"} onClick={() => pick(screen.id, "notices")}>הודעות</button>
                </td>
              </tr>
              {open?.id === screen.id ? (
                <tr className="inline-editor">
                  <td colSpan={6}>
                    <ScreenEditor
                      screen={screen}
                      slides={screen.slides}
                      notices={screen.notices}
                      lockAddress
                      musicPeers={musicPeers}
                      panel={open.tab}
                      returnTo={returnTo}
                    />
                  </td>
                </tr>
              ) : null}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
