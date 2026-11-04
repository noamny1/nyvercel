"use client";

import { useEffect, useState, type ReactNode } from "react";
import QRCode from "qrcode";

export function pestWhen(day?: string, from?: string) {
  return [day ? `יום ${day}` : "", from || ""].filter(Boolean).join(" · ");
}

function motionSrc(src: string) {
  return src.replace(/\.mp4(\?.*)?$/i, ".webp");
}

function CharacterFrame({
  src,
  poster,
  onReady,
  live = true,
  children,
}: {
  src: string;
  poster?: string;
  onReady?: () => void;
  live?: boolean;
  children: ReactNode;
}) {
  const motion = motionSrc(src);
  return (
    <div className="char-stage">
      <img
        src={live ? motion : undefined}
        data-media={motion}
        alt=""
        onLoad={onReady}
        onError={(event) => {
          const image = event.currentTarget;
          if (poster && image.dataset.fallback !== "1") {
            image.dataset.fallback = "1";
            image.src = poster;
            return;
          }
          onReady?.();
        }}
      />
      {children}
    </div>
  );
}

export function CharacterVideo({
  src,
  title,
  detail,
  poster,
  onReady,
  live = true,
}: {
  src: string;
  title?: string;
  detail?: string;
  poster?: string;
  onReady?: () => void;
  live?: boolean;
}) {
  return (
    <CharacterFrame src={src} poster={poster} onReady={onReady} live={live}>
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
  live = true,
}: {
  src: string;
  title?: string;
  detail?: string;
  day?: string;
  from?: string;
  poster?: string;
  onReady?: () => void;
  live?: boolean;
}) {
  const when = pestWhen(day, from);
  return (
    <CharacterFrame src={src} poster={poster} onReady={onReady} live={live}>
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