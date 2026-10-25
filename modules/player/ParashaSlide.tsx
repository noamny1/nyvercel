"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

export function ParashaSlide({
  name,
  candles,
  havdalah,
  city,
  verses,
  seconds,
  still = false,
}: {
  name: string;
  candles: string;
  havdalah?: string;
  city: string;
  verses: string[];
  seconds?: number;
  still?: boolean;
}) {
  const body = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLParagraphElement>(null);
  const columns = verses.length > 120 ? 4 : verses.length > 70 ? 3 : verses.length > 32 ? 2 : 1;
  const pace = Math.max(seconds || 180, Math.round(verses.length * 2.2));

  useLayoutEffect(() => {
    if (!still || !body.current || !text.current) return;
    const box = body.current;
    const node = text.current;
    let size = Math.min(26, Math.max(18, Math.round(box.clientHeight / 26)));
    node.style.fontSize = `${size}px`;
    while (size > 15 && node.scrollHeight > box.clientHeight + 1) {
      size -= 1;
      node.style.fontSize = `${size}px`;
    }
  }, [still, verses, columns]);

  useEffect(() => {
    if (still) return;
    const box = body.current;
    const node = text.current;
    if (!box || !node) return;
    let frame = 0;
    let started = false;
    let running = false;
    let start = 0;
    let distance = 0;
    const step = (now: number) => {
      if (!running) return;
      const elapsed = (now - start) / 1000;
      const t = Math.min(1, elapsed / pace);
      const y = Math.round(-distance * t);
      node.style.transform = `translate3d(0, ${y}px, 0)`;
      if (t < 1) frame = requestAnimationFrame(step);
    };
    const arm = () => {
      const view = box.clientHeight;
      if (view < 20) {
        started = false;
        running = false;
        cancelAnimationFrame(frame);
        node.style.transform = "translate3d(0, 0, 0)";
        return;
      }
      if (started) return;
      const full = node.scrollHeight;
      if (full <= view + 8) return;
      distance = full - view;
      start = performance.now();
      started = true;
      running = true;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(step);
    };
    arm();
    const timer = window.setInterval(arm, 400);
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(arm) : null;
    observer?.observe(box);
    return () => {
      running = false;
      cancelAnimationFrame(frame);
      window.clearInterval(timer);
      observer?.disconnect();
    };
  }, [still, verses, pace]);

  return (
    <div className={still ? "parasha-slide is-still" : "parasha-slide"}>
      <header>
        <strong>{name ? `פרשת ${name}` : "פרשת השבוע"}</strong>
        <em className="parasha-times">
          <span>
            <img src="/candles.gif" alt="" />
            {candles ? `כניסת שבת ${candles}` : "כניסת שבת"}
          </span>
          <span>
            <img src="/torah.gif" alt="" />
            {havdalah ? `יציאת שבת ${havdalah}` : "יציאת שבת"}
          </span>
          {city ? <span className="parasha-city">{city}</span> : null}
        </em>
      </header>
      <div className={still ? "parasha-body is-still" : "parasha-body"} ref={body}>
        <p ref={text} style={still ? { columnCount: columns } : undefined}>
          {verses.length ? verses.map((verse, index) => <span key={index}>{verse}</span>) : <span>הפרשה המלאה תופיע במסך לפי השבת הקרובה.</span>}
        </p>
      </div>
    </div>
  );
}
