"use client";

import { useEffect } from "react";

function start() {
  const root = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => void;
    mozRequestFullScreen?: () => void;
    msRequestFullscreen?: () => void;
  };
  const legacy = document as Document & { webkitFullscreenElement?: Element };
  if (!document.fullscreenElement && !legacy.webkitFullscreenElement) {
    if (root.requestFullscreen) void root.requestFullscreen().catch(() => undefined);
    else if (root.webkitRequestFullscreen) root.webkitRequestFullscreen();
    else if (root.mozRequestFullScreen) root.mozRequestFullScreen();
    else root.msRequestFullscreen?.();
  }
  const audio = document.getElementById("lobby-music") as HTMLAudioElement | null;
  if (audio) {
    audio.muted = false;
    void audio.play().catch(() => undefined);
  }
  document.querySelectorAll("video").forEach((node) => {
    void (node as HTMLVideoElement).play().catch(() => undefined);
  });
}

export function Wake() {
  useEffect(() => {
    start();
    const retry = window.setTimeout(start, 400);
    window.addEventListener("pointerdown", start, true);
    window.addEventListener("click", start, true);
    window.addEventListener("touchend", start, true);
    return () => {
      window.clearTimeout(retry);
      window.removeEventListener("pointerdown", start, true);
      window.removeEventListener("click", start, true);
      window.removeEventListener("touchend", start, true);
    };
  }, []);

  return <button type="button" className="wake" aria-label="מסך מלא" onClick={start} />;
}
