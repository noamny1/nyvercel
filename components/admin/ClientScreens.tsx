"use client";

import { useState } from "react";
import { ScreenEditor } from "@/components/admin/ScreenEditor";
import { sendAdvice } from "@/app/admin/advice";

type Panel = "slides" | "details" | "notices" | "advice";

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
  feedMode?: string;
  musicPlaylist: string;
  people: string[];
  slides: { id: number; imageUrl: string; duration: number; sort: number; weekdays?: string; startsOn?: string; endsOn?: string; active?: boolean; kind?: string; templateId?: string; title?: string; detail?: string; meta?: string }[];
  notices: { id: number; text: string; active: boolean }[];
};

export function ClientScreens({ rows, musicPeers, returnTo }: { rows: Row[]; musicPeers: number; returnTo: string }) {
  const [open, setOpen] = useState<{ id: number; tab: Panel } | null>(null);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  function pick(id: number, tab: Panel) {
    setError("");
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
              <button type="button" className={tab === "details" ? "is-on" : ""} onClick={() => pick(screen.id, "details")}>הגדרות מסך</button>
              <button type="button" className={tab === "slides" ? "is-on" : ""} onClick={() => pick(screen.id, "slides")}>שקפים</button>
              <button type="button" className={tab === "notices" ? "is-on" : ""} onClick={() => pick(screen.id, "notices")}>הודעות</button>
              <button type="button" className={tab === "advice" ? "is-on" : ""} onClick={() => pick(screen.id, "advice")}>המלצות</button>
              <a href={`/s/${screen.code || screen.id}`} target="_blank">הצגת המסך</a>
            </div>
            {tab === "advice" ? (
              <form
                className="client-panel advice-form"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const form = event.currentTarget;
                  setSending(true);
                  setError("");
                  const result = await sendAdvice(new FormData(form));
                  setSending(false);
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  form.reset();
                  setOpen(null);
                  setSent(true);
                }}
              >
                <label>
                  ההמלצה
                  <textarea name="text" required rows={5} placeholder="כתבו כאן את ההמלצה" />
                </label>
                <input type="hidden" name="screenId" value={screen.id} />
                {error ? <p className="error">{error}</p> : null}
                <button type="submit" disabled={sending}>{sending ? "שולח..." : "שליחה"}</button>
              </form>
            ) : tab ? (
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
      {sent ? (
        <div className="advice-pop-back" role="dialog" aria-modal="true">
          <div className="advice-pop">
            <p>ההודעה נשלחה למנהל המערכת ותטופל בהקדם.</p>
            <button type="button" onClick={() => setSent(false)}>סגירה</button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
