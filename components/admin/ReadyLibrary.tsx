"use client";

import { useEffect, useState } from "react";
import { SlideAgent } from "@/components/admin/SlideAgent";
import { ParashaSlide } from "@/components/player/ParashaSlide";
import { KnowledgeSlide } from "@/components/player/KnowledgeSlide";
import { isDeckId, type DeckId } from "@/lib/decks";
import { fillLine, FIXED_VIDEOS, READY_SLIDES, WEEKDAYS, clientSetsDuration, readMeta, templateSeconds, type ReadySlide, type SlideMeta } from "@/lib/ready-slides";
import { PestVideo, QrSlide } from "@/components/player/SpecialSlides";
import "@/components/player/player.css";

export type SlideDraft = {
  kind: "image" | "template" | "youtube";
  imageUrl?: string;
  file?: File;
  templateId?: string;
  title?: string;
  detail?: string;
  meta?: string;
  duration?: number;
};

function todayInIsrael() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());
}

function FlowPick({ flow, onPick }: { flow?: string; onPick: (flow: "scroll" | "static") => void }) {
  return (
    <fieldset className="day-picks">
      <legend>תצוגת הפרשה</legend>
      <div>
        <button type="button" className={flow !== "static" ? "is-on" : "light"} onClick={() => onPick("scroll")}>גלילה איטית</button>
        <button type="button" className={flow === "static" ? "is-on" : "light"} onClick={() => onPick("static")}>קבוע בדף אחד</button>
      </div>
    </fieldset>
  );
}

export function KindMark({ video }: { video?: boolean }) {
  return <em className="kind-mark">{video ? "סרטון" : "שקף רגיל"}</em>;
}

function youtubeId(url: string) {
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
  return match?.[1] || "";
}

function SlidePeek({ url, title }: { url: string; title?: string }) {
  const id = youtubeId(url);
  if (/\.(mp4|webm|mov)(\?|$)/i.test(url)) return <video className="mini-preview" src={url} controls muted playsInline />;
  if (id) return <iframe className="mini-preview" src={`https://www.youtube.com/embed/${id}?rel=0`} title={title || "תצוגה מקדימה"} allow="encrypted-media; picture-in-picture" />;
  if (url.toLowerCase().includes(".pdf")) return <span className="pdf-mark large">PDF</span>;
  return <img className="mini-preview" src={url} alt="" />;
}
function showsCopy(kind?: string, templateId?: string) {
  if (kind === "youtube" || templateId?.startsWith("fixed-") || templateId === "file-qr") return false;
  if (templateId === "weekly-parasha" || isDeckId(templateId)) return false;
  return kind === "template" || kind === "image";
}

function Photo({ slide, meta, overlay = true, title, line }: { slide: ReadySlide; meta: SlideMeta; overlay?: boolean; title?: string; line?: string }) {
  return (
    <div className="photo-slide">
      <img src={slide.image} alt="" />
      <KindMark />
      {overlay ? (
      <div>
        <small>{slide.category}</small>
        <strong>{fillLine(title ?? slide.title, meta)}</strong>
        <span>{fillLine(line ?? slide.line, meta)}</span>
      </div>
      ) : null}
    </div>
  );
}

function DeckPreview({ id }: { id: DeckId }) {
  const [offset, setOffset] = useState(0);
  return (
    <div className="deck-wrap">
      <div className="deck-preview">
        <KnowledgeSlide deck={id} offset={offset} />
      </div>
      <button type="button" className="light" onClick={() => setOffset((value) => value + 1)}>נושא אחר מהמאגר</button>
    </div>
  );
}

function LiveParasha({ city, still = false }: { city: string; still?: boolean }) {
  const [reading, setReading] = useState<{ parsha: string; candles: string; havdalah?: string; city: string; verses: string[] } | null>(null);
  useEffect(() => {
    let stop = false;
    fetch(`/api/reading?city=${encodeURIComponent(city)}`)
      .then((response) => response.json())
      .then((data) => { if (!stop) setReading(data); })
      .catch(() => undefined);
    return () => { stop = true; };
  }, [city]);
  return (
    <div className="parasha-preview">
      <ParashaSlide name={reading?.parsha || ""} candles={reading?.candles || ""} havdalah={reading?.havdalah || ""} city={reading?.city || city} verses={reading?.verses || []} seconds={180} still={still} />
    </div>
  );
}

