"use client";

import { useEffect, useState } from "react";

export function RemoteDesk({ screenId, title }: { screenId: number; title: string }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");
  const [keeperOn, setKeeperOn] = useState(false);
  const [keeperChecked, setKeeperChecked] = useState(false);

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

  async function send(op: string, extra: Record<string, string> = {}) {
    await fetch("/api/admin/remote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ screenId, op, ...extra }),
    });
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
      </p>
      <p>{keeperOn ? `${title} מחובר. אפשר להעביר קובץ.` : "השומר על הסטרימר לא מחובר, ולכן אי אפשר להעביר קובץ."}</p>
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
            setNote("");
            void import("@vercel/blob/client").then(async ({ upload }) => {
              const blob = await upload(file.name, file, {
                access: "public",
                handleUploadUrl: "/api/admin/remote/apk",
                contentType: file.type || "application/octet-stream",
              });
              await send("install", { text: blob.url });
              setNote("הקובץ בדרך לסטרימר. כאן יופיע איפה הוא נשמר.");
              setBusy("");
            }).catch(() => {
              setNote("העלאת הקובץ נכשלה");
              setBusy("");
            });
          }}
        />
      </label>
      {busy ? <p>{busy}</p> : null}
      {note ? <p>{note}</p> : null}
    </div>
  );
}
