"use client";

import { useEffect, useRef, type ReactNode } from "react";

const WIDTH = 1366;
const HEIGHT = 768;

export function FitStage({ className, children, width = WIDTH, height = HEIGHT, fill = 0.97, code = 0, revision = 0 }: { className: string; children: ReactNode; width?: number; height?: number; fill?: number; code?: number; revision?: number }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const fit = () => {
      const scale = Math.min(window.innerWidth / width, window.innerHeight / height) * fill;
      node.style.transform = `translate(-50%, -50%) scale(${scale})`;
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [width, height, fill]);

  return (
    <main ref={ref} className={className} data-code={code || undefined} data-rev={revision || undefined}>
      {children}
    </main>
  );
}