function sourceText(saved: string, templateText: string | undefined, meta: SlideMeta) {
  if (!templateText) return saved;
  if (!saved || saved === templateText || saved === fillLine(templateText, meta)) return templateText;
  return saved;
}

export function ReadyLibrary({ onAdd, city = "" }: { onAdd: (draft: SlideDraft) => Promise<void>; city?: string }) {
  const [preview, setPreview] = useState<(typeof FIXED_VIDEOS)[number] | null>(null);
  const [open, setOpen] = useState<ReadySlide | null>(null);
  const [meta, setMeta] = useState<SlideMeta>({});
  const [heading, setHeading] = useState("");
  const [body, setBody] = useState("");
  const [mode, setMode] = useState<"" | "image" | "youtube">("");
  const [pest, setPest] = useState(false);
  const [pestDay, setPestDay] = useState("שלישי");
  const [pestFrom, setPestFrom] = useState("09:00");
  const [pestSeconds, setPestSeconds] = useState(15);
  const [pestTitle, setPestTitle] = useState("הדברה");
  const [pestLine, setPestLine] = useState("לסגור חלונות בזמן ההדברה");
  const [qrOpen, setQrOpen] = useState(false);
  const [qrToken, setQrToken] = useState("");
  const [qrName, setQrName] = useState("");
  const [qrTitle, setQrTitle] = useState("מסמך לדיירים");
  const [qrNote, setQrNote] = useState("סרקו את הברקוד כדי לראות את הקובץ.");
  const [qrSeconds, setQrSeconds] = useState(20);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function choose(slide: ReadySlide) {
    setError("");
    setMode("");
    setOpen(slide);
    setMeta(readMeta("", slide.defaults));
    setHeading(slide.title);
    setBody(slide.line);
  }

  async function saveTemplate() {
    if (!open) return;
    setBusy(true);
    setError("");
    try {
      await onAdd({
        kind: "template",
        imageUrl: open.image,
        templateId: open.id,
        title: fillLine(heading, meta),
        detail: fillLine(body, meta),
        meta: JSON.stringify(open.id === "weekly-parasha" ? { ...meta, flow: meta.flow || "scroll" } : meta),
        duration: templateSeconds(open.id),
      });
      setOpen(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "השמירה נכשלה");
    } finally {
      setBusy(false);
    }
  }

  async function addFixed(video: (typeof FIXED_VIDEOS)[number]) {
    setBusy(true);
    setError("");
    try {
      await onAdd({
        kind: "youtube",
        imageUrl: video.url,
        templateId: video.id,
        title: video.title,
        detail: video.line,
        duration: video.duration,
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "השמירה נכשלה");
    } finally {
      setBusy(false);
    }
  }

  async function addPest() {
    const video = FIXED_VIDEOS.find((item) => item.id === "fixed-pest");
    if (!video) return;
    setBusy(true);
    setError("");
    try {
      await onAdd({
        kind: "youtube",
        imageUrl: video.url,
        templateId: video.id,
        title: pestTitle.trim() || "הדברה",
        detail: pestLine.trim(),
        meta: JSON.stringify({ day: pestDay, from: pestFrom }),
        duration: Math.max(5, pestSeconds || 15),
      });
      setPest(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "השמירה נכשלה");
    } finally {
      setBusy(false);
    }
  }

  async function uploadViewFile(file: File) {
    const body = new FormData();
    body.set("file", file);
    body.set("title", qrTitle.trim());
    const response = await fetch("/api/files", { method: "POST", body });
    const data = (await response.json()) as { token?: string; name?: string; error?: string };
    if (!response.ok || !data.token) throw new Error(data.error || "ההעלאה נכשלה");
    return { token: data.token, name: data.name || file.name };
  }

  async function saveQr() {
    if (!qrToken) {
      setError("קודם מעלים קובץ לצפייה");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onAdd({
        kind: "template",
        imageUrl: "/ready-slides/file-qr.svg",
        templateId: "file-qr",
        title: qrTitle.trim() || "מסמך לדיירים",
        detail: qrNote.trim(),
        meta: JSON.stringify({ token: qrToken, name: qrName, full: true }),
        duration: Math.max(8, qrSeconds || 20),
      });
      setQrOpen(false);
      setQrToken("");
      setQrName("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "השמירה נכשלה");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ready-library">
      <div className="ready-grid">
        <button type="button" className="ready-card add-card" onClick={() => { setOpen(null); setMode("image"); setError(""); }}>
          <span className="slide-label">שקף תמונה חדש</span>
          <span className="thumb add-thumb">
            <KindMark />
          </span>
        </button>
        <button type="button" className="ready-card add-card" onClick={() => { setOpen(null); setMode("youtube"); setError(""); }}>
          <span className="slide-label">סרטון יוטיוב חדש</span>
          <span className="thumb add-thumb">
            <KindMark video />
          </span>
        </button>
        <button type="button" className="ready-card add-card" onClick={() => { setOpen(null); setPest(false); setPreview(null); setMode(""); setQrOpen(true); setQrToken(""); setError(""); }}>
          <span className="slide-label">ברקוד לקובץ</span>
          <span className="thumb add-thumb">
            <img src="/ready-slides/file-qr.svg" alt="" />
          </span>
        </button>
        {FIXED_VIDEOS.map((video) => (
            <button key={video.id} type="button" className="ready-card" disabled={busy} onClick={() => {
              setOpen(null);
              setMode("");
              setQrOpen(false);
              if (video.id === "fixed-pest") {
                setPreview(null);
                setPest(true);
                setError("");
                return;
              }
              setPest(false);
              setPreview(video);
            }}>
              <span className="slide-label">{video.title}</span>
              <div className="photo-slide">
                <img src={video.poster} alt="" />
                <KindMark video />
              </div>
            </button>
          ))}
      </div>
      <div className="ready-grid">
        {READY_SLIDES.map((slide) => (
          <button key={slide.id} type="button" className="ready-card" onClick={() => choose(slide)}>
            <span className="slide-label">{slide.title}</span>
            <Photo slide={slide} meta={slide.defaults} overlay={false} />
          </button>
        ))}
      </div>
      {preview ? (
        <div className="slide-modal" role="dialog" aria-modal="true" onClick={() => setPreview(null)}>
          <div className="slide-modal-card" onClick={(event) => event.stopPropagation()}>
            <SlidePeek url={preview.url} title={preview.title} />
            <div className="slide-modal-actions">
              <strong>{preview.title}</strong>
              <p>{preview.line}</p>
              <p>{preview.duration} שניות, לפי אורך הסרטון.</p>
              <button type="button" disabled={busy} onClick={() => void addFixed(preview).then(() => setPreview(null))}>{busy ? "שומר..." : "הוספה למסך"}</button>
              <button type="button" className="light" onClick={() => setPreview(null)}>סגירה</button>
              {error ? <p className="error">{error}</p> : null}
            </div>
          </div>
        </div>
      ) : null}
      {open ? (
        <div className="slide-modal" role="dialog" aria-modal="true" onClick={() => setOpen(null)}>
          <div className="slide-modal-card" onClick={(event) => event.stopPropagation()}>
            {open.id === "weekly-parasha" ? <LiveParasha city={city} still={meta.flow === "static"} /> : isDeckId(open.id) ? <DeckPreview id={open.id} /> : <Photo slide={open} meta={meta} title={heading} line={body} />}
            <div className="slide-modal-actions">
              {open.id === "weekly-parasha" ? (
                <FlowPick flow={meta.flow} onPick={(flow) => setMeta({ ...meta, flow })} />
              ) : null}
              {open.id !== "weekly-parasha" && !isDeckId(open.id) ? (
                <>
                  <label>כותרת על המסך
                    <input value={heading} onChange={(event) => setHeading(event.target.value)} />
                  </label>
                  <label>מלל על המסך
                    <textarea rows={5} value={body} onChange={(event) => setBody(event.target.value)} />
                  </label>
                  <p>אפשר לנסח מחדש את המלל. מה שכתוב כאן הוא מה שיופיע במסך.</p>
                </>
              ) : null}
              {open.day || open.from || open.to ? <p>אפשר גם לעדכן את היום, השעה או השם לפני ההוספה.</p> : null}
              {open.day === "weekday" ? (
                <label>יום
                  <select value={meta.day || ""} onChange={(event) => setMeta({ ...meta, day: event.target.value })}>
                    {WEEKDAYS.map((day) => <option key={day}>{day}</option>)}
                  </select>
                </label>
              ) : null}
              {open.day === "text" ? (
                <label>{open.prompt || "יום או תאריך"}
                  <input value={meta.day || ""} onChange={(event) => setMeta({ ...meta, day: event.target.value })} />
                </label>
              ) : null}
              {open.from ? <label>משעה<input type="time" value={meta.from || ""} onChange={(event) => setMeta({ ...meta, from: event.target.value })} /></label> : null}
              {open.to ? <label>עד שעה<input type="time" value={meta.to || ""} onChange={(event) => setMeta({ ...meta, to: event.target.value })} /></label> : null}
              <button type="button" disabled={busy} onClick={() => void saveTemplate()}>{busy ? "שומר..." : "הוספה למסך"}</button>
              <button type="button" className="light" onClick={() => setOpen(null)}>סגירה</button>
              {error ? <p className="error">{error}</p> : null}
            </div>
          </div>
        </div>
      ) : null}
      {pest ? (
        <div className="slide-modal" role="dialog" aria-modal="true" onClick={() => setPest(false)}>
          <div className="slide-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="pest-preview">
              <PestVideo src="/safety/pest.mp4?v=13" poster="/safety/pest.jpg?v=13" title={pestTitle} detail={pestLine} day={pestDay} from={pestFrom} />
            </div>
            <div className="slide-modal-actions">
              <label>כותרת על הסרטון<input value={pestTitle} onChange={(event) => setPestTitle(event.target.value)} /></label>
              <label>משפט קצר<textarea rows={2} value={pestLine} onChange={(event) => setPestLine(event.target.value)} /></label>
              <label>יום
                <select value={pestDay} onChange={(event) => setPestDay(event.target.value)}>
                  {WEEKDAYS.map((day) => <option key={day}>{day}</option>)}
                </select>
              </label>
              <label>שעה<input type="time" value={pestFrom} onChange={(event) => setPestFrom(event.target.value)} /></label>
              <label>שניות<input type="number" min={5} max={180} value={pestSeconds} onChange={(event) => setPestSeconds(Number(event.target.value))} /></label>
              <p>הסרטון חוזר על עצמו לפי מספר השניות. היום והשעה מופיעים על הכרטיס.</p>
              <button type="button" disabled={busy} onClick={() => void addPest()}>{busy ? "שומר..." : "הוספה למסך"}</button>
              <button type="button" className="light" onClick={() => setPest(false)}>סגירה</button>
              {error ? <p className="error">{error}</p> : null}
            </div>
          </div>
        </div>
      ) : null}
      {qrOpen ? (
        <div className="slide-modal" role="dialog" aria-modal="true" onClick={() => setQrOpen(false)}>
          <div className="slide-modal-card" onClick={(event) => event.stopPropagation()}>
            {qrToken ? <div className="qr-preview"><QrSlide title={qrTitle} note={qrNote} token={qrToken} /></div> : <img className="mini-preview" src="/ready-slides/file-qr.svg" alt="" />}
            <div className="slide-modal-actions">
              <h3>ברקוד לקובץ</h3>
              <p>מעלים תמונה, PDF או טקסט. על המסך יופיע ברקוד. הדיירים סורקים ורואים את הקובץ, בלי אפשרות הורדה. סרטונים וקבצים להעברה לא מתקבלים.</p>
              <label>כותרת על המסך<input value={qrTitle} onChange={(event) => setQrTitle(event.target.value)} /></label>
              <label>משפט לדיירים<textarea rows={3} value={qrNote} onChange={(event) => setQrNote(event.target.value)} /></label>
              <label>שניות על המסך<input type="number" min={8} max={180} value={qrSeconds} onChange={(event) => setQrSeconds(Number(event.target.value))} /></label>
              <label className="replace-file">קובץ לצפייה
                <input type="file" accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,.jpg,.jpeg,.png,.gif,.webp,.pdf,.txt" onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  setBusy(true);
                  setError("");
                  void uploadViewFile(file).then((saved) => {
                    setQrToken(saved.token);
                    setQrName(saved.name);
                  }).catch((reason) => setError(reason instanceof Error ? reason.message : "ההעלאה נכשלה")).finally(() => setBusy(false));
                }} />
              </label>
              {qrName ? <p>הקובץ מוכן: {qrName}</p> : null}
              <button type="button" disabled={busy || !qrToken} onClick={() => void saveQr()}>{busy ? "שומר..." : "הוספה למסך"}</button>
              <button type="button" className="light" onClick={() => setQrOpen(false)}>סגירה</button>
              {error ? <p className="error">{error}</p> : null}
            </div>
          </div>
        </div>
      ) : null}
      {mode === "image" ? (
        <div className="slide-modal" role="dialog" aria-modal="true" onClick={() => setMode("")}>
          <div className="slide-modal-card" onClick={(event) => event.stopPropagation()}>
            <h3>שקף תמונה חדש</h3>
            <p>מעלים תמונה, GIF או PDF.</p>
            <label>קובץ
              <input type="file" accept="image/*,.gif,.pdf,application/pdf" onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                void onAdd({ kind: "image", file, duration: 8 }).then(() => setMode("")).catch((reason) => setError(reason instanceof Error ? reason.message : "השמירה נכשלה"));
              }} />
            </label>
            {error ? <p className="error">{error}</p> : null}
            <button type="button" className="light" onClick={() => setMode("")}>סגירה</button>
          </div>
        </div>
      ) : null}
      {mode === "youtube" ? <SlideAgent onAdd={onAdd} onClose={() => setMode("")} /> : null}
    </div>
  );
}

