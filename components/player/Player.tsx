"use client";

import { useEffect, useRef, useState } from "react";

import { ParashaSlide } from "@/components/player/ParashaSlide";
import { KnowledgeSlide } from "@/components/player/KnowledgeSlide";
import { CharacterVideo, PestVideo, QrSlide } from "@/components/player/SpecialSlides";
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
  day?: string;
  from?: string;
  token?: string;
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

const youtubeTimes = new Map<string, number>();

function rememberYoutube(id: string, time: number, ended = false) {
  if (ended) {
    youtubeTimes.set(id, 0);
    return;
  }
  if (!Number.isFinite(time) || time < 1) return;
  const saved = youtubeTimes.get(id) || 0;
  if (saved > 3 && time + 1.5 < saved && time < 3) return;
  youtubeTimes.set(id, time);
}

function youtubeClock(data: { event?: string; info?: unknown }) {
  const info = data.info;
  if (data.event === "onStateChange" && info === 0) return { ended: true };
  if (typeof info === "number" && data.event === "infoDelivery") return { time: info };
  if (!info || typeof info !== "object") return {};
  const box = info as { currentTime?: number; playerState?: number; duration?: number };
  if (box.playerState === 0) return { ended: true, time: box.currentTime };
  if (typeof box.currentTime === "number") {
    if (typeof box.duration === "number" && box.duration > 1 && box.currentTime >= box.duration - 1) return { ended: true };
    return { time: box.currentTime };
  }
  return {};
}

function YoutubeSlide({ url, fallback }: { url: string; fallback?: string }) {
  const id = youtubeId(url);
  const frame = useRef<HTMLIFrameElement>(null);
  const widget = useRef(`p${Math.random().toString(36).slice(2, 8)}`);
  const resume = useRef(id ? Math.floor(youtubeTimes.get(id) || 0) : 0);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (!id) return;
    function onMessage(event: MessageEvent) {
      if (!String(event.origin).includes("youtube.com")) return;
      const raw = typeof event.data === "string" ? event.data : JSON.stringify(event.data ?? "");
      if (raw.includes("\"onError\"") && (raw.includes("101") || raw.includes("150") || raw.includes("100"))) setBlocked(true);
      let data: { event?: string; info?: unknown; id?: string } | null = null;
      try { data = typeof event.data === "string" ? JSON.parse(event.data) : event.data; } catch { data = null; }
      if (!data || data.id !== widget.current) return;
      const clock = youtubeClock(data);
      if (clock.ended) rememberYoutube(id, 0, true);
      else if (typeof clock.time === "number") rememberYoutube(id, clock.time);
    }
    window.addEventListener("message", onMessage);
    const poll = window.setInterval(() => {
      frame.current?.contentWindow?.postMessage(JSON.stringify({
        event: "command",
        func: "getCurrentTime",
        args: [],
        id: widget.current,
        channel: "widget",
      }), "*");
    }, 1000);
    return () => {
      window.clearInterval(poll);
      window.removeEventListener("message", onMessage);
    };
  }, [id]);

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
  const start = resume.current >= 2 ? `&start=${resume.current}` : "";
  return (
    <iframe
      ref={frame}
      className="slide-image"
      src={`https://www.youtube.com/embed/${id}?autoplay=1&mute=1&playsinline=1&rel=0&controls=0&modestbranding=1&iv_load_policy=3&cc_load_policy=0&enablejsapi=1&origin=${encodeURIComponent(origin)}${start}`}
      title="סרטון"
      allow="autoplay; encrypted-media; picture-in-picture"
      referrerPolicy="origin"
      onLoad={() => {
        const hello = { id: widget.current, channel: "widget" };
        const win = frame.current?.contentWindow;
        win?.postMessage(JSON.stringify({ event: "listening", ...hello }), "*");
        win?.postMessage(JSON.stringify({ event: "command", func: "addEventListener", args: ["onStateChange"], ...hello }), "*");
      }}
    />
  );
}

