"use client";

import { useState } from "react";

export function FilePane({
  token,
  name,
  kind,
  text,
}: {
  token: string;
  name: string;
  kind: "image" | "pdf" | "text";
  text: string;
}) {
  const [open, setOpen] = useState(false);
  const extra = name && name !== "מסמך לדיירים" ? name : "";
  return (
    <main className="file-view" onContextMenu={(event) => event.preventDefault()}>
      <header>
        <img src="/nymedia-logo.png" alt="" />
        <div>
          <strong>מסמך לדיירים</strong>
          {extra ? <em>{extra}</em> : null}
          <span>צפייה בלבד. אין הורדה מהאתר.</span>
        </div>
      </header>
      <button type="button" className="file-open" aria-expanded={open} onClick={() => setOpen(true)}>
        פתיחת הקובץ
      </button>
      <section className={kind === "text" ? "is-text" : ""}>
        {open ? null : <p className="file-wait">הקובץ ייפתח כאן, בלי הורדה.</p>}
        {open && kind === "image" ? <img src={`/v/${token}/file`} alt="" draggable={false} /> : null}
        {open && kind === "pdf" ? <iframe src={`/v/${token}/file#toolbar=0&navpanes=0`} title="מסמך לדיירים" /> : null}
        {open && kind === "text" ? <pre>{text}</pre> : null}
        {open && kind === "image" ? <div className="file-shield" /> : null}
      </section>
    </main>
  );
}
