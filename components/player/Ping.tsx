"use client";

import { useEffect } from "react";

export function Ping({ code, revision }: { code: number; revision: number }) {
  useEffect(() => {
    let current = revision;
    const send = async () => {
      try {
        const response = await fetch(`/api/ping?code=${code}`, { method: "POST", cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { r?: number };
        if (typeof data.r === "number" && data.r !== current) {
          current = data.r;
          location.reload();
        }
      } catch {
        /* the last slide stays on screen */
      }
    };
    void send();
    const timer = setInterval(() => void send(), 3 * 60 * 1000);
    return () => clearInterval(timer);
  }, [code, revision]);
  return null;
}
