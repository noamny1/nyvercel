"use client";

import { useEffect, useMemo, useState } from "react";
import { tracksFor, type Track } from "@/lib/music-catalog";
import { useTurn } from "@/components/player/useTurn";

function mix(list: Track[], seed: number) {
  const copy = [...list];
  let state = Math.abs(seed) % 2147483646 + 1;
  for (let index = copy.length - 1; index > 0; index -= 1) {
    state = (state * 48271) % 2147483647;
    const swap = state % (index + 1);
    const current = copy[index];
    copy[index] = copy[swap];
    copy[swap] = current;
  }
  return copy;
}

export function Music({ playlist, url, start }: { playlist: string; url: string; start: number }) {
  const turn = useTurn();
  const tracks = useMemo(() => mix(tracksFor(playlist), (start || 1) + turn * 97), [playlist, start, turn]);
  const [index, setIndex] = useState(0);
  const track = tracks[index];

  useEffect(() => {
    setIndex(0);
  }, [playlist, start, turn]);

  useEffect(() => {
    const audio = document.getElementById("lobby-music") as HTMLAudioElement | null;
    if (!audio) return;
    audio.play().catch(() => undefined);
  }, [index, playlist, url, track?.url]);

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