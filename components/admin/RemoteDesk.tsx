"use client";

import { useEffect, useRef, useState } from "react";

export function RemoteDesk({ screenId, title }: { screenId: number; title: string }) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [shot, setShot] = useState("");
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [waiting, setWaiting] = useState(true);
  const [live, setLive] = useState(false);
  const [remoteOn, setRemoteOn] = useState(false);
  const [text, setText] = useState("");
  const [apps, setApps] = useState<{ name: string; package: string }[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");
  const [log, setLog] = useState("");
  const [pictures, setPictures] = useState(true);
  const [keeperOn, setKeeperOn] = useState(false);

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
              if (data.log) setLog(data.log);
              setLive(!!data.screenOn);
              setRemoteOn(!!data.remoteOn);
              setKeeperOn(!!data.keeperOn);
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
      <p>{pictures ? "התמונה קטנה ומתעדכנת כל כמה שניות. לחיצה עליה לוחצת על הסטרימר." : "מעבר התמונות כבוי. הסטרימר לא מצלם ולא שולח."}</p>
      <p><b>{live || remoteOn ? "מחובר" : "לא מחובר"}</b> · {keeperOn ? "שומר השדרוג פעיל" : "שומר השדרוג עדיין לא פעיל"}</p>
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
        <button
          type="button"
          disabled={busy !== ""}
          onClick={() => {
            setBusy("שולחים את שומר השדרוג…");
            void fetch("/keeper.apk")
              .then((response) => response.blob())
              .then(async (body) => {
                const { upload } = await import("@vercel/blob/client");
                const file = new File([body], "ny-keeper.apk", { type: "application/vnd.android.package-archive" });
                const blob = await upload("ny-keeper.apk", file, {
                  access: "public",
                  handleUploadUrl: "/api/admin/remote/apk",
                  contentType: "application/vnd.android.package-archive",
                });
                await send("install", { text: blob.url });
                setNote("השומר נשלח. לחצו אתחול פעם אחת. אחרי העלייה אפשר לשדרג בלי למחוק.");
                setBusy("");
              })
              .catch(() => {
                setNote("שליחת השומר נכשלה");
                setBusy("");
              });
          }}
        >
          התקנת שומר שדרוג
        </button>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          שדרוג NYmedia
          <input
            type="file"
            accept=".apk,application/vnd.android.package-archive"
            disabled={busy !== ""}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              if (!keeperOn) {
                setNote("קודם מתקינים את שומר השדרוג ולוחצים אתחול פעם אחת.");
                return;
              }
              setBusy("שולחים גרסה חדשה…");
              void import("@vercel/blob/client").then(async ({ upload }) => {
                const blob = await upload(file.name.endsWith(".apk") ? file.name : `${file.name}.apk`, file, {
                  access: "public",
                  handleUploadUrl: "/api/admin/remote/apk",
                  contentType: "application/vnd.android.package-archive",
                });
                await fetch("/api/admin/remote/upgrade", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ screenId, url: blob.url }),
                });
                setNote("השומר מתקין את הגרסה בלי למחוק. NYmedia תחזור לבד תוך כדקה.");
                setBusy("");
              }).catch(() => {
                setNote("שליחת הגרסה נכשלה");
                setBusy("");
              });
            }}
          />
        </label>
        <button type="button" onClick={() => { setLog("מבקשים יומן…"); send("log"); }}>יומן אחרון</button>
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
      {waiting && pictures ? <p>{live || remoteOn ? "מחובר. התמונה עולה עוד רגע." : "לא מחובר. האפליקציה על הסטרימר לא שולחת אות."}</p> : null}
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
                setNote("הקובץ נשלח לסטרימר. ההתקנה לוקחת כדקה.");
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
                  ? "למחוק את NYmedia? השליטה מרחוק תיפסק עד שתתקין אותה מחדש על הקופסה."
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
      {log ? <pre style={{ whiteSpace: "pre-wrap", background: "#1b1b1b", color: "#F4F1ED", padding: 12, borderRadius: 12, maxWidth: 1100, maxHeight: 320, overflow: "auto" }}>{log}</pre> : null}
    </div>
  );
}
