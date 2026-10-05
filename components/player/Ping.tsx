"use client";

import { useEffect } from "react";

export function Ping({ code, revision }: { code: number; revision: number }) {
  useEffect(() => {
    let current = revision;
    let tick = 0;
    const send = async () => {
      tick += 1;
      try {
        const beat = tick % 6 === 1 ? "&beat=1" : "";
        const response = await fetch(`/api/ping?code=${code}${beat}`, { method: "POST", cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { r?: number };
        if (typeof data.r === "number" && data.r !== current) {
          current = data.r;
          const next = `${location.pathname}?v=${data.r}`;
          location.replace(next);
        }
      } catch {
        /* the last slide stays on screen */
      }
    };
    void send();
    const timer = setInterval(() => void send(), 12_000);
    return () => clearInterval(timer);
  }, [code, revision]);
  return null;
}
