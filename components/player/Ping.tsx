"use client";

import { useEffect } from "react";

export function Ping({ code, revision }: { code: number; revision: number }) {
  useEffect(() => {
    let current = revision;
    let stopped = false;
    let waited = 0;
    const send = async () => {
      try {
        const response = await fetch(`/api/ping?code=${code}&beat=1`, { method: "POST", cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { r?: number };
        if (typeof data.r === "number" && data.r !== current) {
          current = data.r;
          const next = `${location.pathname}?v=${data.r}`;
          location.replace(next);
        }
      } catch {
        /* the picture stays up */
      }
    };
    const tick = () => {
      if (stopped) return;
      waited += 30000;
      if (waited >= 5 * 60 * 1000) {
        waited = 0;
        void send();
      }
      window.setTimeout(tick, 30000);
    };
    void send();
    window.setTimeout(tick, 30000);
    return () => {
      stopped = true;
    };
  }, [code, revision]);
  return null;
}
