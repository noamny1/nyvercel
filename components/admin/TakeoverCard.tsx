"use client";

import { useState } from "react";
import { setTakeover } from "@/app/admin/manage/actions";

export function TakeoverCard({ active, imageUrl }: { active: boolean; imageUrl: string }) {
  const [url, setUrl] = useState(imageUrl);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  async function onFile(file: File) {
    setUploading(true);
    setMessage("");
    const body = new FormData();
    body.set("file", file);
    body.set("kind", "image");
    const response = await fetch("/api/upload", { method: "POST", body });
    const data = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
    setUploading(false);
    if (!response.ok || !data.url) {
      setMessage(data.error || "ההעלאה נכשלה");
      return;
    }
    setUrl(data.url);
  }

  return (
    <form className="card" action={setTakeover}>
      <h2>תמונה לכל המסכים</h2>
      <p>
        {active
          ? "התמונה מוצגת כרגע על כל המסכים, במקום השקפים. ההגדרות של הלקוחות לא השתנו, והן יחזרו ברגע שההצגה תיעצר."
          : "אפשר להעלות תמונה ולהציג אותה על כל המסך, בכל המסכים. השקפים, המוזיקה ושאר ההגדרות נשמרים וחוזרים בסיום."}
      </p>
      {url ? <img className="takeover-preview" src={url} alt="" /> : null}
      <input type="hidden" name="url" value={url} />
      <div className="row">
        <label className="file-pill">
          <input
            type="file"
            accept="image/*,.gif"
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void onFile(file);
            }}
          />
          {uploading ? "מעלה..." : url ? "החלפת תמונה" : "העלאת תמונה"}
        </label>
        <button type="submit" name="on" value="1" disabled={!url || uploading}>
          {active ? "עדכון התמונה בכל המסכים" : "הצגה בכל המסכים"}
        </button>
        {active ? (
          <button className="light" type="submit" name="on" value="0">החזרת המסכים</button>
        ) : null}
      </div>
      {message ? <p className="error">{message}</p> : null}
    </form>
  );
}
