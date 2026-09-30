"use client";

import { useEffect } from "react";

export function Ping({ id }: { id: number }) {
  useEffect(() => {
    const send = () => {
      void fetch(`/api/ping?id=${id}`, { method: "POST" }).catch(() => undefined);
    };
    send();
    const timer = setInterval(send, 4 * 60 * 1000);
    return () => clearInterval(timer);
  }, [id]);
  return null;
}
