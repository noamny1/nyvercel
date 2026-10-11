"use client";

import { useEffect, useRef, type ReactNode } from "react";

const WIDTH = 1366;
const HEIGHT = 768;

export function FitStage({ className, children }: { className: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const fit = () => {
      const scale = Math.min(window.innerWidth / WIDTH, window.innerHeight / HEIGHT);
      node.style.zoom = String(scale);
      node.style.position = "fixed";
      node.style.left = `${Math.max(0, (window.innerWidth - WIDTH * scale) / 2)}px`;
      node.style.top = `${Math.max(0, (window.innerHeight - HEIGHT * scale) / 2)}px`;
      node.style.transform = "none";
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  return (
    <main ref={ref} className={className}>
      {children}
    </main>
  );
}
