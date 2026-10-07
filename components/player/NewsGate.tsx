"use client";

import { useEffect } from "react";
import { useNewsOn } from "@/components/player/useNewsOn";

export function NewsGate({ mode }: { mode: string }) {
  const on = useNewsOn(mode);
  useEffect(() => {
    const stage = document.querySelector(".stage");
    if (!stage) return;
    const full = stage.classList.contains("layout-luxury") || stage.classList.contains("layout-modern") || stage.classList.contains("layout-glass") || stage.classList.contains("layout-cinema");
    stage.classList.toggle("no-ticker", !on || full);
  }, [on]);
  return null;
}
