"use client";

import { useEffect } from "react";

export function Ping({ code, revision }: { code: number; revision: number }) {
  useEffect(() => {
    let current = revision;
    const send = async (retry = true) => {
      try {
        const response = await fetch(`/api/ping?code=${code}&beat=1`, { method: "POST", cache: "no-store" });
        if (!response.ok) {
          if (retry) window.setTimeout(() => void send(false), 20000);
          return;
        }
        const data = (await response.json()) as { r?: number };
        if (typeof data.r === "number" && data.r !== current) {
          current = data.r;
          const next = `${location.pathname}?v=${data.r}`;
          location.replace(next);
        }
      } catch {
        if (retry) window.setTimeout(() => void send(false), 20000);
      }
    };
    void send();
    const timer = setInterval(() => void send(), 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, [code, revision]);
  return null;
}
