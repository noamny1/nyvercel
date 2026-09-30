"use client";

import { useEffect, useState } from "react";

export function Player({ slides }: { slides: { imageUrl: string; duration: number }[] }) {
  const [index, setIndex] = useState(0);
  const current = slides[index];

  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(() => setIndex((value) => (value + 1) % slides.length), current.duration * 1000);
    return () => clearTimeout(timer);
  }, [current, slides.length]);

  if (!current) return <div className="empty">אין שקפים</div>;
  return <img className="slide-image" src={current.imageUrl} alt="" />;
}
