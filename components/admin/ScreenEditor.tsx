"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { KindMark, ReadyLibrary, SavedSlideEditor, type SlideDraft } from "@/components/admin/ReadyLibrary";
import { NEWS_SOURCES } from "@/lib/news-sources";
import { THEMES } from "@/lib/themes";
import { PLAYLISTS } from "@/lib/music-catalog";
import { scheduleLabel, slideStatus } from "@/lib/schedule";
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
  musicPeers = 1,
  panel,
  returnTo,
  newsTuning = false,
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
    newsTicker?: string;
    feedMode?: string;
    musicPlaylist?: string;
    musicUrl?: string;
    buildingId?: number | null;
  };
  slides: Slide[];
  notices: Notice[];
  scope?: "screen" | "group";
  buildings?: { id: number; name: string }[];
  feeds?: { id: string; name: string }[];
  lockAddress?: boolean;
  musicPeers?: number;
  panel?: "details" | "slides" | "notices";
  returnTo?: string;
  newsTuning?: boolean;
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
  const [ordered, setOrdered] = useState(slides);
  const [dragId, setDragId] = useState<number | null>(null);
  const [overId, setOverId] = useState<number | null>(null);
  const dragged = useRef(false);
  const [tab, setTab] = useState<"details" | "slides" | "notices">(panel || "slides");
  const [themePick, setThemePick] = useState(screen.theme);
  const newsCatalog = feeds && feeds.length > 0 ? feeds : NEWS_SOURCES;
  const [newsPick, setNewsPick] = useState(() => {
    const picked = (screen.newsSource || "ynet").split(",").map((item) => item.trim()).filter(Boolean);
    return picked.slice(0, 3);
  });
  useEffect(() => {
    if (panel) setTab(panel);
  }, [panel]);
  useEffect(() => {
    setOrdered(slides);
  }, [slides]);

  function moveSlides(targetId: number) {
    if (dragId == null || dragId === targetId) return;
    const next = [...ordered];
    const from = next.findIndex((item) => item.id === dragId);
    const to = next.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0) return;
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setOrdered(next);
    setDragId(null);
    setOverId(null);
    void fetch("/api/slides", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: next.map((slide) => slide.id) }),
    }).then(() => router.refresh());
  }

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
      {panel ? null : (
      <div className="editor-tabs" role="tablist">
        <button type="button" className={tab === "slides" ? "is-on" : "light"} onClick={() => setTab("slides")}>שקפים</button>
        <button type="button" className={tab === "details" ? "is-on" : "light"} onClick={() => setTab("details")}>פרטים</button>
        <button type="button" className={tab === "notices" ? "is-on" : "light"} onClick={() => setTab("notices")}>הודעות</button>
      </div>
      )}

      {tab === "details" ? (
      <form className="card" action={save}>
        <input type="hidden" name="id" value={screen.id} />
        {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
        <input type="hidden" name="logoUrl" value={logoUrl.startsWith("http") ? logoUrl : screen.logoUrl} />
        <input type="hidden" name="clearLogo" value={clearLogo ? "1" : ""} />
        <div className="row">
          <label>רחוב<input name="street" defaultValue={screen.street} readOnly={lockAddress} /></label>
          <label>מספר<input name="number" defaultValue={screen.number} readOnly={lockAddress} /></label>
          <label>עיר<input name="city" defaultValue={screen.city} readOnly={lockAddress} /></label>
          <label>תמה
            <select name="theme" defaultValue={screen.theme} onChange={(event) => setThemePick(event.target.value)}>
              {THEMES.map((theme) => (
                <option key={theme.id} value={theme.id}>{theme.name}</option>
              ))}
            </select>
          </label>
          {newsTuning ? (
            <>
              <label>כמות כתבות<input name="newsCount" type="number" min={1} max={20} defaultValue={screen.newsCount ?? 8} /></label>
              <label>שניות לכתבה<input name="tickerSeconds" type="number" min={6} max={40} defaultValue={screen.tickerSeconds ?? 12} /></label>
            </>
          ) : null}
          {scope === "screen" ? (
            <label>פס חדשות
              <select name="newsTicker" defaultValue={screen.newsTicker || "on"}>
                <option value="on">פעיל</option>
                <option value="weekend">כבוי בשישי ושבת</option>
                <option value="off">כבוי</option>
              </select>
            </label>
          ) : null}
          {scope === "screen" && themePick === "luxury" ? (
            <label>תוכן העמודה
              <select name="feedMode" defaultValue={screen.feedMode || "both"}>
                <option value="news">חדשות</option>
                <option value="notices">הודעות הבניין</option>
                <option value="both">חדשות והודעות</option>
              </select>
            </label>
          ) : null}
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
        <fieldset className="day-picks music-picks">
          <legend>חדשות</legend>
          <p>אפשר לבחור עד 3 מקורות. הם יופיעו לסירוגין על המסך.</p>
          <div>
            {newsCatalog.map((source) => {
              const on = newsPick.includes(source.id);
              return (
                <label key={source.id}>
                  <input
                    type="checkbox"
                    name="newsSource"
                    value={source.id}
                    checked={on}
                    disabled={!on && newsPick.length >= 3}
                    onChange={() => {
                      setNewsPick((current) => {
                        if (current.includes(source.id)) {
                          const next = current.filter((item) => item !== source.id);
                          return next.length ? next : current;
                        }
                        if (current.length >= 3) return current;
                        return [...current, source.id];
                      });
                    }}
                  />
                  {source.name}
                </label>
              );
            })}
          </div>
        </fieldset>
        {scope === "screen" ? (
          <fieldset className="day-picks music-picks">
            <legend>מוזיקה</legend>
            <p>אפשר לבחור כמה רשימות. הן יתנגנו בסדר אקראי, בלי מילים ובלי זכויות יוצרים מסחריות. אם לא בוחרים כלום, המוזיקה כבויה.</p>
            <input type="hidden" name="musicForm" value="1" />
            <div>
              {PLAYLISTS.map((playlist) => (
                <label key={playlist.id}>
                  <input type="checkbox" name="music" value={playlist.id} defaultChecked={(screen.musicPlaylist || "").split(",").includes(playlist.id)} />
                  {playlist.name}
                </label>
              ))}
            </div>
            {musicPeers > 1 ? <label><input type="checkbox" name="applyMusic" value="1" /> החל על כל המסכים שלי</label> : null}
          </fieldset>
        ) : null}
        <div className="logo-panel">
          <div className="logo-well">
            {logoPreview ? <img src={logoPreview} alt="" /> : <span>אין לוגו</span>}
          </div>
          <div className="logo-copy">
            <strong>לוגו הבניין</strong>
            <p>{uploading ? "מעלה את הלוגו..." : "מוצג במסך. PNG, JPG או GIF."}</p>
            <div className="logo-actions">
              <label className="file-pill">
                <input
                  type="file"
                  accept="image/*,.gif"
                  disabled={uploading}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) void onLogo(file);
                  }}
                />
                {uploading ? "מעלה..." : logoPreview ? "החלפת לוגו" : "העלאת לוגו"}
              </label>
              {logoPreview ? (
                <button className="light" type="button" onClick={() => { setLogoUrl(""); setLogoPreview(""); setClearLogo(true); }}>מחיקה</button>
              ) : null}
            </div>
          </div>
        </div>
        {message ? <p className="error">{message}</p> : null}
        <button className="save-bar" type="submit" disabled={uploading}>{uploading ? "מעלה את הלוגו..." : "שמירה"}</button>
      </form>
      ) : null}

      {tab === "slides" ? (
      <>
      <section className="card screen-slides">
        <h2>השקפים שמוצגים במסך</h2>
        <p>גררו שקף למקום אחר כדי לקבוע את סדר ההצגה. הראשון ברשימה מוצג ראשון. מסגרת ירוקה: השקף על המסך עכשיו. מסגרת אדומה: הימים או התאריכים לא מתאימים, והשקף לא מופיע.</p>
        <div className="slide-grid">
          {ordered.map((slide) => {
            const status = slideStatus(slide);
            return (
              <button
                className={`ready-card mine-slide ${status.on ? "on" : "off"}${dragId === slide.id ? " dragging" : ""}${overId === slide.id ? " drop-target" : ""}`}
                type="button"
                key={slide.id}
                draggable
                onDragStart={(event) => {
                  dragged.current = true;
                  setDragId(slide.id);
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", String(slide.id));
                }}
                onDragEnd={() => {
                  setDragId(null);
                  setOverId(null);
                  setTimeout(() => { dragged.current = false; }, 0);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setOverId(slide.id);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  moveSlides(slide.id);
                }}
                onClick={() => {
                  if (dragged.current) return;
                  setOpenSlide(slide.id);
                }}
              >
                <span className="slide-label">{slide.title || (slide.kind === "youtube" ? "סרטון" : "שקף")}</span>
                <span className="thumb">
                  {slide.kind === "youtube" ? <img src={/\.mp4(\?|$)/i.test(slide.imageUrl) ? slide.imageUrl.replace(/\.mp4(\?|$)/i, ".jpg$1") : `https://i.ytimg.com/vi/${slide.imageUrl.slice(-11)}/hqdefault.jpg`} alt="" /> : slide.imageUrl.toLowerCase().includes(".pdf") ? <span className="pdf-mark">PDF</span> : <img src={slide.imageUrl} alt="" />}
                  <KindMark video={slide.kind === "youtube"} />
                  <em className={`kind-mark status-mark ${status.on ? "on" : "off"}`}>{status.label}</em>
                </span>
                <small className="slide-when">{scheduleLabel(slide.weekdays ?? "01234", slide.startsOn || "", slide.endsOn || "")}</small>
              </button>
            );
          })}
        </div>
        {slides.length === 0 ? <p>עדיין אין שקפים במסך.</p> : null}
        {openSlide ? (() => {
          const slide = slides.find((item) => item.id === openSlide);
          if (!slide) return null;
          return (
            <SavedSlideEditor
              slide={slide}
              city={screen.city}
              onChange={(payload) => changeSlide(slide.id, payload)}
              onRemove={() => { void removeSlide(slide.id); setOpenSlide(null); }}
              onClose={() => setOpenSlide(null)}
            />
          );
        })() : null}
      </section>
      <section className="card slide-catalog">
        <h2>שקפים להוספה</h2>
        <p>השקפים כאן עדיין לא במסך. לחיצה עליהם מוסיפה אותם.</p>
        <ReadyLibrary city={screen.city} onAdd={onSlide} />
      </section>
      </>
      ) : null}

      {tab === "notices" ? (
      <section className="card">
        <h2>הודעות בניין</h2>
        <form className="notice-add" action={createNotice}>
          <input type="hidden" name={ownerField} value={screen.id} />
          {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
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
                  {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
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
                      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
                      <button className={`light state-dot ${notice.active ? "on" : "off"}`} type="submit">{notice.active ? "פעיל" : "כבוי"}</button>
                    </form>
                    <button className="light" type="button" onClick={() => setEditing(notice.id)}>עריכה</button>
                    <form action={dropNotice}>
                      <input type="hidden" name="id" value={notice.id} />
                      <input type="hidden" name={ownerField} value={screen.id} />
                      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
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
