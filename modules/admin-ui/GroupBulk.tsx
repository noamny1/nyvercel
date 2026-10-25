"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { NEWS_SOURCES } from "@/modules/broadcast/news-sources";
import { PLAYLISTS } from "@/modules/music/catalog";
import { bulkAddNotice, bulkAddSlide, bulkRemoveNotice, bulkRemoveSlide, bulkSettings } from "@/app/admin/bulk/actions";
import { ReadyLibrary, type SlideDraft } from "@/modules/admin-ui/ReadyLibrary";
import { FIXED_VIDEOS, READY_SLIDES } from "@/modules/slides/ready";

type Row = {
  id: number;
  street: string;
  number: string;
  city: string;
  floor?: string;
  name: string;
  slides: { imageUrl: string; title?: string; templateId?: string }[];
  notices: { text: string }[];
};

type Tool = "settings" | "notices" | "existing";

function placeOf(screen: Row) {
  const place = [screen.street, screen.number].filter(Boolean).join(" ");
  return [place, screen.city].filter(Boolean).join(", ") || screen.name;
}

function slideName(slide: { title?: string; templateId?: string }) {
  if (slide.templateId === "group-promo") return "סרטון תדמית";
  return slide.title || "שקף";
}

function slideThumb(slide: { imageUrl: string; templateId?: string }) {
  const official = FIXED_VIDEOS.find((item) => item.id === slide.templateId || item.url === slide.imageUrl);
  if (official) return { kind: "image" as const, src: official.poster };
  const ready = READY_SLIDES.find((item) => item.id === slide.templateId);
  if (ready?.image) return { kind: "image" as const, src: ready.image };
  const url = slide.imageUrl;
  const youtube = url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
  if (youtube) return { kind: "image" as const, src: `https://i.ytimg.com/vi/${youtube[1]}/hqdefault.jpg` };
  if (/\.pdf(\?|$)/i.test(url)) return { kind: "pdf" as const, src: "" };
  if (/\.(mp4|webm|mov)(\?|$)/i.test(url)) return { kind: "video" as const, src: url };
  return { kind: "image" as const, src: url };
}

