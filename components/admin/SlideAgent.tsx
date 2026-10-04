"use client";

import { useState } from "react";

type Draft = { kind: "image" | "youtube"; imageUrl?: string; file?: File; title?: string; duration?: number };
type Line = { from: "agent" | "user"; text: string };

export function SlideAgent({ mode, onAdd, onClose }: { mode: "image" | "youtube"; onAdd: (draft: Draft) => Promise<void>; onClose: () => void }) {
  const [lines, setLines] = useState<Line[]>([{ from: "agent", text: mode === "image" ? "באיזה נושא התמונה?" : "מה הקישור לסרטון?" }]);
  const [text, setText] = useState("");
  const [image, setImage] = useState("");
  const [video, setVideo] = useState<{ url: string; title: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function askImage(topic: string) {
    setBusy(true);
    setError("");
    setLines((items) => [...items, { from: "user", text: topic }]);
    try {
      const response = await fetch("/api/agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "image", topic }) });
      const data = (await response.json()) as { imageUrl?: string; error?: string };
      if (!response.ok || !data.imageUrl) throw new Error(data.error || "לא הצלחתי להכין תמונה");
      setImage(data.imageUrl);
      setVideo(null);
      setLines((items) => [...items, { from: "agent", text: "התמונה מוכנה. להעלות אותה לשקף?" }]);
    } catch (reason) {
      setLines((items) => [...items, { from: "agent", text: reason instanceof Error ? reason.message : "לא הצלחתי להכין תמונה" }]);
    } finally {
      setBusy(false);
      setText("");
    }
  }

  async function askVideo(url: string) {
    setBusy(true);
    setError("");
    setLines((items) => [...items, { from: "user", text: url }]);
    try {
      const response = await fetch("/api/agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "youtube", url }) });
      const data = (await response.json()) as { ok?: boolean; title?: string; reason?: string };
      if (!data.ok) {
        setVideo(null);
        setLines((items) => [...items, { from: "agent", text: `${data.reason || "הסרטון לא ניתן לניגון"} אפשר לשלוח קישור אחר.` }]);
        return;
      }
      setImage("");
      setVideo({ url, title: data.title || "סרטון" });
      setLines((items) => [...items, { from: "agent", text: `נמצא «${data.title}». אפשר לנגן אותו במסך. להעלות?` }]);
    } catch {
      setLines((items) => [...items, { from: "agent", text: "הבדיקה נכשלה. אפשר לנסות קישור אחר." }]);
    } finally {
      setBusy(false);
      setText("");
    }
  }

  async function approve() {
    setBusy(true);
    setError("");
    try {
      if (image) await onAdd({ kind: "image", imageUrl: image, duration: 8, title: "תמונה" });
      else if (video) await onAdd({ kind: "youtube", imageUrl: video.url, title: video.title, duration: 30 });
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "השמירה נכשלה");
    } finally {
      setBusy(false);
    }
  }

  const ready = Boolean(image || video);
  return (
    <div className="slide-modal" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="slide-modal-card agent-card" onClick={(event) => event.stopPropagation()}>
        <h3>{mode === "image" ? "סוכן תמונה" : "סוכן יוטיוב"}</h3>
        <div className="agent-lines">
          {lines.map((line, index) => <p key={index} className={line.from}>{line.text}</p>)}
        </div>
        {image ? <img className="slide-modal-image" src={image} alt="" /> : null}
        {ready ? (
          <div className="slide-modal-actions">
            <button type="button" disabled={busy} onClick={() => void approve()}>{busy ? "שומר..." : "אישור והעלאה"}</button>
            <button type="button" className="light" onClick={() => { setImage(""); setVideo(null); setLines((items) => [...items, { from: "agent", text: mode === "image" ? "באיזה נושא אחר?" : "מה הקישור האחר?" }]); }}>לא, משהו אחר</button>
          </div>
        ) : (
          <form className="agent-ask" onSubmit={(event) => { event.preventDefault(); if (!text.trim() || busy) return; void (mode === "image" ? askImage(text.trim()) : askVideo(text.trim())); }}>
            <input value={text} onChange={(event) => setText(event.target.value)} placeholder={mode === "image" ? "לדוגמה: לובי בחג" : "קישור יוטיוב"} />
            <button type="submit" disabled={busy}>{busy ? "בודק..." : "שליחה"}</button>
          </form>
        )}
        {mode === "image" && !ready ? (
          <label className="replace-file">או קובץ משלכם
            <input type="file" accept="image/*,.gif,.pdf,application/pdf" onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void onAdd({ kind: "image", file, duration: 8 }).then(onClose);
            }} />
          </label>
        ) : null}
        {error ? <p className="error">{error}</p> : null}
        <button type="button" className="light" onClick={onClose}>סגירה</button>
      </div>
    </div>
  );
}
