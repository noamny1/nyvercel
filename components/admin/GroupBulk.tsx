"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { NEWS_SOURCES } from "@/lib/news-sources";
import { PLAYLISTS } from "@/lib/music-catalog";
import { bulkAddNotice, bulkAddSlide, bulkRemoveNotice, bulkRemoveSlide, bulkSettings } from "@/app/admin/bulk/actions";

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

type Tool = "settings" | "slides" | "notices";

function placeOf(screen: Row) {
  const place = [screen.street, screen.number].filter(Boolean).join(" ");
  return [place, screen.city].filter(Boolean).join(", ") || screen.name;
}

function slideName(slide: { title?: string; templateId?: string }) {
  if (slide.templateId === "group-promo") return "סרטון תדמית";
  return slide.title || "שקף";
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
  const [seconds, setSeconds] = useState(8);
  const [message, setMessage] = useState("");

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
    setTool((current) => (current === next ? null : next));
  }

  async function run(work: () => Promise<{ ok: boolean; error?: string; count?: number }>) {
    setBusy(true);
    setError("");
    setNote("");
    try {
      const result = await work();
      if (!result.ok) {
        setError(result.error || "העדכון נכשל");
        return;
      }
      setNote(`עודכן ב-${result.count || picked.length} מסכים`);
      router.refresh();
    } catch {
      setError("העדכון נכשל");
    } finally {
      setBusy(false);
    }
  }

  async function uploadSlide(file: File) {
    const body = new FormData();
    body.set("file", file);
    body.set("kind", "slide");
    const response = await fetch("/api/upload", { method: "POST", body });
    const data = (await response.json()) as { url?: string; error?: string };
    if (!response.ok || !data.url) throw new Error(data.error || "ההעלאה נכשלה");
    await run(() => bulkAddSlide({ screenIds: picked, imageUrl: data.url || "", duration: seconds }));
  }

  return (
    <section className="bulk-frame">
      <p>הפעולות במסגרת הזו חלות על כל המסכים המסומנים, או על חלק מהם.</p>
      <div className="bulk-switch">
        <button type="button" className={tool === "settings" ? "is-on" : ""} onClick={() => open("settings")}>הגדרות מסכים</button>
        <button type="button" className={tool === "slides" ? "is-on" : ""} onClick={() => open("slides")}>הוספת שקפים למס מסכים</button>
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
          {tool === "slides" ? (
            <div className="bulk-form">
              <h3>הוספת שקף</h3>
              <label>שניות<input type="number" min={3} max={120} value={seconds} onChange={(event) => setSeconds(Number(event.target.value) || 8)} /></label>
              <label className="file-pick">
                {busy ? "מעלה..." : "העלאת שקף למסכים שנבחרו"}
                <input
                  type="file"
                  accept="image/*,.gif,.pdf,application/pdf"
                  disabled={busy}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) void uploadSlide(file).catch((reason) => setError(reason instanceof Error ? reason.message : "ההעלאה נכשלה"));
                  }}
                />
              </label>
              <h3>מחיקת שקף מהמסכים שנבחרו</h3>
              {slides.length ? (
                <div className="bulk-list">
                  {slides.map((slide) => (
                    <article key={slide.imageUrl}>
                      <span>{slide.name} · ב-{slide.count} מסכים</span>
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
    </section>
  );
}
