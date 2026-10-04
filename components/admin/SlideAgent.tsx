"use client";

import { useState } from "react";

type Draft = { kind: "youtube"; imageUrl: string; title: string; duration: number };
type Line = { from: "agent" | "user"; text: string };

export function SlideAgent({ onAdd, onClose }: { onAdd: (draft: Draft) => Promise<void>; onClose: () => void }) {
  const [lines, setLines] = useState<Line[]>([{ from: "agent", text: "מה הקישור לסרטון?" }]);
  const [text, setText] = useState("");
  const [video, setVideo] = useState<{ url: string; title: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function ask(url: string) {
    setBusy(true);
    setError("");
    setVideo(null);
    setLines((items) => [...items, { from: "user", text: url }]);
    try {
      const response = await fetch("/api/agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
      const data = (await response.json()) as { ok?: boolean; title?: string; reason?: string };
      if (!data.ok) {
        setLines((items) => [...items, { from: "agent", text: `${data.reason || "הסרטון לא תקין"} אפשר לשלוח קישור אחר.` }]);
        return;
      }
      setVideo({ url, title: data.title || "סרטון" });
      setLines((items) => [...items, { from: "agent", text: `הקישור תקין. נמצא «${data.title}» ואפשר לנגן אותו במסך. להעלות?` }]);
    } catch {
      setLines((items) => [...items, { from: "agent", text: "הבדיקה נכשלה. אפשר לנסות קישור אחר." }]);
    } finally {
      setBusy(false);
      setText("");
    }
  }

  async function approve() {
    if (!video) return;
    setBusy(true);
    setError("");
    try {
      await onAdd({ kind: "youtube", imageUrl: video.url, title: video.title, duration: 30 });
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "השמירה נכשלה");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="slide-modal" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="slide-modal-card agent-card" onClick={(event) => event.stopPropagation()}>
        <h3>בדיקת סרטון</h3>
        <div className="agent-lines">
          {lines.map((line, index) => <p key={index} className={line.from}>{line.text}</p>)}
        </div>
        {video ? (
          <div className="slide-modal-actions">
            <button type="button" disabled={busy} onClick={() => void approve()}>{busy ? "שומר..." : "אישור והעלאה"}</button>
            <button type="button" className="light" onClick={() => { setVideo(null); setLines((items) => [...items, { from: "agent", text: "מה הקישור האחר?" }]); }}>קישור אחר</button>
          </div>
        ) : (
          <form className="agent-ask" onSubmit={(event) => { event.preventDefault(); if (!text.trim() || busy) return; void ask(text.trim()); }}>
            <input value={text} onChange={(event) => setText(event.target.value)} placeholder="קישור יוטיוב" />
            <button type="submit" disabled={busy}>{busy ? "בודק..." : "בדיקה"}</button>
          </form>
        )}
        {error ? <p className="error">{error}</p> : null}
        <button type="button" className="light" onClick={onClose}>סגירה</button>
      </div>
    </div>
  );
}
