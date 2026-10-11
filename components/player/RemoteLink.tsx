"use client";

import { useEffect } from "react";

export function RemoteLink({ code }: { code: number }) {
  useEffect(() => {
    let stop = false;
    const tick = async () => {
      while (!stop) {
        try {
          const response = await fetch(`/api/remote?code=${code}`, { cache: "no-store" });
          const data = await response.json() as { watch?: boolean; needFrame?: boolean };
          if (data.watch && data.needFrame) {
            const node = document.querySelector(".stage, .takeover");
            if (node instanceof HTMLElement) {
              const { toBlob } = await import("html-to-image");
              const width = Math.max(node.clientWidth, 1);
              const height = Math.max(node.clientHeight, 1);
              const blob = await toBlob(node, { type: "image/jpeg", quality: 0.5, pixelRatio: Math.min(1, 900 / width), cacheBust: true });
              if (blob && !stop) {
                await fetch(`/api/remote?code=${code}`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "image/jpeg",
                    "X-Remote-W": String(width),
                    "X-Remote-H": String(height),
                  },
                  body: blob,
                });
              }
            }
          }
        } catch {
          // The next poll retries. A failed picture must not stop the screen.
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    };
    void tick();
    return () => {
      stop = true;
    };
  }, [code]);
  return null;
}
