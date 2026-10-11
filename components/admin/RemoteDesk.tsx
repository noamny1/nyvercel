"use client";

import { useEffect, useRef, useState } from "react";

export function RemoteDesk({ screenId, title }: { screenId: number; title: string }) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [shot, setShot] = useState("");
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [waiting, setWaiting] = useState(true);
  const [live, setLive] = useState(false);
  const [remoteOn, setRemoteOn] = useState(false);
  const [apps, setApps] = useState<{ name: string; package: string }[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");
  const [pictures, setPictures] = useState(false);
  const [keeperOn, setKeeperOn] = useState(false);
  const [keeperChecked, setKeeperChecked] = useState(false);

  useEffect(() => {
    void fetch(`/api/admin/remote?screenId=${screenId}&watch=0`, { cache: "no-store" });
  }, [screenId]);

  useEffect(() => {
    let stop = false;
    const tick = async () => {
      while (!stop) {
        try {
          const response = await fetch(`/api/admin/remote/apps?screenId=${screenId}`, { cache: "no-store" });
          if (response.ok) {
            const data = await response.json();
            if (!stop) {
              setApps(Array.isArray(data.apps) ? data.apps : []);
              if (data.note) setNote(data.note);
              setLive(!!data.screenOn);
              setRemoteOn(!!data.remoteOn);
              setKeeperOn(!!data.keeperOn);
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
    if (!pictures) return;
    let stop = false;
    const tick = async () => {
      while (!stop) {
        try {
          const response = await fetch(`/api/admin/remote?screenId=${screenId}`, { cache: "no-store" });
          if (!response.ok) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            continue;
          }
          const data = await response.json() as { image?: string; mime?: string; w?: number; h?: number };
          if (data.image && !stop) {
            setShot(`data:${data.mime || "image/jpeg"};base64,${data.image}`);
            setSize({ w: Number(data.w) || 0, h: Number(data.h) || 0 });
            setWaiting(false);
          }
        } catch {
          // The next poll retries.
        }
        await new Promise((resolve) => setTimeout(resolve, 2200));
      }
    };
    tick();
    return () => {
      stop = true;
    };
  }, [screenId, pictures]);

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
      <p>{pictures ? "התמונה מגיעה משומר השדרוג. לחיצה עליה לוחצת על הסטרימר." : "מעבר התמונות כבוי. השומר לא מצלם ולא שולח."}</p>
      <p><b>{live || remoteOn ? "מחובר" : "לא מחובר"}</b></p>
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
        <b>{!keeperChecked ? "בודקים את שומר השדרוג…" : keeperOn ? "שומר שדרוג רץ תקין" : "שומר שדרוג לא רץ"}</b>
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0" }}>
        <button
          type="button"
          onClick={() => {
            const next = !pictures;
            setPictures(next);
            if (!next) {
              setShot("");
              setWaiting(true);
              void fetch(`/api/admin/remote?screenId=${screenId}&watch=0`, { cache: "no-store" });
            }
          }}
        >
          {pictures ? "כיבוי תמונות" : "הדלקת תמונות"}
        </button>
        <button type="button" onClick={() => send("key", { text: "4" })}>אחורה</button>
        <button type="button" onClick={() => send("key", { text: "3" })}>מסך הבית</button>
        <button type="button" onClick={() => send("key", { text: "66" })}>אישור</button>
        <button type="button" onClick={() => send("key", { text: "24" })}>ווליום +</button>
        <button type="button" onClick={() => send("key", { text: "25" })}>ווליום -</button>
        <button type="button" onClick={() => { if (confirm(`לאתחל את ${title}?`)) send("reboot"); }}>אתחול</button>
        <button type="button" onClick={() => { if (confirm("להפעיל מחדש רק את האפליקציה?")) send("relaunch"); }}>הפעלת האפליקציה</button>
        <button
          type="button"
          onClick={() => {
            if (!confirm("למחוק את NYmedia? אם שומר השדרוג פעיל והותקנה גרסה דרכו, הוא יחזיר אותה.")) return;
            setNote("נשלחה מחיקה של NYmedia.");
            send("uninstall", { text: "com.example.nymediaapp" });
          }}
        >
          מחיקת NYmedia
        </button>
      </div>
      {waiting && pictures ? <p>התמונות דולקות. אם אין תמונה תוך כמה שניות, ההודעה למטה מסבירה למה.</p> : null}
      {shot ? (
        <img
          ref={imgRef}
          src={shot}
          alt={title}
          onClick={tap}
          style={{ width: "100%", maxWidth: 720, height: "auto", background: "#111", cursor: "crosshair", borderRadius: 12 }}
        />
      ) : null}
      <h2 style={{ marginTop: 28 }}>אפליקציות על הסטרימר</h2>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", margin: "12px 0" }}>
        <button type="button" onClick={() => { setNote("מבקשים את הרשימה…"); send("apps"); }}>רענון רשימה</button>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          התקנת APK
          <input
            type="file"
            accept=".apk,application/vnd.android.package-archive"
            disabled={busy !== ""}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              setBusy("מעלים את הקובץ…");
              void import("@vercel/blob/client").then(async ({ upload }) => {
                const blob = await upload(file.name.endsWith(".apk") ? file.name : `${file.name}.apk`, file, {
                  access: "public",
                  handleUploadUrl: "/api/admin/remote/apk",
                  contentType: "application/vnd.android.package-archive",
                });
                await send("install", { text: blob.url });
                setNote("הקובץ נשלח. הוא נשמר בתיקיית Download על הסטרימר, ומותקן משם.");
                setBusy("");
              }).catch(() => {
                setNote("העלאת הקובץ נכשלה");
                setBusy("");
              });
            }}
          />
        </label>
      </div>
      {busy ? <p>{busy}</p> : null}
      {note ? <p>{note}</p> : null}
      <div style={{ display: "grid", gap: 8, maxWidth: 720 }}>
        {apps.map((app) => (
          <div key={app.package} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <span>{app.name}<br /><small>{app.package}</small></span>
            <button
              type="button"
              onClick={() => {
                const self = app.package === "com.example.nymediaapp";
                const message = self
                  ? "למחוק את NYmedia? המסך ייכבה. השומר נשאר."
                  : `למחוק את ${app.name}?`;
                if (!confirm(message)) return;
                setNote("מוחקים…");
                send("uninstall", { text: app.package });
              }}
            >
              מחיקה
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
