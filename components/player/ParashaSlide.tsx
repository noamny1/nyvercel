"use client";

import { useLayoutEffect, useRef } from "react";

export function ParashaSlide({
  name,
  candles,
  city,
  verses,
  seconds,
  still = false,
}: {
  name: string;
  candles: string;
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

  return (
    <div className={still ? "parasha-slide is-still" : "parasha-slide"}>
      <header>
        <strong>{name ? `פרשת ${name}` : "פרשת השבוע"}</strong>
        <em>
          <img src="/candles.gif" alt="" />
          {candles ? `הדלקת נרות ${candles}` : "הדלקת נרות"}{city ? ` · ${city}` : ""}
        </em>
      </header>
      <div className={still ? "parasha-body is-still" : "parasha-body"} ref={body}>
        <p ref={text} style={still ? { columnCount: columns } : verses.length > 6 ? { animationDuration: `${pace}s` } : undefined}>
          {verses.length ? verses.map((verse, index) => <span key={index}>{verse}</span>) : <span>הפרשה המלאה תופיע במסך לפי השבת הקרובה.</span>}
        </p>
      </div>
    </div>
  );
}