export function GroupBulk({ rows, themes }: { rows: Row[]; themes: { id: string; name: string }[] }) {
  const router = useRouter();
  const [tool, setTool] = useState<Tool | null>(null);
  const [picked, setPicked] = useState<number[]>(() => rows.map((screen) => screen.id));
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [apply, setApply] = useState({ theme: false, newsTicker: false, feedMode: false, news: false, music: false });
  const [theme, setTheme] = useState(themes[0]?.id || "modern");
  const [newsTicker, setNewsTicker] = useState("on");
  const [feedMode, setFeedMode] = useState("both");
  const [news, setNews] = useState<string[]>(["ynet"]);
  const [music, setMusic] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [popup, setPopup] = useState<{ ok: boolean; text: string } | null>(null);
  const [catalog, setCatalog] = useState(false);
  const [pending, setPending] = useState<SlideDraft | null>(null);
  const [assignIds, setAssignIds] = useState<number[]>([]);

  const selected = rows.filter((screen) => picked.includes(screen.id));
  const allOn = rows.length > 0 && picked.length === rows.length;

  const slides = useMemo(() => {
    const map = new Map<string, { imageUrl: string; name: string; count: number }>();
    for (const screen of selected) {
      const seen = new Set<string>();
      for (const slide of screen.slides) {
        if (!slide.imageUrl || seen.has(slide.imageUrl)) continue;
        seen.add(slide.imageUrl);
        const current = map.get(slide.imageUrl);
        if (current) current.count += 1;
        else map.set(slide.imageUrl, { imageUrl: slide.imageUrl, name: slideName(slide), count: 1 });
      }
    }
    return [...map.values()];
  }, [selected]);

  const notices = useMemo(() => {
    const map = new Map<string, number>();
    for (const screen of selected) {
      const seen = new Set<string>();
      for (const notice of screen.notices) {
        const text = notice.text.trim();
        if (!text || seen.has(text)) continue;
        seen.add(text);
        map.set(text, (map.get(text) || 0) + 1);
      }
    }
    return [...map.entries()].map(([text, count]) => ({ text, count }));
  }, [selected]);

  function toggle(id: number) {
    setPicked((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function open(next: Tool) {
    setError("");
    setNote("");
    setCatalog(false);
    setPending(null);
    setTool((current) => (current === next ? null : next));
  }

  function openCatalog() {
    setError("");
    setNote("");
    setTool(null);
    setPending(null);
    setCatalog((open) => !open);
  }

  async function stageSlide(draft: SlideDraft) {
    setPending(draft);
    setAssignIds(rows.map((screen) => screen.id));
  }

  function toggleAssign(id: number) {
    setAssignIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function commitSlide() {
    if (!pending) return;
    if (!assignIds.length) {
      setPopup({ ok: false, text: "לא נבחרו מסכים." });
      return;
    }
    try {
      let imageUrl = pending.imageUrl || "";
      if (pending.file) {
        const body = new FormData();
        body.set("file", pending.file);
        body.set("kind", "slide");
        const response = await fetch("/api/upload", { method: "POST", body });
        const data = (await response.json()) as { url?: string; error?: string };
        if (!response.ok || !data.url) {
          setPopup({ ok: false, text: data.error || "ההעלאה נכשלה" });
          return;
        }
        imageUrl = data.url;
      }
      if (!imageUrl) {
        setPopup({ ok: false, text: "חסר קובץ שקף" });
        return;
      }
      const title = pending.title || "";
      const result = await run(() => bulkAddSlide({
        screenIds: assignIds,
        imageUrl,
        duration: pending.duration || 8,
        title,
        detail: pending.detail || "",
        meta: pending.meta || "",
        kind: pending.kind,
        templateId: pending.templateId || "",
        weekdays: pending.weekdays,
        startsOn: pending.startsOn,
        endsOn: pending.endsOn,
      }));
      if (result.ok) {
        setPending(null);
        setCatalog(false);
        setPopup({ ok: true, text: `${title || "השקף"} עלה ל-${result.count || assignIds.length} מסכים.` });
      } else {
        setPopup({ ok: false, text: result.text || "ההעלאה נכשלה" });
      }
    } catch {
      setPopup({ ok: false, text: "ההעלאה נכשלה" });
    }
  }

  async function run(work: () => Promise<{ ok: boolean; error?: string; count?: number }>) {
    setBusy(true);
    setError("");
    setNote("");
    try {
      const result = await work();
      if (!result.ok) {
        const text = result.error || "העדכון נכשל";
        setError(text);
        return { ok: false, text };
      }
      setNote(`עודכן ב-${result.count || picked.length} מסכים`);
      router.refresh();
      return { ok: true, text: "", count: result.count || picked.length };
    } catch {
      setError("העדכון נכשל");
      return { ok: false, text: "העדכון נכשל" };
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="bulk-frame">
      <p>הפעולות במסגרת הזו חלות על כל המסכים המסומנים, או על חלק מהם.</p>
      <div className="bulk-switch">
        <button type="button" className={tool === "settings" ? "is-on" : ""} onClick={() => open("settings")}>הגדרות מסכים</button>
        <button type="button" className={catalog ? "is-on" : ""} onClick={openCatalog}>הוספת שקפים למס מסכים</button>
        <button type="button" className={tool === "existing" ? "is-on" : ""} onClick={() => open("existing")}>השקפים הקיימים</button>
        <button type="button" className={tool === "notices" ? "is-on" : ""} onClick={() => open("notices")}>הודעות למס מסכים</button>
      </div>
      {tool ? (
        <div className="bulk-panel">
          <label className="bulk-all">
            <input
              type="checkbox"
              checked={allOn}
              onChange={() => setPicked(allOn ? [] : rows.map((screen) => screen.id))}
            />
            <span>סמן את כל המסכים</span>
          </label>
          <div className="bulk-picks">
            {rows.map((screen) => (
              <label key={screen.id}>
                <input type="checkbox" checked={picked.includes(screen.id)} onChange={() => toggle(screen.id)} />
                <span>{placeOf(screen)} · {screen.floor || "לובי"}</span>
              </label>
            ))}
          </div>
          {tool === "settings" ? (
            <div className="bulk-form">
              <label className="bulk-line">
                <input type="checkbox" checked={apply.theme} onChange={() => setApply((current) => ({ ...current, theme: !current.theme }))} />
                <span>תמה</span>
                <select value={theme} onChange={(event) => setTheme(event.target.value)}>
                  {themes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
              <label className="bulk-line">
                <input type="checkbox" checked={apply.newsTicker} onChange={() => setApply((current) => ({ ...current, newsTicker: !current.newsTicker }))} />
                <span>חדשות</span>
                <select value={newsTicker} onChange={(event) => setNewsTicker(event.target.value)}>
                  <option value="on">פעיל</option>
                  <option value="weekend">כבוי בשישי ושבת</option>
                  <option value="off">כבוי</option>
                </select>
              </label>
              <label className="bulk-line">
                <input type="checkbox" checked={apply.feedMode} onChange={() => setApply((current) => ({ ...current, feedMode: !current.feedMode }))} />
                <span>תוכן העמודה</span>
                <select value={feedMode} onChange={(event) => setFeedMode(event.target.value)}>
                  <option value="news">חדשות</option>
                  <option value="notices">הודעות הבניין</option>
                  <option value="both">חדשות והודעות</option>
                </select>
              </label>
              <fieldset className="choice-card">
                <legend>
                  <label className="bulk-all">
                    <input type="checkbox" checked={apply.news} onChange={() => setApply((current) => ({ ...current, news: !current.news }))} />
                    מקורות חדשות
                  </label>
                </legend>
                <div className="choices">
                  {NEWS_SOURCES.map((source) => {
                    const on = news.includes(source.id);
                    return (
                      <label key={source.id}>
                        <input
                          type="checkbox"
                          checked={on}
                          disabled={!on && news.length >= 4}
                          onChange={() => setNews((current) => {
                            if (current.includes(source.id)) {
                              const next = current.filter((item) => item !== source.id);
                              return next.length ? next : current;
                            }
                            if (current.length >= 4) return current;
                            return [...current, source.id];
                          })}
                        />
                        {source.name}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
              <fieldset className="choice-card">
                <legend>
                  <label className="bulk-all">
                    <input type="checkbox" checked={apply.music} onChange={() => setApply((current) => ({ ...current, music: !current.music }))} />
                    מוזיקה
                  </label>
                </legend>
                <p>בלי בחירה, המוזיקה תיכבה במסכים שנבחרו.</p>
                <div className="choices">
                  {PLAYLISTS.map((playlist) => (
                    <label key={playlist.id}>
                      <input
                        type="checkbox"
                        checked={music.includes(playlist.id)}
                        onChange={() => setMusic((current) => current.includes(playlist.id) ? current.filter((item) => item !== playlist.id) : [...current, playlist.id])}
                      />
                      {playlist.name}
                    </label>
                  ))}
                </div>
              </fieldset>
              <button type="button" disabled={busy} onClick={() => void run(() => bulkSettings({ screenIds: picked, theme, newsTicker, feedMode, newsSource: news, music, apply }))}>
                {busy ? "מעדכן..." : "החל על המסכים שנבחרו"}
              </button>
            </div>
          ) : null}
          {tool === "existing" ? (
            <div className="bulk-form">
              <h3>השקפים במסכים שנבחרו</h3>
              {slides.length ? (
                <div className="bulk-list">
                  {slides.map((slide) => (
                    <article key={slide.imageUrl}>
                      <div className="bulk-slide">
                        {(() => {
                          const thumb = slideThumb(slide);
                          if (thumb.kind === "pdf") return <span className="bulk-thumb is-pdf">PDF</span>;
                          if (thumb.kind === "video") return <video className="bulk-thumb" src={thumb.src} muted playsInline preload="metadata" />;
                          return <img className="bulk-thumb" src={thumb.src} alt="" />;
                        })()}
                        <span>{slide.name} · ב-{slide.count} מסכים</span>
                      </div>
                      <button
                        className="light"
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          if (!window.confirm("למחוק את השקף מהמסכים שנבחרו?")) return;
                          void run(() => bulkRemoveSlide({ screenIds: picked, imageUrl: slide.imageUrl }));
                        }}
                      >
                        מחיקה
                      </button>
                    </article>
                  ))}
                </div>
              ) : <p>אין שקפים במסכים שנבחרו.</p>}
            </div>
          ) : null}
          {tool === "notices" ? (
            <div className="bulk-form">
              <h3>הוספת הודעה</h3>
              <label>
                ההודעה
                <textarea value={message} maxLength={120} rows={3} onChange={(event) => setMessage(event.target.value)} placeholder="הודעה חדשה" />
              </label>
              <button
                type="button"
                disabled={busy}
                onClick={() => void run(async () => {
                  const result = await bulkAddNotice({ screenIds: picked, text: message });
                  if (result.ok) setMessage("");
                  return result;
                })}
              >
                {busy ? "מוסיף..." : "הוספה למסכים שנבחרו"}
              </button>
              <h3>מחיקת הודעה מהמסכים שנבחרו</h3>
              {notices.length ? (
                <div className="bulk-list">
                  {notices.map((notice) => (
                    <article key={notice.text}>
                      <span>{notice.text} · ב-{notice.count} מסכים</span>
                      <button
                        className="light"
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          if (!window.confirm("למחוק את ההודעה מהמסכים שנבחרו?")) return;
                          void run(() => bulkRemoveNotice({ screenIds: picked, text: notice.text }));
                        }}
                      >
                        מחיקה
                      </button>
                    </article>
                  ))}
                </div>
              ) : <p>אין הודעות במסכים שנבחרו.</p>}
            </div>
          ) : null}
          {error ? <p className="error">{error}</p> : null}
          {note ? <p>{note}</p> : null}
        </div>
      ) : null}
      {catalog ? (
        <div className="modal" role="dialog" aria-modal="true">
          <div className={`card ${pending ? "bulk-assign" : "bulk-library"}`}>
            {pending ? (
              <>
                <h3>לאיזה מסכים לשייך</h3>
                <p>{pending.title || "השקף שנבחר"}</p>
                <label className="bulk-all">
                  <input
                    type="checkbox"
                    checked={rows.length > 0 && assignIds.length === rows.length}
                    onChange={() => setAssignIds(assignIds.length === rows.length ? [] : rows.map((screen) => screen.id))}
                  />
                  <span>סמן את כל המסכים</span>
                </label>
                <div className="bulk-picks">
                  {rows.map((screen) => (
                    <label key={screen.id}>
                      <input type="checkbox" checked={assignIds.includes(screen.id)} onChange={() => toggleAssign(screen.id)} />
                      <span>{placeOf(screen)} · {screen.floor || "לובי"}</span>
                    </label>
                  ))}
                </div>
                <button type="button" disabled={busy} onClick={() => void commitSlide()}>
                  {busy ? "מוסיף..." : "הוספה למסכים שנבחרו"}
                </button>
                <button type="button" className="light" onClick={() => setPending(null)}>חזרה לשקפים</button>
              </>
            ) : (
              <>
                <h3>בחירת שקף</h3>
                <p>אותם שקפים כמו במסך בודד. שקף חדש שנוסיף למערכת יופיע כאן.</p>
                <ReadyLibrary city={rows[0]?.city || ""} addLabel="המשך לבחירת מסכים" onAdd={stageSlide} />
                <button type="button" className="light" onClick={() => setCatalog(false)}>סגירה</button>
              </>
            )}
          </div>
        </div>
      ) : null}
      {popup ? (
        <div className="modal" role="dialog" aria-modal="true">
          <div className={`card bulk-pop ${popup.ok ? "is-ok" : "is-bad"}`}>
            <strong>{popup.ok ? "השקף עלה" : "ההעלאה נכשלה"}</strong>
            <p>{popup.text}</p>
            <button type="button" onClick={() => setPopup(null)}>סגירה</button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
