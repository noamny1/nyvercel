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
      node.style.transform = `translate(-50%, -50%) scale(${scale})`;
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
