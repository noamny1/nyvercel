"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { tracksFor, type Track } from "@/modules/music/catalog";
import { musicOnNow } from "@/modules/music/hours";

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

export function Music({ playlist, url, start, days = "0,1,2,3,4", from = "07:00", until = "22:30" }: { playlist: string; url: string; start: number; days?: string; from?: string; until?: string }) {
  const tracks = useMemo(() => mix(tracksFor(playlist), start || 1), [playlist, start]);
  const [index, setIndex] = useState(0);
  const [on, setOn] = useState(() => musicOnNow(days || "0,1,2,3,4", from || "07:00", until || "22:30"));
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const onRef = useRef(on);
  const fails = useRef(0);
  onRef.current = on;
  const track = tracks[index];
  const src = track?.url || (!tracks.length && url && playlist !== "off" ? url : "");

  useEffect(() => {
    const tick = () => setOn(musicOnNow(days || "0,1,2,3,4", from || "07:00", until || "22:30"));
    tick();
    const timer = window.setInterval(tick, 15000);
    return () => window.clearInterval(timer);
  }, [days, from, until]);

  useEffect(() => {
    setIndex(0);
    fails.current = 0;
  }, [playlist, start]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const kick = () => {
      if (!onRef.current || !audioRef.current) return;
      const node = audioRef.current;
      node.muted = false;
      node.volume = 1;
      const attempt = node.play();
      if (attempt) attempt.catch(() => undefined);
    };
    kick();
    let last = -1;
    let frozen = 0;
    const watch = window.setInterval(() => {
      const node = audioRef.current;
      if (!node || !onRef.current) {
        if (node && !node.paused) node.pause();
        frozen = 0;
        return;
      }
      if (node.paused || node.ended) {
        kick();
        frozen += 1;
      } else if (Math.abs(node.currentTime - last) < 0.25) {
        frozen += 1;
      } else {
        frozen = 0;
        fails.current = 0;
      }
      last = node.currentTime;
      if (frozen < 8) return;
      frozen = 0;
      if (!tracks.length) {
        kick();
        return;
      }
      fails.current += 1;
      const wait = fails.current > tracks.length ? 20000 : 400;
      window.setTimeout(() => {
        setIndex((value) => (value + 1) % tracks.length);
      }, wait);
      if (fails.current > tracks.length) fails.current = 0;
    }, 4000);
    const onShow = () => {
      if (document.visibilityState === "visible") kick();
    };
    document.addEventListener("visibilitychange", onShow);
    return () => {
      window.clearInterval(watch);
      document.removeEventListener("visibilitychange", onShow);
    };
  }, [src, tracks.length]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!on) audio.pause();
    else {
      audio.muted = false;
      void audio.play().catch(() => undefined);
    }
  }, [on]);

  if (!src) return null;

  return (
    <>
      <audio
        ref={audioRef}
        id="lobby-music"
        src={src}
        autoPlay
        preload="auto"
        data-music={on ? "1" : "0"}
        onEnded={() => {
          fails.current = 0;
          if (tracks.length) setIndex((value) => (value + 1) % tracks.length);
        }}
        onError={() => {
          if (tracks.length) setIndex((value) => (value + 1) % tracks.length);
        }}
      />
      {track && on ? <p className="music-credit">{track.title} · Kevin MacLeod (incompetech.com) · CC BY 4.0</p> : null}
    </>
  );
}