export function SavedSlideEditor({
  slide,
  city = "",
  onChange,
  onRemove,
  onClose,
}: {
  slide: { id: number; imageUrl: string; duration: number; kind?: string; templateId?: string; title?: string; detail?: string; meta?: string; weekdays?: string; startsOn?: string; endsOn?: string };
  city?: string;
  onChange: (payload: { duration?: number; imageUrl?: string; title?: string; detail?: string; meta?: string; weekdays?: string; startsOn?: string; endsOn?: string }) => void | Promise<void>;
  onRemove: () => void;
  onClose: () => void;
}) {
  const pest = slide.templateId === "fixed-pest";
  const qr = slide.templateId === "file-qr";
  const fixed = Boolean(slide.templateId?.startsWith("fixed-"));
  const template = READY_SLIDES.find((item) => item.id === slide.templateId);
  const initialMeta = readMeta(slide.meta || "", pest ? { day: "שלישי", from: "09:00" } : template?.defaults || {});
  const [meta, setMeta] = useState<SlideMeta>(initialMeta);
  const [url, setUrl] = useState(slide.imageUrl);
  const [days, setDays] = useState(slide.weekdays ?? "01234");
  const [startsOn, setStartsOn] = useState(slide.startsOn || todayInIsrael());
  const [endsOn, setEndsOn] = useState(slide.endsOn || "");
  const [picture, setPicture] = useState(slide.imageUrl);
  const [fallback, setFallback] = useState(slide.detail || "");
  const [heading, setHeading] = useState(sourceText(slide.title || "", template?.title, initialMeta));
  const [body, setBody] = useState(sourceText(slide.detail || "", template?.line, initialMeta));
  const [token, setToken] = useState(() => {
    try { return String(JSON.parse(slide.meta || "{}").token || ""); } catch { return ""; }
  });
  const [fileName, setFileName] = useState(() => {
    try { return String(JSON.parse(slide.meta || "{}").name || ""); } catch { return ""; }
  });
  const [note, setNote] = useState("");
  const [full, setFull] = useState(() => {
    try { return JSON.parse(slide.meta || "{}").full === true; } catch { return false; }
  });
  const official = FIXED_VIDEOS.find((item) => item.id === slide.templateId);
  const locked = Boolean(official) && !clientSetsDuration(slide.templateId);
  const [seconds, setSeconds] = useState(slide.templateId === "weekly-parasha" ? Math.max(180, slide.duration) : locked ? (official?.duration || slide.duration) : slide.duration);
  const kind = slide.kind || "image";
  const editable = showsCopy(kind, slide.templateId) && !slide.imageUrl.toLowerCase().includes(".pdf");
  async function saveAll() {
    let base: Record<string, unknown> = {};
    try { base = JSON.parse(slide.meta || "{}"); } catch { base = {}; }
    if (kind === "template" || pest) Object.assign(base, meta);
    if (qr) {
      base.token = token;
      base.name = fileName;
    }
    if (slide.templateId === "weekly-parasha" && !base.flow) base.flow = "scroll";
    base.full = full;
    await onChange({
      weekdays: days,
      startsOn: startsOn || todayInIsrael(),
      endsOn,
      meta: JSON.stringify(base),
      ...(!locked ? { duration: slide.templateId === "weekly-parasha" ? Math.max(180, seconds) : Math.max(qr ? 8 : pest ? 5 : 3, seconds) } : {}),
      ...((editable || pest) ? { title: fillLine(heading, meta), detail: fillLine(body, meta) } : {}),
      ...(qr ? { title: heading, detail: body } : {}),
      ...(kind === "youtube" && !fixed ? { imageUrl: url, detail: fallback } : {}),
      ...(kind === "image" && picture !== slide.imageUrl ? { imageUrl: picture } : {}),
    });
    onClose();
  }
  function toggleDay(index: number) {
    const mark = String(index);
    setDays(days.includes(mark) ? days.replace(mark, "") : `${days}${mark}`);
  }
  return (
    <div className="slide-modal" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="slide-modal-card" onClick={(event) => event.stopPropagation()}>
        {slide.templateId === "weekly-parasha" ? <LiveParasha city={city} still={meta.flow === "static"} /> : isDeckId(slide.templateId) ? <DeckPreview id={slide.templateId} /> : pest ? (
          <div className="pest-preview">
            <PestVideo src="/safety/pest.mp4?v=13" poster="/safety/pest.jpg?v=13" title={heading} detail={body} day={meta.day} from={meta.from} />
          </div>
        ) : qr ? (
          <div className="qr-preview"><QrSlide title={heading} note={body} token={token} /></div>
        ) : editable ? (
          <div className="photo-slide">
            <img src={picture} alt="" />
            <div>
              <strong>{fillLine(heading, meta) || "כותרת"}</strong>
              <span>{fillLine(body, meta)}</span>
            </div>
          </div>
        ) : <SlidePeek url={official?.url || picture} title={official?.title || slide.title} />}
        <div className="slide-modal-actions">
          {slide.templateId === "weekly-parasha" ? <FlowPick flow={meta.flow} onPick={(flow) => setMeta({ ...meta, flow })} /> : null}
          {editable ? (
            <>
              <label>כותרת על המסך
                <input value={heading} onChange={(event) => setHeading(event.target.value)} />
              </label>
              <label>מלל על המסך
                <textarea rows={6} value={body} onChange={(event) => setBody(event.target.value)} />
              </label>
              <p>אפשר לשנות את המלל בכל שקף. מה שכתוב כאן הוא מה שיופיע במסך.</p>
            </>
          ) : null}
          {pest ? (
            <>
              <label>כותרת על הסרטון<input value={heading} onChange={(event) => setHeading(event.target.value)} /></label>
              <label>משפט קצר<textarea rows={2} value={body} onChange={(event) => setBody(event.target.value)} /></label>
              <label>יום<select value={meta.day || ""} onChange={(event) => setMeta({ ...meta, day: event.target.value })}>{WEEKDAYS.map((day) => <option key={day}>{day}</option>)}</select></label>
              <label>שעה<input type="time" value={meta.from || ""} onChange={(event) => setMeta({ ...meta, from: event.target.value })} /></label>
              <p>הסרטון קבוע. אפשר לשנות את היום, השעה, המשפט ומספר השניות.</p>
            </>
          ) : null}
          {qr ? (
            <>
              <label>כותרת על המסך<input value={heading} onChange={(event) => setHeading(event.target.value)} /></label>
              <label>משפט לדיירים<textarea rows={3} value={body} onChange={(event) => setBody(event.target.value)} /></label>
              <p>הדיירים סורקים ורואים את הקובץ. אין הורדה, כדי שהאתר לא ישמש להעברת קבצים.</p>
              <label className="replace-file">החלפת הקובץ
                <input type="file" accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,.jpg,.jpeg,.png,.gif,.webp,.pdf,.txt" onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  setNote("");
                  const form = new FormData();
                  form.set("file", file);
                  form.set("title", heading);
                  void fetch("/api/files", { method: "POST", body: form }).then(async (response) => {
                    const data = (await response.json()) as { token?: string; name?: string; error?: string };
                    if (!response.ok || !data.token) {
                      setNote(data.error || "ההעלאה נכשלה");
                      return;
                    }
                    setToken(data.token);
                    setFileName(data.name || file.name);
                  }).catch(() => setNote("ההעלאה נכשלה"));
                }} />
              </label>
              {fileName ? <p>הקובץ: {fileName}</p> : null}
              {note ? <p className="error">{note}</p> : null}
            </>
          ) : null}
          <fieldset className="day-picks">
            <legend>גודל התצוגה</legend>
            <div>
              <button type="button" className={full ? "light" : "is-on"} onClick={() => setFull(false)}>רגיל</button>
              <button type="button" className={full ? "is-on" : "light"} onClick={() => setFull(true)}>כל המסך</button>
            </div>
          </fieldset>
          {kind === "template" && template?.day === "weekday" ? (
            <label>יום<select value={meta.day || ""} onChange={(event) => setMeta({ ...meta, day: event.target.value })}>{WEEKDAYS.map((day) => <option key={day}>{day}</option>)}</select></label>
          ) : null}
          {kind === "template" && template?.day === "text" ? (
            <label>{template?.prompt || "יום או תאריך"}<input value={meta.day || ""} onChange={(event) => setMeta({ ...meta, day: event.target.value })} /></label>
          ) : null}
          {kind === "template" && template?.from ? <label>משעה<input type="time" value={meta.from || ""} onChange={(event) => setMeta({ ...meta, from: event.target.value })} /></label> : null}
          {kind === "template" && template?.to ? <label>עד שעה<input type="time" value={meta.to || ""} onChange={(event) => setMeta({ ...meta, to: event.target.value })} /></label> : null}
          {kind === "youtube" && !fixed ? (
            <>
              <label>קישור<input value={url} onChange={(event) => setUrl(event.target.value)} /></label>
              <p>אם מופיע Video unavailable, מעלים כאן את קובץ הווידאו. המסך ינגן אותו במקום יוטיוב.</p>
              <label className="replace-file">קובץ וידאו MP4
                <input type="file" accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov" onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  void import("@vercel/blob/client").then(async ({ upload }) => {
                    const blob = await upload(file.name, file, { access: "public", handleUploadUrl: "/api/upload/client" });
                    setFallback(blob.url);
                  });
                }} />
              </label>
              {fallback ? <p>הקובץ החלופי יישמר עם שמירה</p> : null}
            </>
          ) : null}
          {kind === "image" ? (
            <label className="replace-file">החלפת התמונה
              <input type="file" accept="image/*,.gif,.pdf,application/pdf" onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const body = new FormData();
                body.set("file", file);
                body.set("kind", "slide");
                void fetch("/api/upload", { method: "POST", body }).then(async (response) => {
                  const data = (await response.json()) as { url?: string };
                  if (data.url) setPicture(data.url);
                });
              }} />
            </label>
          ) : null}
          {kind === "youtube" && fixed && !pest ? <p>סרטון קבוע. אפשר למחוק אותו מהמסך, אבל אי אפשר להחליף את הקישור.</p> : null}
          <label>שניות<input type="number" min={qr ? 8 : pest ? 5 : 3} value={seconds} readOnly={locked} onChange={(event) => setSeconds(Number(event.target.value))} /></label>
          {locked ? <p>האורך נקבע לפי הסרטון: {official?.duration} שניות.</p> : null}
          {pest ? <p>הסרטון חוזר על עצמו לפי מספר השניות.</p> : null}
          <fieldset className="day-picks">
            <legend>ימים בשבוע</legend>
            <div>
              {WEEKDAYS.map((name, index) => (
                <button type="button" key={name} className={days.includes(String(index)) ? "is-on" : "light"} onClick={() => toggleDay(index)}>{name}</button>
              ))}
            </div>
          </fieldset>
          <div className="row">
            <label>מתאריך<input type="date" value={startsOn} onChange={(event) => setStartsOn(event.target.value)} /></label>
            <label>עד תאריך<input type="date" value={endsOn} onChange={(event) => setEndsOn(event.target.value)} /></label>
          </div>
          <p>אם לא בוחרים תאריך סיום, השקף נשאר לעד.</p>
          <button type="button" onClick={() => void saveAll()}>שמירה</button>
          <button className="light" type="button" onClick={onRemove}>מחיקה</button>
          <button className="light" type="button" onClick={onClose}>סגירה</button>
        </div>
      </div>
    </div>
  );
}
