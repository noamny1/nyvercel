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
  const [on, setOn] = useState(() => musicOnNow(days, from, until));
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const onRef = useRef(on);
  const fails = useRef(0);
  onRef.current = on;
  const track = tracks[index];
  const src = track?.url || (!tracks.length && url && playlist !== "off" ? url : "");

  useEffect(() => {
    const tick = () => setOn(musicOnNow(days, from, until));
    tick();
    const timer = window.setInterval(tick, 15000);
    return () => window.clearInterval(timer);
  }, [days, from, until]);

  useEffect(() => {
    setIndex(0);
  }, [playlist, start]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !src) return;
    let stopped = false;
    const count = Math.max(tracks.length, 1);
    const kick = () => {
      if (stopped) return;
      if (!onRef.current) {
        if (!audio.paused) audio.pause();
        return;
      }
      audio.muted = false;
      audio.volume = 1;
      const attempt = audio.play();
      if (attempt) attempt.catch(() => undefined);
    };
    const skip = () => {
      if (stopped || !tracks.length) return;
      fails.current += 1;
      const wait = fails.current > count ? 20000 : 0;
      if (fails.current > count) fails.current = 0;
      window.setTimeout(() => {
        if (!stopped) setIndex((value) => (value + 1) % count);
      }, wait);
    };
    const absolute = new URL(src, window.location.href).href;
    if (audio.src !== absolute) {
      audio.src = src;
      audio.load();
    }
    audio.loop = tracks.length === 0;
    kick();
    const onReady = () => kick();
    const onEnded = () => {
      fails.current = 0;
      if (tracks.length) setIndex((value) => (value + 1) % count);
    };
    audio.addEventListener("canplay", onReady);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", skip);
    let last = -1;
    let frozen = 0;
    const watch = window.setInterval(() => {
      if (!onRef.current) {
        if (!audio.paused) audio.pause();
        frozen = 0;
        return;
      }
      const time = audio.currentTime;
      const moving = Math.abs(time - last) > 0.25;
      if (moving) {
        frozen = 0;
        fails.current = 0;
      } else if (!audio.paused && !audio.ended) {
        frozen += 1;
      } else {
        frozen += 1;
      }
      last = time;
      if (frozen >= 4) {
        frozen = 0;
        if (audio.error || (audio.readyState >= 2 && !audio.paused)) skip();
        else kick();
      } else if (audio.paused || audio.ended) {
        kick();
      }
    }, 5000);
    const onShow = () => {
      if (document.visibilityState === "visible") kick();
    };
    document.addEventListener("visibilitychange", onShow);
    return () => {
      stopped = true;
      audio.removeEventListener("canplay", onReady);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", skip);
      document.removeEventListener("visibilitychange", onShow);
      window.clearInterval(watch);
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
      <audio ref={audioRef} id="lobby-music" preload="auto" />
      {track && on ? <p className="music-credit">{track.title} · Kevin MacLeod (incompetech.com) · CC BY 4.0</p> : null}
    </>
  );
}