function SlideFace({ slide, onReady }: { slide: PlaySlide; onReady?: () => void }) {
  const soon = () => onReady?.();
  useEffect(() => {
    const media = slide.kind === "image" || slide.kind === "template" || isVideoFile(slide.imageUrl) || slide.kind === "youtube";
    if (media) return;
    const timer = setTimeout(soon, 80);
    return () => clearTimeout(timer);
  }, [slide]);

  if (slide.kind === "youtube") {
    const file = isVideoFile(slide.imageUrl) ? slide.imageUrl : isVideoFile(slide.detail || "") ? slide.detail : "";
    if (file && slide.templateId === "fixed-pest") {
      return <PestVideo src={file} poster={file.replace(/\.mp4(\?|$)/i, ".jpg$1")} title={slide.title} detail={slide.detail} day={slide.day} from={slide.from} onReady={onReady} />;
    }
    if (file && slide.templateId?.startsWith("fixed-")) {
      return <CharacterVideo src={file} poster={file.replace(/\.mp4(\?|$)/i, ".jpg$1")} title={slide.title} detail={slide.detail} onReady={onReady} />;
    }
    if (file) return <video className="slide-video" src={file} autoPlay muted loop playsInline preload="auto" onCanPlay={onReady} onError={onReady} />;
    return <YoutubeSlide url={slide.imageUrl} fallback={slide.detail} />;
  }
  const pdf = (slide.imageUrl || "").toLowerCase().includes(".pdf");
  if (slide.templateId === "file-qr") return <QrSlide title={slide.title} note={slide.detail} token={slide.token} />;
  if (pdf) return <iframe className="slide-image" src={`${slide.imageUrl}#toolbar=0&navpanes=0`} title="שקף" onLoad={onReady} />;
  if (slide.templateId === "weekly-parasha") {
    return <ParashaSlide name={slide.title || ""} candles={slide.candles || ""} havdalah={slide.havdalah || ""} city={slide.city || ""} verses={slide.verses || []} seconds={slide.duration} still={slide.still} />;
  }
  if (isDeckId(slide.templateId)) {
    return <KnowledgeSlide deck={slide.templateId} />;
  }
  if (slide.kind === "template" || (slide.kind === "image" && (slide.title || slide.detail))) {
    const bubble = /general-clean|greet-welcome/.test(`${slide.templateId || ""} ${slide.imageUrl || ""}`);
    return (
      <div className={bubble ? "slide-frame is-overlay" : "slide-frame"}>
        <img className="slide-image" src={slide.imageUrl} alt="" onLoad={onReady} onError={onReady} />
        <div className={bubble ? "slide-copy is-bubble" : "slide-copy"}>
          <strong>{slide.title}</strong>
          {slide.detail ? <span>{slide.detail}</span> : null}
        </div>
      </div>
    );
  }
  if (isVideoFile(slide.imageUrl)) {
    return <video className="slide-video" src={slide.imageUrl} autoPlay muted loop playsInline preload="auto" onCanPlay={onReady} onError={onReady} />;
  }
  return <img className="slide-image" src={slide.imageUrl} alt="" onLoad={onReady} onError={onReady} />;
}

function preloadSlide(slide: PlaySlide | undefined) {
  if (!slide) return;
  const file = isVideoFile(slide.imageUrl) ? slide.imageUrl : isVideoFile(slide.detail || "") ? slide.detail || "" : "";
  if (file) {
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.src = file;
    video.load();
    return;
  }
  if (!slide.imageUrl || slide.imageUrl.includes(".pdf") || slide.kind === "youtube") return;
  const image = new Image();
  image.src = slide.imageUrl;
}

export function Player({ slides }: { slides: PlaySlide[] }) {
  const [index, setIndex] = useState(0);
  const [hold, setHold] = useState<number | null>(null);
  const current = slides[index];
  const covered = hold != null && hold !== index ? slides[hold] : null;
  const seconds = Math.max(3, Number(current?.duration) || 8);

  useEffect(() => {
    const stage = document.querySelector(".stage");
    stage?.classList.toggle("slide-full", Boolean(current?.full));
    return () => stage?.classList.remove("slide-full");
  }, [current?.full]);

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = window.setTimeout(() => {
      setHold(index);
      setIndex((value) => (value + 1) % slides.length);
    }, seconds * 1000);
    return () => window.clearTimeout(timer);
  }, [index, seconds, slides.length]);

  useEffect(() => {
    preloadSlide(slides[(index + 1) % slides.length]);
  }, [index, slides]);

  useEffect(() => {
    if (hold == null) return;
    const timer = window.setTimeout(() => setHold(null), 700);
    return () => window.clearTimeout(timer);
  }, [hold, index]);

  if (!current) return <div className="empty">אין שקפים</div>;
  return (
    <div className="slide-stack">
      {covered ? (
        <div className="slide-layer is-under">
          <SlideFace slide={covered} />
        </div>
      ) : null}
      <div className="slide-layer is-front is-in">
        <SlideFace slide={current} />
      </div>
    </div>
  );
}
