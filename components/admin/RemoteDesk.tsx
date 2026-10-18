"use client";

import { useEffect, useRef, useState } from "react";

export function RemoteDesk({ screenId, title }: { screenId: number; title: string }) {
  const imgRef = useRef<HTMLImageElement>(null);
  const seenAt = useRef(0);
  const [shot, setShot] = useState("");
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [fresh, setFresh] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");
  const [keeperOn, setKeeperOn] = useState(false);
  const [keeper2On, setKeeper2On] = useState(false);
  const [waking, setWaking] = useState(false);
  const [wakeReady, setWakeReady] = useState(false);
  const [keeperChecked, setKeeperChecked] = useState(false);
  const [live, setLive] = useState(false);
  const ready = wakeReady;

  useEffect(() => {
    let stop = false;
    const tick = async () => {
      while (!stop) {
        try {
          const response = await fetch(`/api/admin/remote/apps?screenId=${screenId}`, { cache: "no-store" });
          if (response.ok) {
            const data = await response.json();
            if (!stop) {
              if (data.note) setNote(data.note);
              setKeeperOn(!!data.keeperOn);
              setKeeper2On(!!data.keeper2On);
              setWaking(!!data.waking);
              setWakeReady(!!data.wakeReady);
              setKeeperChecked(true);
            }
          }
        } catch {
          // The next poll retries.
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    };
    tick();
    return () => {
      stop = true;
    };
  }, [screenId]);

  useEffect(() => {
    if (!live) return;
    let stop = false;
    seenAt.current = 0;
    const tick = async () => {
      while (!stop) {
        try {
          const response = await fetch(`/api/admin/remote?screenId=${screenId}&at=${seenAt.current}`, { cache: "no-store" });
          if (response.ok) {
            const data = await response.json() as { image?: string; mime?: string; w?: number; h?: number; at?: number; same?: boolean };
            if (data.same && data.at) {
              setFresh(`תמונה עדכנית, לפני ${Math.max(0, Math.round((Date.now() - data.at) / 1000))} שניות`);
            } else if (data.image && !stop) {
              seenAt.current = Number(data.at) || 0;
              setShot(`data:${data.mime || "image/jpeg"};base64,${data.image}`);
              setSize({ w: Number(data.w) || 0, h: Number(data.h) || 0 });
              if (data.at) setFresh(`תמונה עדכנית, לפני ${Math.max(0, Math.round((Date.now() - data.at) / 1000))} שניות`);
            }
          }
        } catch {
          // The next poll retries.
        }
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    };
    tick();
    return () => {
      stop = true;
      void fetch(`/api/admin/remote?screenId=${screenId}&watch=0&t=${Date.now()}`, { cache: "no-store" });
    };
  }, [screenId, live]);

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
    void send("tap", { x, y });
  }

  return (
    <div>
      <p style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            width: 18,
            height: 18,
            borderRadius: "50%",
            display: "inline-block",
            background: !keeperChecked ? "#cfc8bf" : keeperOn ? "#1faa4a" : "#d12626",
            boxShadow: keeperChecked ? `0 0 12px ${keeperOn ? "#1faa4a" : "#d12626"}` : "none",
          }}
        />
        <b>{!keeperChecked ? "בודקים גישה…" : keeperOn ? "גישה פעילה" : "אין גישה"}</b>
        <span
          style={{
            width: 18,
            height: 18,
            borderRadius: "50%",
            display: "inline-block",
            background: !keeperChecked ? "#cfc8bf" : keeper2On ? "#1faa4a" : "#d12626",
            boxShadow: keeperChecked ? `0 0 12px ${keeper2On ? "#1faa4a" : "#d12626"}` : "none",
          }}
        />
        <b>{!keeperChecked ? "בודקים NYKEEPER2…" : keeper2On ? "NYKEEPER2 פעיל" : "אין NYKEEPER2"}</b>
        <span
          style={{
            width: 18,
            height: 18,
            borderRadius: "50%",
            display: "inline-block",
            background: live ? "#1faa4a" : "#d12626",
            boxShadow: `0 0 12px ${live ? "#1faa4a" : "#d12626"}`,
          }}
        />
        <b>{live ? "חיבור פתוח" : "חיבור סגור"}</b>
      </p>
      <p>זה המסך של {title}. לחיצה על התמונה לוחצת באותו מקום בסטרימר.</p>
      <div className="remote-keys">
        <button type="button" onClick={() => send("key", { text: "4" })}>אחורה</button>
        <button type="button" onClick={() => send("key", { text: "3" })}>מסך הבית</button>
        <button type="button" onClick={() => send("key", { text: "24" })}>ווליום למעלה</button>
        <button type="button" onClick={() => send("key", { text: "25" })}>ווליום למטה</button>
        <button
          type="button"
          style={ready ? { background: "#1faa4a" } : waking ? { background: "#d12626" } : undefined}
          onClick={() => {
            if (ready) return;
            setWaking(true);
            setWakeReady(false);
            void send("wake");
          }}
        >
          {ready ? "המכשיר מוכן" : waking ? "ממתין למכשיר" : "הער גישה"}
        </button>
        <button
          type="button"
          disabled={!live && !ready}
          style={!live && !ready ? { opacity: 0.45 } : undefined}
          onClick={() => {
            if (!live && !ready) {
              setNote("קודם לוחצים הער גישה. כשהכפתור ירוק אפשר לפתוח חיבור.");
              return;
            }
            const next = !live;
            setLive(next);
            void send("frames", { text: next ? "1" : "0" });
          }}
        >
          {live ? "סגירת חיבור" : "פתיחת חיבור"}
        </button>
        <button type="button" onClick={() => send("media", { text: "0" })}>עצירת NYMEDIA</button>
        <button type="button" onClick={() => send("media", { text: "1" })}>הפעלת NYMEDIA</button>
        <button
          type="button"
          onClick={() => {
            if (window.confirm("למחוק את NYMEDIA מהסטרימר?")) void send("uninstall", { text: "com.example.nymediaapp" });
          }}
        >
          מחיקת NYMEDIA
        </button>
        <button
          type="button"
          onClick={() => {
            if (!keeper2On) {
              window.alert("NYKEEPER2 עדיין לא פעיל. לא מוחקים את הישן.");
              return;
            }
            if (window.confirm("למחוק רק את NYKEEPER הישן? NYKEEPER2 לא יימחק.")) {
              void send("uninstall", { text: "com.example.nymediakeeper" });
            }
          }}
        >
          מחיקת NYKEEPER
        </button>
        <button
          type="button"
          onClick={() => {
            if (window.confirm("לאתחל את הסטרימר?")) void send("reboot");
          }}
        >
          אתחול סטרימר
        </button>
      </div>
      {shot ? (
        <img
          ref={imgRef}
          src={shot}
          alt={title}
          onClick={tap}
          style={{ width: 480, maxWidth: "100%", height: "auto", background: "#111", cursor: "crosshair", borderRadius: 12 }}
        />
      ) : (
        <p>המסך עדיין לא מופיע. בסטרימר פותחים את NY Keeper ומאשרים את חלון הרוט, אפשר לצמיתות.</p>
      )}
      <label style={{ display: "flex", gap: 8, alignItems: "center", margin: "16px 0" }}>
        העברת קובץ
        <input
          type="file"
          disabled={!keeperOn || busy !== ""}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file || !keeperOn) return;
            setBusy("מעלים את הקובץ…");
            void import("@vercel/blob/client").then(async ({ upload }) => {
              const blob = await upload(file.name, file, {
                access: "public",
                handleUploadUrl: "/api/admin/remote/apk",
                contentType: file.type || "application/octet-stream",
              });
              await send("install", { text: blob.url });
              setNote("הקובץ בדרך לסטרימר.");
              setBusy("");
            }).catch(() => {
              setNote("העלאת הקובץ נכשלה");
              setBusy("");
            });
          }}
        />
      </label>
      {fresh ? <p>{fresh}</p> : null}
      {busy ? <p>{busy}</p> : null}
      {note ? <p>{note}</p> : null}
    </div>
  );
}
