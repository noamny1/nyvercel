"use client";

import { useEffect, useRef, useState } from "react";

export function RemoteDesk({ screenId, title }: { screenId: number; title: string }) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [shot, setShot] = useState("");
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [waiting, setWaiting] = useState(true);
  const [text, setText] = useState("");
  const [apps, setApps] = useState<{ name: string; package: string }[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");
  const [shell, setShell] = useState("");
  const [shellOpen, setShellOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [command, setCommand] = useState("");
  const [log, setLog] = useState("");

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
              setShell(data.shell || "");
              setShellOpen(!!data.shellOpen);
              if (data.log) setLog(data.log);
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
        <button type="button" onClick={() => { if (confirm("להפעיל מחדש רק את האפליקציה?")) send("relaunch"); }}>הפעלת האפליקציה</button>
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
      {waiting ? <p>ממתינים שהסטרימר יתחבר. צריך להתקין את אפליקציה 7.1.3 ומעלה.</p> : null}
      {shot ? (
        <img
          ref={imgRef}
          src={shot}
          alt={title}
          onClick={tap}
          style={{ width: "100%", maxWidth: 1100, height: "auto", background: "#111", cursor: "crosshair", borderRadius: 12 }}
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
      <h2 style={{ marginTop: 28 }}>מסוף הקופסה</h2>
      <p>נפתח ל-10 דקות רק עם סיסמת המנהל וקוד מאמת מהטלפון. כל פקודה נשמרת.</p>
      {shellOpen ? (
        <form
          style={{ display: "flex", gap: 8, margin: "12px 0" }}
          onSubmit={(event) => {
            event.preventDefault();
            if (!command.trim()) return;
            send("shell", { text: command.trim() });
            setCommand("");
          }}
        >
          <input value={command} onChange={(event) => setCommand(event.target.value)} placeholder="פקודה" style={{ flex: 1, padding: 8 }} />
          <button type="submit">הרצה</button>
        </form>
      ) : (
        <form
          style={{ display: "flex", gap: 8, margin: "12px 0" }}
          onSubmit={async (event) => {
            event.preventDefault();
            const response = await fetch("/api/admin/remote", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ screenId, op: "shell-open", text: password, code: otp }),
            });
            setPassword("");
            setOtp("");
            if (response.status === 401) {
              const data = await response.json().catch(() => ({}));
              setNote(data.error === "password" ? "הסיסמה שגויה" : "קוד המאמת שגוי. אם עוד אין מאמת, מגדירים אותו בתפריט מאמת.");
            } else if (response.ok) setShellOpen(true);
          }}
        >
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="סיסמת מנהל" style={{ padding: 8 }} />
          <input value={otp} onChange={(event) => setOtp(event.target.value)} inputMode="numeric" autoComplete="one-time-code" placeholder="קוד מאמת" style={{ padding: 8, width: 120 }} />
          <button type="submit">פתיחת מסוף</button>
        </form>
      )}
      {shell ? <pre style={{ whiteSpace: "pre-wrap", background: "#111", color: "#F4F1ED", padding: 12, borderRadius: 12, maxWidth: 1100 }}>{shell}</pre> : null}
      {log ? <pre style={{ whiteSpace: "pre-wrap", background: "#1b1b1b", color: "#F4F1ED", padding: 12, borderRadius: 12, maxWidth: 1100, maxHeight: 320, overflow: "auto" }}>{log}</pre> : null}
    </div>
  );
}
