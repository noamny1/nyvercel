"use client";

import { useState } from "react";
import { SlideAgent } from "@/components/admin/SlideAgent";
import { fillLine, FIXED_VIDEOS, READY_CATEGORIES, READY_SLIDES, readMeta, WEEKDAYS, type ReadySlide, type SlideMeta } from "@/lib/ready-slides";

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

function Photo({ slide, meta }: { slide: ReadySlide; meta: SlideMeta }) {
  return (
    <div className="photo-slide">
      <img src={slide.image} alt="" />
      <div>
        <small>{slide.category}</small>
        <strong>{slide.title}</strong>
        <span>{fillLine(slide.line, meta)}</span>
      </div>
    </div>
  );
}

export function ReadyLibrary({ onAdd }: { onAdd: (draft: SlideDraft) => Promise<void> }) {
  const [category, setCategory] = useState<string>(READY_CATEGORIES[0]);
  const [open, setOpen] = useState<ReadySlide | null>(null);
  const [meta, setMeta] = useState<SlideMeta>({});
  const [mode, setMode] = useState<"" | "image" | "youtube">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const slides = READY_SLIDES.filter((slide) => slide.category === category);

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
        meta: JSON.stringify(meta),
        duration: 10,
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
        <button type="button" onClick={() => { setOpen(null); setMode("image"); setError(""); }}>שקף תמונה</button>
        <button type="button" onClick={() => { setOpen(null); setMode("youtube"); setError(""); }}>סרטון יוטיוב</button>
      </div>
      <p className="ready-note">סרטונים שלנו, בלי קול. לוחצים על כרטיס כדי להוסיף אותו למסך.</p>
      <div className="ready-grid">
        {FIXED_VIDEOS.map((video) => (
          <button key={video.id} type="button" className="ready-card" disabled={busy} onClick={() => void addFixed(video)}>
            <div className="photo-slide">
              <img src={video.poster} alt="" />
              <div>
                <small>סרטון קבוע</small>
                <strong>{video.title}</strong>
                <span>{video.line}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
      {error && !open && mode === "" ? <p className="error">{error}</p> : null}
      <div className="ready-cats">
        {READY_CATEGORIES.map((name) => (
          <button key={name} type="button" className={name === category ? "is-on" : ""} onClick={() => setCategory(name)}>
            {name}
            <small>{READY_SLIDES.filter((slide) => slide.category === name).length}</small>
          </button>
        ))}
      </div>
      <div className="ready-grid">
        {slides.map((slide) => (
          <button key={slide.id} type="button" className="ready-card" onClick={() => choose(slide)}>
            <Photo slide={slide} meta={slide.defaults} />
          </button>
        ))}
      </div>
      {open ? (
        <div className="slide-modal" role="dialog" aria-modal="true" onClick={() => setOpen(null)}>
          <div className="slide-modal-card" onClick={(event) => event.stopPropagation()}>
            <Photo slide={open} meta={meta} />
            <div className="slide-modal-actions">
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
            <h3>שקף תמונה</h3>
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
  onChange,
  onRemove,
  onClose,
}: {
  slide: { id: number; imageUrl: string; duration: number; kind?: string; templateId?: string; title?: string; detail?: string; meta?: string };
  onChange: (payload: { duration?: number; imageUrl?: string; title?: string; detail?: string; meta?: string }) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const fixed = Boolean(slide.templateId?.startsWith("fixed-"));
  const template = READY_SLIDES.find((item) => item.id === slide.templateId);
  const [meta, setMeta] = useState<SlideMeta>(readMeta(slide.meta || "", template?.defaults || {}));
  const [url, setUrl] = useState(slide.imageUrl);
  const kind = slide.kind || "image";
  return (
    <div className="slide-modal" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="slide-modal-card" onClick={(event) => event.stopPropagation()}>
        {kind === "template" && template ? <Photo slide={template} meta={meta} /> : kind === "youtube" ? <p className="yt-preview">{slide.title || "סרטון יוטיוב"}</p> : slide.imageUrl.toLowerCase().includes(".pdf") ? <span className="pdf-mark large">PDF</span> : <img className="slide-modal-image" src={slide.imageUrl} alt="" />}
        <div className="slide-modal-actions">
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
                    onChange({ detail: blob.url });
                  });
                }} />
              </label>
              {slide.detail ? <p>קובץ חלופי שמור</p> : null}
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
                  if (data.url) onChange({ imageUrl: data.url });
                });
              }} />
            </label>
          ) : null}
          {kind === "youtube" && fixed ? <p>סרטון קבוע. אפשר למחוק אותו מהמסך, אבל אי אפשר להחליף את הקישור.</p> : null}
          <label>שניות<input type="number" min={3} defaultValue={slide.duration} onBlur={(event) => onChange({ duration: Number(event.target.value) })} /></label>
          {kind === "template" && template ? <button type="button" onClick={() => onChange({ title: template.title, detail: fillLine(template.line, meta), meta: JSON.stringify(meta) })}>שמירת היום והשעות</button> : null}
          {kind === "youtube" && !fixed ? <button type="button" onClick={() => onChange({ imageUrl: url })}>שמירת הקישור</button> : null}
          <button className="light" type="button" onClick={onRemove}>מחיקה</button>
          <button className="light" type="button" onClick={onClose}>סגירה</button>
        </div>
      </div>
    </div>
  );
}
