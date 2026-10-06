"use client";

import { useEffect, useRef, useState } from "react";

import { ParashaSlide } from "@/components/player/ParashaSlide";
import { KnowledgeSlide } from "@/components/player/KnowledgeSlide";
import { isDeckId } from "@/lib/decks";

export type PlaySlide = {
  imageUrl: string;
  duration: number;
  kind?: string;
  title?: string;
  detail?: string;
  templateId?: string;
  candles?: string;
  havdalah?: string;
  city?: string;
  verses?: string[];
  still?: boolean;
  full?: boolean;
};

function youtubeId(url: string) {
  try {
    const parsed = new URL(url.trim());
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return parsed.pathname.split("/").filter(Boolean)[0] || "";
    const watch = parsed.searchParams.get("v");
    if (watch) return watch;
    const parts = parsed.pathname.split("/").filter(Boolean);
    const marker = parts.findIndex((part) => part === "embed" || part === "shorts" || part === "live" || part === "v");
    if (marker >= 0) return parts[marker + 1] || "";
  } catch {
    return "";
  }
  return "";
}

function isVideoFile(url: string) {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url);
}

function YoutubeSlide({ url, fallback }: { url: string; fallback?: string }) {
  const id = youtubeId(url);
  const frame = useRef<HTMLIFrameElement>(null);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (!String(event.origin).includes("youtube.com")) return;
      const raw = typeof event.data === "string" ? event.data : JSON.stringify(event.data ?? "");
      if (raw.includes("\"onError\"") && (raw.includes("101") || raw.includes("150") || raw.includes("100"))) setBlocked(true);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  if (!id) return <div className="empty">קישור יוטיוב לא תקין</div>;
  if (blocked && fallback && isVideoFile(fallback)) {
    return <video className="slide-video" src={fallback} autoPlay muted loop playsInline />;
  }
  if (blocked) {
    return (
      <div className="slide-frame">
        <img className="slide-image" src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" />
        <div className="slide-copy">
          <strong>יוטיוב חסם את הסרטון</strong>
          <span>בעל הסרטון אסר ניגון באתרים אחרים. בשקף מעלים קובץ וידאו, והמסך ינגן אותו.</span>
        </div>
      </div>
    );
  }
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return (
    <iframe
      ref={frame}
      className="slide-image"
      src={`https://www.youtube.com/embed/${id}?autoplay=1&mute=1&playsinline=1&rel=0&controls=0&modestbranding=1&iv_load_policy=3&cc_load_policy=0&enablejsapi=1&origin=${encodeURIComponent(origin)}`}
      title="סרטון"
      allow="autoplay; encrypted-media; picture-in-picture"
      referrerPolicy="origin"
      onLoad={() => frame.current?.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), "*")}
    />
  );
}

export function Player({ slides }: { slides: PlaySlide[] }) {
  const [index, setIndex] = useState(0);
  const current = slides[index];

  useEffect(() => {
    const stage = document.querySelector(".stage");
    stage?.classList.toggle("slide-full", Boolean(current?.full));
    return () => stage?.classList.remove("slide-full");
  }, [current?.full]);

  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(() => setIndex((value) => (value + 1) % slides.length), Math.max(3, current.duration) * 1000);
    return () => clearTimeout(timer);
  }, [current, slides.length]);

  if (!current) return <div className="empty">אין שקפים</div>;
  if (current.kind === "youtube") {
    const file = isVideoFile(current.imageUrl) ? current.imageUrl : isVideoFile(current.detail || "") ? current.detail : "";
    if (file) return <video className="slide-video" src={file} autoPlay muted loop playsInline />;
    return <YoutubeSlide url={current.imageUrl} fallback={current.detail} />;
  }
  const pdf = current.imageUrl.toLowerCase().includes(".pdf");
  if (pdf) return <iframe className="slide-image" src={`${current.imageUrl}#toolbar=0&navpanes=0`} title="שקף" />;
  if (current.templateId === "weekly-parasha") {
    return <ParashaSlide name={current.title || ""} candles={current.candles || ""} havdalah={current.havdalah || ""} city={current.city || ""} verses={current.verses || []} seconds={current.duration} still={current.still} />;
  }
  if (isDeckId(current.templateId)) {
    return <KnowledgeSlide deck={current.templateId} />;
  }
  if (current.kind === "template" || (current.kind === "image" && (current.title || current.detail))) {
    return (
      <div className="slide-frame">
        <img className="slide-image" src={current.imageUrl} alt="" />
        <div className="slide-copy">
          <strong>{current.title}</strong>
          {current.detail ? <span>{current.detail}</span> : null}
        </div>
      </div>
    );
  }
  return <img className="slide-image" src={current.imageUrl} alt="" />;
}
