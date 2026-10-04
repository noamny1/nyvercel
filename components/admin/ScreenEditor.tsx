"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { NEWS_SOURCES } from "@/lib/news-sources";
import { THEMES } from "@/lib/themes";
import { addGroupNotice, addNotice, deleteGroupNotice, deleteNotice, toggleGroupNotice, toggleNotice, updateGroup, updateGroupNotice, updateNotice, updateScreen } from "@/app/admin/actions";

type Slide = { id: number; imageUrl: string; duration: number; sort: number; weekdays?: string; active?: boolean };
type Notice = { id: number; text: string; active: boolean };

export function ScreenEditor({
  screen,
  slides,
  notices,
  scope = "screen",
  buildings = [],
  feeds,
  lockAddress = false,
}: {
  screen: {
    id: number;
    name: string;
    street: string;
    number: string;
    city: string;
    theme: string;
    logoUrl: string;
    newsSource: string;
    musicUrl?: string;
    buildingId?: number | null;
  };
  slides: Slide[];
  notices: Notice[];
  scope?: "screen" | "group";
  buildings?: { id: number; name: string }[];
  feeds?: { id: string; name: string }[];
  lockAddress?: boolean;
}) {
  const router = useRouter();
  const save = scope === "group" ? updateGroup : updateScreen;
  const createNotice = scope === "group" ? addGroupNotice : addNotice;
  const flipNotice = scope === "group" ? toggleGroupNotice : toggleNotice;
  const dropNotice = scope === "group" ? deleteGroupNotice : deleteNotice;
  const editNotice = scope === "group" ? updateGroupNotice : updateNotice;
  const ownerField = scope === "group" ? "groupId" : "screenId";
  const [logoUrl, setLogoUrl] = useState(screen.logoUrl);
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [pendingSlide, setPendingSlide] = useState<File | null>(null);

  async function upload(file: File, kind: "image" | "slide") {
    const body = new FormData();
    body.set("file", file);
    body.set("kind", kind);
    const response = await fetch("/api/upload", { method: "POST", body });
    const data = (await response.json()) as { url?: string; error?: string };
    if (!response.ok || !data.url) throw new Error(data.error || "ההעלאה נכשלה");
    return data.url;
  }

  async function onLogo(file: File) {
    setMessage("");
    try {
      setLogoUrl(await upload(file, "image"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ההעלאה נכשלה");
    }
  }

  async function onSlide(file: File, duration: number) {
    setMessage("");
    try {
      const imageUrl = await upload(file, "slide");
      const response = await fetch("/api/slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [ownerField]: screen.id, imageUrl, duration }),
      });
      if (!response.ok) throw new Error("שמירת השקף נכשלה");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ההעלאה נכשלה");
    }
  }

  async function changeSlide(id: number, payload: { duration?: number; direction?: "up" | "down"; weekdays?: string; imageUrl?: string }) {
    await fetch("/api/slides", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...payload }),
    });
    router.refresh();
  }

  async function removeSlide(id: number) {
    await fetch("/api/slides", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    router.refresh();
  }

  return (
    <div>
      <form className="card" action={save}>
        <input type="hidden" name="id" value={screen.id} />
        <input type="hidden" name="logoUrl" value={logoUrl} />
        <div className="row">
          <label>רחוב<input name="street" defaultValue={screen.street} readOnly={lockAddress} /></label>
          <label>מספר<input name="number" defaultValue={screen.number} readOnly={lockAddress} /></label>
          <label>עיר<input name="city" defaultValue={screen.city} readOnly={lockAddress} /></label>
          <label>תמה
            <select name="theme" defaultValue={screen.theme}>
              {THEMES.map((theme) => (
                <option key={theme.id} value={theme.id}>{theme.name}</option>
              ))}
            </select>
          </label>
          <label>חדשות
            <select name="newsSource" defaultValue={screen.newsSource}>
              {(feeds && feeds.length > 0 ? feeds : NEWS_SOURCES).map((source) => (
                <option key={source.id} value={source.id}>{source.name}</option>
              ))}
            </select>
          </label>
          {scope === "group" ? (
            <>
              <label>מוזיקה<input name="musicUrl" defaultValue={screen.musicUrl || ""} placeholder="קישור לקובץ שמע" /></label>
              <label>בניין
                <select name="buildingId" defaultValue={screen.buildingId ?? ""}>
                  <option value="">ללא</option>
                  {buildings.map((building) => (
                    <option key={building.id} value={building.id}>{building.name}</option>
                  ))}
                </select>
              </label>
            </>
          ) : null}
        </div>
        <div className="media-box">
          <label>לוגו הבניין
            <input type="file" accept="image/*,.gif" onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void onLogo(file);
            }} />
          </label>
          {logoUrl ? (
            <div className="thumb-row">
              <img src={logoUrl} alt="" />
              <button className="light" type="button" onClick={() => setLogoUrl("")}>מחיקה</button>
            </div>
          ) : null}
          <button type="submit">שמירה</button>
        </div>
      </form>

      <section className="card">
        <h2>שקפים</h2>
        <p>אפשר כמה שקפים. הם יופיעו אחד אחרי השני וחוזר חלילה.</p>
        <div className="media-box">
          <label>תמונה או PDF
            <input type="file" accept="image/*,.pdf,application/pdf" onChange={(event) => setPendingSlide(event.target.files?.[0] || null)} />
          </label>
          <button type="button" onClick={() => { if (pendingSlide) void onSlide(pendingSlide, 8).then(() => setPendingSlide(null)); }}>שמירה</button>
        </div>
        <div className="slide-grid">
          {slides.map((slide) => (
            <article className="slide-card" key={slide.id}>
              {slide.imageUrl.toLowerCase().includes(".pdf") ? (
                <span className="pdf-mark">PDF</span>
              ) : (
                <img src={slide.imageUrl} alt="" />
              )}
              <label>שניות
                <input type="number" min={3} defaultValue={slide.duration} onBlur={(event) => {
                  void changeSlide(slide.id, { duration: Number(event.target.value) });
                }} />
              </label>
              <label>החלפה
                <input type="file" accept="image/*,.pdf,application/pdf" onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void upload(file, "slide").then((imageUrl) => changeSlide(slide.id, { imageUrl }));
                }} />
              </label>
              <button className="light" type="button" onClick={() => removeSlide(slide.id)}>מחיקה</button>
            </article>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>הודעות בניין</h2>
        <form className="notice-add" action={createNotice}>
          <input type="hidden" name={ownerField} value={screen.id} />
          <textarea name="text" placeholder="הודעה חדשה" maxLength={120} rows={3} required />
          <button type="submit">הוספה</button>
        </form>
        <div className="notices">
          {notices.map((notice) => (
            <article className="notice-item" key={notice.id}>
              {editing === notice.id ? (
                <form className="notice-add" action={editNotice}>
                  <input type="hidden" name="id" value={notice.id} />
                  <input type="hidden" name={ownerField} value={screen.id} />
                  <textarea name="text" defaultValue={notice.text} maxLength={120} rows={3} required />
                  <button type="submit">שמירה</button>
                  <button className="light" type="button" onClick={() => setEditing(null)}>ביטול</button>
                </form>
              ) : (
                <>
                  <p>{notice.text}</p>
                  <div className="notice-actions">
                    <form action={flipNotice}>
                      <input type="hidden" name="id" value={notice.id} />
                      <input type="hidden" name={ownerField} value={screen.id} />
                      <button className={`light state-dot ${notice.active ? "on" : "off"}`} type="submit">{notice.active ? "פעיל" : "כבוי"}</button>
                    </form>
                    <button className="light" type="button" onClick={() => setEditing(notice.id)}>עריכה</button>
                    <form action={dropNotice}>
                      <input type="hidden" name="id" value={notice.id} />
                      <input type="hidden" name={ownerField} value={screen.id} />
                      <button className="light" type="submit">מחיקה</button>
                    </form>
                  </div>
                </>
              )}
            </article>
          ))}
        </div>
      </section>
      {message ? <p className="error">{message}</p> : null}
    </div>
  );
}
