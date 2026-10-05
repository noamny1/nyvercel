"use client";

import { useEffect, useState } from "react";
import { SlideAgent } from "@/components/admin/SlideAgent";
import { ParashaSlide } from "@/components/player/ParashaSlide";
import { fillLine, FIXED_VIDEOS, READY_SLIDES, WEEKDAYS, readMeta, type ReadySlide, type SlideMeta } from "@/lib/ready-slides";
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
function Photo({ slide, meta }: { slide: ReadySlide; meta: SlideMeta }) {
  return (
    <div className="photo-slide">
      <img src={slide.image} alt="" />
      <KindMark />
      <div>
        <small>{slide.category}</small>
        <strong>{slide.title}</strong>
        <span>{fillLine(slide.line, meta)}</span>
      </div>
    </div>
  );
}

function LiveParasha({ city, still = false }: { city: string; still?: boolean }) {
  const [reading, setReading] = useState<{ parsha: string; candles: string; city: string; verses: string[] } | null>(null);
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
      <ParashaSlide name={reading?.parsha || ""} candles={reading?.candles || ""} city={reading?.city || city} verses={reading?.verses || []} seconds={180} still={still} />
    </div>
  );
}

export function ReadyLibrary({ onAdd, city = "" }: { onAdd: (draft: SlideDraft) => Promise<void>; city?: string }) {
  const [preview, setPreview] = useState<(typeof FIXED_VIDEOS)[number] | null>(null);
  const [open, setOpen] = useState<ReadySlide | null>(null);
  const [meta, setMeta] = useState<SlideMeta>({});
  const [mode, setMode] = useState<"" | "image" | "youtube">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function choose(slide: ReadySlide) {
    setError("");
    setMode("");
    setOpen(slide);
    setMeta(readMeta("", slide.defaults));
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
        title: open.title,
        detail: fillLine(open.line, meta),
        meta: JSON.stringify(open.id === "weekly-parasha" ? { ...meta, flow: meta.flow || "scroll" } : meta),
        duration: open.id === "weekly-parasha" ? 180 : 10,
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

  return (
    <div className="ready-library">
      <div className="special-slides">
        <button type="button" onClick={() => { setOpen(null); setMode("image"); setError(""); }}>שקף תמונה חדש</button>
        <button type="button" onClick={() => { setOpen(null); setMode("youtube"); setError(""); }}>סרטון יוטיוב חדש</button>
      </div>
      <div className="ready-grid">
        {FIXED_VIDEOS.map((video) => (
            <button key={video.id} type="button" className="ready-card" disabled={busy} onClick={() => { setOpen(null); setPreview(video); }}>
              <div className="photo-slide">
                <img src={video.poster} alt="" />
                <KindMark video />
                <div>
                  <small>סרטון</small>
                  <strong>{video.title}</strong>
                  <span>{video.duration} שנ׳</span>
                </div>
              </div>
            </button>
          ))}
      </div>
      <div className="ready-grid">
        {READY_SLIDES.map((slide) => (
          <button key={slide.id} type="button" className="ready-card" onClick={() => choose(slide)}>
            <Photo slide={slide} meta={slide.defaults} />
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
            {open.id === "weekly-parasha" ? <LiveParasha city={city} still={meta.flow === "static"} /> : <Photo slide={open} meta={meta} />}
            <div className="slide-modal-actions">
              {open.id === "weekly-parasha" ? (
                <FlowPick flow={meta.flow} onPick={(flow) => setMeta({ ...meta, flow })} />
              ) : null}
              {open.day || open.from || open.to ? <p>אפשר לעדכן את היום ואת השעות לפני ההוספה.</p> : null}
              {open.day === "weekday" ? (
                <label>יום
                  <select value={meta.day || ""} onChange={(event) => setMeta({ ...meta, day: event.target.value })}>
                    {WEEKDAYS.map((day) => <option key={day}>{day}</option>)}
                  </select>
                </label>
              ) : null}
              {open.day === "text" ? (
                <label>יום או תאריך
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
  onChange: (payload: { duration?: number; imageUrl?: string; title?: string; detail?: string; meta?: string; weekdays?: string; startsOn?: string; endsOn?: string }) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const fixed = Boolean(slide.templateId?.startsWith("fixed-"));
  const template = READY_SLIDES.find((item) => item.id === slide.templateId);
  const [meta, setMeta] = useState<SlideMeta>(readMeta(slide.meta || "", template?.defaults || {}));
  const [url, setUrl] = useState(slide.imageUrl);
  const [days, setDays] = useState(slide.weekdays ?? "01234");
  const [startsOn, setStartsOn] = useState(slide.startsOn || todayInIsrael());
  const [endsOn, setEndsOn] = useState(slide.endsOn || "");
  const [picture, setPicture] = useState(slide.imageUrl);
  const [fallback, setFallback] = useState(slide.detail || "");
  const official = FIXED_VIDEOS.find((item) => item.id === slide.templateId);
  const [seconds, setSeconds] = useState(slide.templateId === "weekly-parasha" ? Math.max(180, slide.duration) : official?.duration || slide.duration);
  const kind = slide.kind || "image";
  function saveAll() {
    onChange({
      weekdays: days,
      startsOn: startsOn || todayInIsrael(),
      endsOn,
      ...(!official ? { duration: slide.templateId === "weekly-parasha" ? Math.max(180, seconds) : Math.max(3, seconds) } : {}),
      ...(kind === "template" && template ? {
        title: template.title,
        detail: fillLine(template.line, meta),
        meta: JSON.stringify(slide.templateId === "weekly-parasha" ? { ...meta, flow: meta.flow || "scroll" } : meta),
      } : {}),
      ...(kind === "youtube" && !fixed ? { imageUrl: url, detail: fallback } : {}),
      ...(kind === "image" && picture !== slide.imageUrl ? { imageUrl: picture } : {}),
    });
  }
  function toggleDay(index: number) {
    const mark = String(index);
    setDays(days.includes(mark) ? days.replace(mark, "") : `${days}${mark}`);
  }
  return (
    <div className="slide-modal" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="slide-modal-card" onClick={(event) => event.stopPropagation()}>
        {slide.templateId === "weekly-parasha" ? <LiveParasha city={city} still={meta.flow === "static"} /> : <SlidePeek url={official?.url || picture} title={official?.title || slide.title} />}
        <div className="slide-modal-actions">
          {slide.templateId === "weekly-parasha" ? <FlowPick flow={meta.flow} onPick={(flow) => setMeta({ ...meta, flow })} /> : null}
          {kind === "template" && template?.day === "weekday" ? (
            <label>יום<select value={meta.day || ""} onChange={(event) => setMeta({ ...meta, day: event.target.value })}>{WEEKDAYS.map((day) => <option key={day}>{day}</option>)}</select></label>
          ) : null}
          {kind === "template" && template?.day === "text" ? (
            <label>יום או תאריך<input value={meta.day || ""} onChange={(event) => setMeta({ ...meta, day: event.target.value })} /></label>
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
          {kind === "youtube" && fixed ? <p>סרטון קבוע. אפשר למחוק אותו מהמסך, אבל אי אפשר להחליף את הקישור.</p> : null}
          <label>שניות<input type="number" min={3} value={seconds} readOnly={Boolean(official)} onChange={(event) => setSeconds(Number(event.target.value))} /></label>
          {official ? <p>האורך נקבע לפי הסרטון: {official.duration} שניות.</p> : null}
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
          <button type="button" onClick={saveAll}>שמירה</button>
          <button className="light" type="button" onClick={onRemove}>מחיקה</button>
          <button className="light" type="button" onClick={onClose}>סגירה</button>
        </div>
      </div>
    </div>
  );
}
