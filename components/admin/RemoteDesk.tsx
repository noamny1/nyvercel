"use client";

import { useEffect, useRef, useState } from "react";

export function RemoteDesk({ screenId, title }: { screenId: number; title: string }) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [shot, setShot] = useState("");
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [waiting, setWaiting] = useState(true);
  const [text, setText] = useState("");

  useEffect(() => {
    let stop = false;
    let current = "";
    const tick = async () => {
      while (!stop) {
        try {
          const response = await fetch(`/api/admin/remote?screenId=${screenId}`, { cache: "no-store" });
          if (response.status === 200) {
            const w = Number(response.headers.get("X-Remote-W")) || 0;
            const h = Number(response.headers.get("X-Remote-H")) || 0;
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            if (current) URL.revokeObjectURL(current);
            current = url;
            if (!stop) {
              setShot(url);
              setSize({ w, h });
              setWaiting(false);
            }
          }
        } catch {
          // The next poll retries.
        }
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }
    };
    tick();
    return () => {
      stop = true;
      if (current) URL.revokeObjectURL(current);
    };
  }, [screenId]);

  async function send(op: string, extra: Record<string, number | string> = {}) {
    await fetch("/api/admin/remote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ screenId, op, ...extra }),
    });
  }

  function tap(event: React.MouseEvent<HTMLImageElement>) {
    const node = imgRef.current;
    if (!node || !size.w || !size.h) return;
    const rect = node.getBoundingClientRect();
    const x = Math.round(((event.clientX - rect.left) / rect.width) * size.w);
    const y = Math.round(((event.clientY - rect.top) / rect.height) * size.h);
    send("tap", { x, y });
  }

  return (
    <div>
      <p>התמונה מתעדכנת כל שנייה בערך. לחיצה על התמונה לוחצת על הסטרימר.</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0" }}>
        <button type="button" onClick={() => send("key", { text: "4" })}>אחורה</button>
        <button type="button" onClick={() => send("key", { text: "3" })}>מסך הבית</button>
        <button type="button" onClick={() => send("key", { text: "66" })}>אישור</button>
        <button type="button" onClick={() => send("key", { text: "24" })}>ווליום +</button>
        <button type="button" onClick={() => send("key", { text: "25" })}>ווליום -</button>
        <button type="button" onClick={() => { if (confirm(`לאתחל את ${title}?`)) send("reboot"); }}>אתחול</button>
      </div>
      <form
        style={{ display: "flex", gap: 8, marginBottom: 12 }}
        onSubmit={(event) => {
          event.preventDefault();
          if (text.trim()) send("text", { text: text.trim() });
          setText("");
        }}
      >
        <input value={text} onChange={(event) => setText(event.target.value)} placeholder="טקסט באנגלית" style={{ padding: 8 }} />
        <button type="submit">שליחה</button>
      </form>
      {waiting ? <p>ממתינים שהסטרימר יתחבר. צריך להתקין את אפליקציה 7.1.0 ומעלה.</p> : null}
      {shot ? (
        <img
          ref={imgRef}
          src={shot}
          alt={title}
          onClick={tap}
          style={{ width: "100%", maxWidth: 1100, height: "auto", background: "#111", cursor: "crosshair", borderRadius: 12 }}
        />
      ) : null}
    </div>
  );
}
