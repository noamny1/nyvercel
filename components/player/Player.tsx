"use client";

import { useEffect, useState } from "react";

export type PlaySlide = {
  imageUrl: string;
  duration: number;
  kind?: string;
  title?: string;
  detail?: string;
};

function youtubeId(url: string) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/);
  return match?.[1] || "";
}

export function Player({ slides }: { slides: PlaySlide[] }) {
  const [index, setIndex] = useState(0);
  const current = slides[index];

  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(() => setIndex((value) => (value + 1) % slides.length), Math.max(3, current.duration) * 1000);
    return () => clearTimeout(timer);
  }, [current, slides.length]);

  if (!current) return <div className="empty">אין שקפים</div>;
  if (current.kind === "youtube") {
    const id = youtubeId(current.imageUrl);
    if (!id) return <div className="empty">סרטון לא זמין</div>;
    return (
      <iframe
        className="slide-image"
        src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&controls=0&rel=0&loop=1&playlist=${id}`}
        title={current.title || "סרטון"}
        allow="autoplay; encrypted-media"
      />
    );
  }
  const pdf = current.imageUrl.toLowerCase().includes(".pdf");
  if (pdf) return <iframe className="slide-image" src={`${current.imageUrl}#toolbar=0&navpanes=0`} title="שקף" />;
  if (current.kind === "template") {
    return (
      <div className="slide-frame">
        <img className="slide-image" src={current.imageUrl} alt="" />
        <div className="slide-copy">
          <strong>{current.title}</strong>
          {current.detail ? <span>{current.detail}</span> : null}
        </div>
      </div>
    );
  }
  return <img className="slide-image" src={current.imageUrl} alt="" />;
}
