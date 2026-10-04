"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { NEWS_SOURCES } from "@/lib/news-sources";
import { READY_SLIDES } from "@/lib/ready-slides";
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
    newsCount?: number;
    tickerSeconds?: number;
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
  const [logoPreview, setLogoPreview] = useState(screen.logoUrl);
  const [uploading, setUploading] = useState(false);
  const [clearLogo, setClearLogo] = useState(false);
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [pendingSlide, setPendingSlide] = useState<File | null>(null);
  const [slidePreview, setSlidePreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [openReady, setOpenReady] = useState<(typeof READY_SLIDES)[number] | null>(null);
  const [openSlide, setOpenSlide] = useState<number | null>(null);

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
    setClearLogo(false);
    setUploading(true);
    setLogoPreview(URL.createObjectURL(file));
    try {
      const url = await upload(file, "image");
      setLogoUrl(url);
      setLogoPreview(url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ההעלאה נכשלה");
    } finally {
      setUploading(false);
    }
  }

  async function onSlide(file: File, duration: number) {
    setMessage("");
    setSaving(true);
    try {
      const imageUrl = await upload(file, "slide");
      const response = await fetch("/api/slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [ownerField]: screen.id, imageUrl, duration }),
      });
      if (!response.ok) throw new Error("שמירת השקף נכשלה");
      setPendingSlide(null);
      setSlidePreview("");
      setOpenReady(null);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ההעלאה נכשלה");
    } finally {
      setSaving(false);
    }
  }

  async function addReady(imageUrl: string) {
    setMessage("");
    setSaving(true);
    try {
      const response = await fetch("/api/slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [ownerField]: screen.id, imageUrl, duration: 8 }),
      });
      if (!response.ok) throw new Error("שמירת השקף נכשלה");
      setOpenReady(null);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ההעלאה נכשלה");
    } finally {
      setSaving(false);
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
        <input type="hidden" name="logoUrl" value={logoUrl.startsWith("http") ? logoUrl : screen.logoUrl} />
        <input type="hidden" name="clearLogo" value={clearLogo ? "1" : ""} />
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
          <label>כמות כתבות<input name="newsCount" type="number" min={1} max={20} defaultValue={screen.newsCount ?? 8} /></label>
          <label>שניות לכתבה<input name="tickerSeconds" type="number" min={6} max={40} defaultValue={screen.tickerSeconds ?? 12} /></label>
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
          {logoPreview ? (
            <div className="thumb-row">
              <img src={logoPreview} alt="" />
              <button className="light" type="button" onClick={() => { setLogoUrl(""); setLogoPreview(""); setClearLogo(true); }}>מחיקה</button>
            </div>
          ) : null}
          <button type="submit" disabled={uploading}>{uploading ? "מעלה את הלוגו..." : "שמירה"}</button>
          {message ? <p className="error">{message}</p> : null}
        </div>
      </form>

      <section className="card">
        <h2>שקפים</h2>
        <p>בוחרים שקף מוכן מהתמונות הקטנות. בתוך השקף אפשר לעדכן אותו בתמונה גדולה.</p>
        {Array.from(new Set(READY_SLIDES.map((item) => item.category))).map((category) => (
          <div key={category}>
            <h3 className="ready-cat">{category}</h3>
            <div className="ready-grid">
              {READY_SLIDES.filter((item) => item.category === category).map((item) => (
                <button className="ready-thumb" type="button" key={item.id} onClick={() => { setOpenReady(item); setOpenSlide(null); }}>
                  <img src={item.src} alt={item.title} />
                  <span>{item.title}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
        {openReady ? (
          <div className="ready-large">
            <img src={slidePreview || openReady.src} alt={openReady.title} />
            <div>
              <strong>{openReady.category}</strong>
              <p>{openReady.title}</p>
              <label>עדכון בתמונה או PDF
                <input type="file" accept="image/*,.pdf,application/pdf" onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  setPendingSlide(file);
                  setSlidePreview(file && !file.name.toLowerCase().endsWith(".pdf") ? URL.createObjectURL(file) : "");
                }} />
              </label>
              <button type="button" disabled={saving} onClick={() => void (pendingSlide ? onSlide(pendingSlide, 8).then(() => setOpenReady(null)) : addReady(openReady.src))}>{saving ? "שומר..." : "הוספה למסך"}</button>
              <button className="light" type="button" onClick={() => { setOpenReady(null); setPendingSlide(null); setSlidePreview(""); }}>סגירה</button>
            </div>
          </div>
        ) : null}
        <div className="slide-grid">
          {slides.map((slide) => (
            <article className={`slide-card${openSlide === slide.id ? " open" : ""}`} key={slide.id}>
              <button className="ready-thumb" type="button" onClick={() => { setOpenSlide(slide.id); setOpenReady(null); }}>
                {slide.imageUrl.toLowerCase().includes(".pdf") ? (
                  <span className="pdf-mark">PDF</span>
                ) : (
                  <img src={slide.imageUrl} alt="" />
                )}
              </button>
              {openSlide === slide.id ? (
                <div className="ready-large">
                  {slide.imageUrl.toLowerCase().includes(".pdf") ? <span className="pdf-mark">PDF</span> : <img src={slide.imageUrl} alt="" />}
                  <div>
                    <label>שניות
                      <input type="number" min={3} defaultValue={slide.duration} onBlur={(event) => {
                        void changeSlide(slide.id, { duration: Number(event.target.value) });
                      }} />
                    </label>
                    <label>עדכון בתמונה גדולה
                      <input type="file" accept="image/*,.pdf,application/pdf" onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void upload(file, "slide").then((imageUrl) => changeSlide(slide.id, { imageUrl }));
                      }} />
                    </label>
                    <button className="light" type="button" onClick={() => removeSlide(slide.id)}>מחיקה</button>
                    <button className="light" type="button" onClick={() => setOpenSlide(null)}>סגירה</button>
                  </div>
                </div>
              ) : (
                <label>שניות
                  <input type="number" min={3} defaultValue={slide.duration} onBlur={(event) => {
                    void changeSlide(slide.id, { duration: Number(event.target.value) });
                  }} />
                </label>
              )}
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
