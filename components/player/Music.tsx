"use client";

import { useEffect, useState } from "react";
import { tracksFor } from "@/lib/music-catalog";

export function Music({ playlist, url, start }: { playlist: string; url: string; start: number }) {
  const tracks = tracksFor(playlist);
  const [index, setIndex] = useState(tracks.length ? Math.abs(start) % tracks.length : 0);
  const track = tracks[index];

  useEffect(() => {
    const audio = document.getElementById("lobby-music") as HTMLAudioElement | null;
    if (!audio) return;
    audio.play().catch(() => undefined);
  }, [index, playlist, url]);

  if (track) {
    return (
      <>
        <audio
          id="lobby-music"
          src={track.url}
          autoPlay
          onEnded={() => setIndex((value) => (value + 1) % tracks.length)}
          onError={() => setIndex((value) => (value + 1) % tracks.length)}
        />
        <p className="music-credit">{track.title} · Kevin MacLeod (incompetech.com) · CC BY 4.0</p>
      </>
    );
  }
  if (!url || playlist === "off") return null;
  return <audio id="lobby-music" src={url} autoPlay loop />;
}
