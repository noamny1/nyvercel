"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ReadyLibrary, SavedSlideEditor, type SlideDraft } from "@/components/admin/ReadyLibrary";
import { NEWS_SOURCES } from "@/lib/news-sources";
import { THEMES } from "@/lib/themes";
import { scheduleLabel } from "@/lib/schedule";
import { addGroupNotice, addNotice, deleteGroupNotice, deleteNotice, toggleGroupNotice, toggleNotice, updateGroup, updateGroupNotice, updateNotice, updateScreen } from "@/app/admin/actions";

type Slide = { id: number; imageUrl: string; duration: number; sort: number; weekdays?: string; startsOn?: string; endsOn?: string; active?: boolean; kind?: string; templateId?: string; title?: string; detail?: string; meta?: string };
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
  const [openSlide, setOpenSlide] = useState<number | null>(null);
  const [tab, setTab] = useState<"details" | "slides" | "notices">("slides");
  const [library, setLibrary] = useState(false);

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

  async function onSlide(draft: SlideDraft) {
    setMessage("");
    const imageUrl = draft.file ? await upload(draft.file, "slide") : draft.imageUrl || "";
    if (!imageUrl) throw new Error("חסר קובץ או קישור");
    const response = await fetch("/api/slides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        [ownerField]: screen.id,
        imageUrl,
        duration: draft.duration || 8,
        kind: draft.kind,
        templateId: draft.templateId || "",
        title: draft.title || "",
        detail: draft.detail || "",
        meta: draft.meta || "",
      }),
    });
    if (!response.ok) throw new Error("שמירת השקף נכשלה");
    router.refresh();
  }

  async function changeSlide(id: number, payload: { duration?: number; direction?: "up" | "down"; weekdays?: string; startsOn?: string; endsOn?: string; imageUrl?: string; title?: string; detail?: string; meta?: string }) {
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
      <div className="editor-tabs" role="tablist">
        <button type="button" className={tab === "slides" ? "is-on" : "light"} onClick={() => setTab("slides")}>שקפים</button>
        <button type="button" className={tab === "details" ? "is-on" : "light"} onClick={() => setTab("details")}>פרטים</button>
        <button type="button" className={tab === "notices" ? "is-on" : "light"} onClick={() => setTab("notices")}>הודעות</button>
      </div>

      {tab === "details" ? (
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
      ) : null}

      {tab === "slides" ? (
      <section className="card">
        <h2>השקפים במסך</h2>
        <p>כל שקף מופיע כתמונה קטנה. לחיצה פותחת את התזמון: ימים בשבוע, ומתאריך עד תאריך.</p>
        <div className="slide-grid">
          {slides.map((slide) => (
            <button className="ready-card mine-slide" type="button" key={slide.id} onClick={() => setOpenSlide(slide.id)}>
              {slide.kind === "youtube" ? <img src={slide.imageUrl.endsWith(".mp4") ? slide.imageUrl.replace(/\.mp4$/, ".jpg") : `https://i.ytimg.com/vi/${slide.imageUrl.slice(-11)}/hqdefault.jpg`} alt="" /> : slide.imageUrl.toLowerCase().includes(".pdf") ? <span className="pdf-mark">PDF</span> : <img src={slide.imageUrl} alt="" />}
              <span>
                <strong>{slide.title || (slide.kind === "youtube" ? "סרטון" : "שקף")}</strong>
                <small>{scheduleLabel(slide.weekdays ?? "01234", slide.startsOn || "", slide.endsOn || "")}</small>
              </span>
            </button>
          ))}
        </div>
        {slides.length === 0 ? <p>עדיין אין שקפים במסך.</p> : null}
        <button type="button" onClick={() => setLibrary((value) => !value)}>{library ? "סגירת ההוספה" : "הוספת שקף"}</button>
        {library ? (
          <>
            <p>בוחרים קטגוריה, ואז שקף. התזמון נקבע אוטומטית, ואפשר לשנות אותו אחר כך.</p>
            <ReadyLibrary onAdd={onSlide} />
          </>
        ) : null}
        {openSlide ? (() => {
          const slide = slides.find((item) => item.id === openSlide);
          if (!slide) return null;
          return (
            <SavedSlideEditor
              slide={slide}
              onChange={(payload) => changeSlide(slide.id, payload)}
              onRemove={() => { void removeSlide(slide.id); setOpenSlide(null); }}
              onClose={() => setOpenSlide(null)}
            />
          );
        })() : null}
      </section>
      ) : null}

      {tab === "notices" ? (
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
      ) : null}
      {message ? <p className="error">{message}</p> : null}
    </div>
  );
}
