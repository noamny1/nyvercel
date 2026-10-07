"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function pestWhen(day?: string, from?: string) {
  return [day ? `יום ${day}` : "", from || ""].filter(Boolean).join(" · ");
}

export function CharacterVideo({
  src,
  title,
  detail,
  poster,
}: {
  src: string;
  title?: string;
  detail?: string;
  poster?: string;
}) {
  return (
    <div className="char-stage">
      <div className="char-frame">
        <video src={src} poster={poster} autoPlay muted loop playsInline />
        <div className="char-note">
          <strong>{title}</strong>
          {detail ? <span>{detail}</span> : null}
        </div>
      </div>
    </div>
  );
}

export function PestVideo({
  src,
  title,
  detail,
  day,
  from,
  poster,
}: {
  src: string;
  title?: string;
  detail?: string;
  day?: string;
  from?: string;
  poster?: string;
}) {
  const when = pestWhen(day, from);
  return (
    <div className="char-stage">
      <div className="char-frame">
        <video src={src} poster={poster} autoPlay muted loop playsInline />
        <div className="char-note">
          <strong>{title || "הדברה"}</strong>
          {when ? <b>{when}</b> : null}
          {detail ? <span>{detail}</span> : null}
        </div>
      </div>
    </div>
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
