"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import QRCode from "qrcode";

export function pestWhen(day?: string, from?: string) {
  return [day ? `יום ${day}` : "", from || ""].filter(Boolean).join(" · ");
}

function useVideoBox(stage: RefObject<HTMLDivElement | null>) {
  const [box, setBox] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const node = stage.current;
    if (!node) return;
    const measure = () => {
      const rect = node.getBoundingClientRect();
      if (rect.width < 8 || rect.height < 8) return;
      const width = rect.width / rect.height > 16 / 9 ? rect.height * 16 / 9 : rect.width;
      setBox({ width: Math.round(width), height: Math.round(width * 9 / 16) });
    };
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(node);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [stage]);
  return box;
}

function CharacterFrame({
  src,
  poster,
  onReady,
  children,
}: {
  src: string;
  poster?: string;
  onReady?: () => void;
  children: ReactNode;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const box = useVideoBox(stage);
  return (
    <div className="char-stage" ref={stage}>
      <div className="char-frame" style={box.width ? { width: box.width, height: box.height } : undefined}>
        <video src={src} poster={poster} autoPlay muted loop playsInline preload="auto" onCanPlay={onReady} onError={onReady} />
        {children}
      </div>
    </div>
  );
}

export function CharacterVideo({
  src,
  title,
  detail,
  poster,
  onReady,
}: {
  src: string;
  title?: string;
  detail?: string;
  poster?: string;
  onReady?: () => void;
}) {
  return (
    <CharacterFrame src={src} poster={poster} onReady={onReady}>
      {title || detail ? (
        <div className="char-note">
          <strong>{title}</strong>
          {detail ? <span>{detail}</span> : null}
        </div>
      ) : null}
    </CharacterFrame>
  );
}

export function PestVideo({
  src,
  title,
  detail,
  day,
  from,
  poster,
  onReady,
}: {
  src: string;
  title?: string;
  detail?: string;
  day?: string;
  from?: string;
  poster?: string;
  onReady?: () => void;
}) {
  const when = pestWhen(day, from);
  return (
    <CharacterFrame src={src} poster={poster} onReady={onReady}>
      <div className="char-note">
        <strong>{title || "הדברה"}</strong>
        {when ? <b>{when}</b> : null}
        {detail ? <span>{detail}</span> : null}
      </div>
    </CharacterFrame>
  );
}

export function QrSlide({ title, note, token }: { title?: string; note?: string; token?: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    if (!token || typeof window === "undefined") return;
    const url = `${window.location.origin}/v/${token}`;
    let stop = false;
    QRCode.toDataURL(url, {
      margin: 1,
      width: 720,
      errorCorrectionLevel: "M",
      color: { dark: "#3a1219", light: "#ffffff" },
    }).then((value) => {
      if (!stop) setSrc(value);
    }).catch(() => undefined);
    return () => { stop = true; };
  }, [token]);
  return (
    <div className="qr-slide">
      <div className="qr-copy">
        <small>לקריאה בסריקה</small>
        <strong>{title || "מסמך לדיירים"}</strong>
        {note ? <span>{note}</span> : null}
        <em>סורקים ורואים את הקובץ. אי אפשר להוריד אותו.</em>
      </div>
      <div className="qr-box">{src ? <img src={src} alt="" /> : null}</div>
    </div>
  );
}