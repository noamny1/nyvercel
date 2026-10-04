"use client";

import { useState } from "react";
import { READY_CATEGORIES, READY_SLIDES, type ReadySlide } from "@/lib/ready-slides";

export function SlidePoster({ slide }: { slide: ReadySlide }) {
  return (
    <div className={`poster tone-${slide.tone}`} dir="rtl">
      <small>{slide.category}</small>
      <strong>{slide.title}</strong>
      <span>{slide.line}</span>
    </div>
  );
}

async function posterFile(slide: ReadySlide) {
  const canvas = document.createElement("canvas");
  canvas.width = 1920;
  canvas.height = 1080;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("הדפדפן לא יצר תמונה");
  const background = slide.tone === "charcoal" ? "#252525" : slide.tone === "cream" ? "#F4F1ED" : "#641E2C";
  const color = slide.tone === "cream" ? "#252525" : "#F4F1ED";
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, 1920, 1080);
  ctx.fillStyle = color;
  ctx.direction = "rtl";
  ctx.textAlign = "right";
  ctx.font = "400 48px Calibri, Arial, sans-serif";
  ctx.fillText(slide.category, 1760, 390);
  ctx.font = "700 110px Calibri, Arial, sans-serif";
  ctx.fillText(slide.title, 1760, 560);
  ctx.font = "400 46px Calibri, Arial, sans-serif";
  ctx.fillText(slide.line, 1760, 670);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("הדפדפן לא יצר תמונה");
  return new File([blob], `${slide.id}.png`, { type: "image/png" });
}

export function ReadyLibrary({ onUse }: { onUse: (file: File) => Promise<void> }) {
  const [category, setCategory] = useState<string>(READY_CATEGORIES[0]);
  const [open, setOpen] = useState<ReadySlide | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const slides = READY_SLIDES.filter((slide) => slide.category === category);

  async function add(slide: ReadySlide, replacement?: File | null) {
    setBusy(true);
    setError("");
    try {
      await onUse(replacement && replacement.size > 0 ? replacement : await posterFile(slide));
      setOpen(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "השמירה נכשלה");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ready-library">
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
          <button key={slide.id} type="button" className="ready-card" onClick={() => { setError(""); setOpen(slide); }}>
            <SlidePoster slide={slide} />
            <span>{slide.title}</span>
          </button>
        ))}
      </div>
      {open ? (
        <div className="slide-modal" role="dialog" aria-modal="true" onClick={() => setOpen(null)}>
          <div className="slide-modal-card" onClick={(event) => event.stopPropagation()}>
            <SlidePoster slide={open} />
            <div className="slide-modal-actions">
              <p>{open.category} · {open.title}</p>
              <Replace onPick={(file) => void add(open, file)} />
              <button type="button" disabled={busy} onClick={() => void add(open)}>{busy ? "שומר..." : "הוספה למסך"}</button>
              <button type="button" className="light" onClick={() => setOpen(null)}>סגירה</button>
              {error ? <p className="error">{error}</p> : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Replace({ onPick }: { onPick: (file: File) => void }) {
  return (
    <label className="replace-file">החלפה בתמונה או PDF
      <input type="file" accept="image/*,.gif,.pdf,application/pdf" onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) onPick(file);
      }} />
    </label>
  );
}
