"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Shuffle,
  SkipBack,
  SkipForward,
  Repeat,
  Pause,
  Play,
  Volume2,
} from "lucide-react";

type Track = {
  id: string;
  title: string;
  artist: string;
  coverUrl?: string;
  audioUrl: string;
  durationHint?: number;
};

type PlayerStatus = "paused" | "loading" | "playing";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function formatTime(sec: number) {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function PlayingBars() {
  const bars = useMemo(() => Array.from({ length: 4 }, (_, i) => i), []);
  return (
    <div className="flex items-end gap-1">
      {bars.map((i) => (
        <motion.span
          key={i}
          className="block w-2 rounded-sm bg-[#8B5CF6]/90"
          initial={{ height: 8 }}
          animate={{ height: [8, 22, 12, 26, 10, 20] }}
          transition={{
            duration: 1.1 + i * 0.08,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

function LoadingBars() {
  const bars = useMemo(() => Array.from({ length: 5 }, (_, i) => i), []);
  return (
    <div className="flex items-end gap-1">
      {bars.map((i) => (
        <motion.span
          key={i}
          className="block w-2 rounded-sm bg-white/40"
          initial={{ height: 8, opacity: 0.5 }}
          animate={{
            height: [8, 18, 10, 22, 12, 16],
            opacity: [0.4, 0.8, 0.5, 0.9, 0.55],
          }}
          transition={{
            duration: 0.9 + i * 0.06,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

function PausedDots() {
  const dots = useMemo(() => Array.from({ length: 5 }, (_, i) => i), []);
  return (
    <div className="flex items-center gap-1">
      {dots.map((i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-[3px] bg-white/35"
          style={{ opacity: 0.25 + i * 0.08 }}
        />
      ))}
    </div>
  );
}

export function MusicPlayer() {
  // ✅ playlist
  const tracks: Track[] = useMemo(
    () => [
      {
        id: "t1",
        title: "Awesome Song Title",
        artist: "Amazing Artist",
        audioUrl:
          "https://cdn.pixabay.com/download/audio/2022/03/15/audio_2b1fe7a2ab.mp3?filename=future-bass-logo-19442.mp3",
      },
      {
        id: "t2",
        title: "Second Track",
        artist: "Another Artist",
        audioUrl:
          "https://cdn.pixabay.com/download/audio/2022/10/03/audio_1d2c1b0f2a.mp3?filename=ambient-piano-logo-12047.mp3",
      },
    ],
    [],
  );

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [index, setIndex] = useState(0);
  const track = tracks[index];

  const [status, setStatus] = useState<PlayerStatus>("paused");
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);

  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  const [volume, setVolume] = useState(0.8);

  // load track
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    setStatus("loading");
    setCurrent(0);
    setDuration(0);

    a.src = track.audioUrl;
    a.load();

    const onLoaded = () => {
      setDuration(a.duration || track.durationHint || 0);
      setStatus("paused");
    };
    const onTime = () => setCurrent(a.currentTime || 0);
    const onEnded = () => {
      if (isRepeat) {
        a.currentTime = 0;
        a.play().catch(() => {});
        setStatus("playing");
        return;
      }
      next();
    };
    const onWaiting = () => {
      if (!a.paused) setStatus("loading");
    };
    const onPlaying = () => setStatus("playing");
    const onPause = () => setStatus("paused");

    a.addEventListener("loadedmetadata", onLoaded);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnded);
    a.addEventListener("waiting", onWaiting);
    a.addEventListener("playing", onPlaying);
    a.addEventListener("pause", onPause);

    return () => {
      a.removeEventListener("loadedmetadata", onLoaded);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnded);
      a.removeEventListener("waiting", onWaiting);
      a.removeEventListener("playing", onPlaying);
      a.removeEventListener("pause", onPause);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, track.audioUrl, isRepeat]);

  // volume
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.volume = clamp(volume, 0, 1);
  }, [volume]);

  const progress = useMemo(() => {
    if (!duration) return 0;
    return clamp(current / duration, 0, 1);
  }, [current, duration]);

  function pickRandomNext() {
    if (tracks.length <= 1) return index;
    let nextIdx = index;
    while (nextIdx === index)
      nextIdx = Math.floor(Math.random() * tracks.length);
    return nextIdx;
  }

  function prev() {
    setIndex((i) => {
      if (isShuffle) return pickRandomNext();
      return (i - 1 + tracks.length) % tracks.length;
    });
  }

  function next() {
    setIndex((i) => {
      if (isShuffle) return pickRandomNext();
      return (i + 1) % tracks.length;
    });
  }

  async function togglePlay() {
    const a = audioRef.current;
    if (!a) return;

    if (a.paused) {
      setStatus("loading");
      try {
        await a.play();
      } catch {
        setStatus("paused");
      }
    } else {
      a.pause();
    }
  }

  function seekTo(p: number) {
    const a = audioRef.current;
    if (!a || !duration) return;
    const t = clamp(p, 0, 1) * duration;
    a.currentTime = t;
    setCurrent(t);
  }

  const stateLabel =
    status === "paused"
      ? "Paused"
      : status === "loading"
        ? "Loading"
        : "Playing";

  return (
    <div className="w-full max-w-md">
      <audio ref={audioRef} preload="metadata" />

      <div className="mx-auto w-full max-w-130">
        <div className="mb-3 flex items-center justify-between px-2 text-xs text-white/45">
          <span>{stateLabel}</span>
          <span className="opacity-70">
            {status === "loading" ? "Loading" : ""}
          </span>
        </div>

        <motion.div
          layout
          className="relative overflow-hidden rounded-2xl bg-[#0B0F17]/90 shadow-[0_20px_80px_rgba(0,0,0,0.55)] ring-1 ring-white/10"
          animate={{
            boxShadow:
              status === "playing"
                ? "0 20px 80px rgba(139,92,246,0.28)"
                : "0 20px 80px rgba(0,0,0,0.55)",
          }}
          transition={{ duration: 0.35 }}
        >
          <div className="pointer-events-none absolute inset-x-0 -top-20 h-40 bg-linear-to-b from-[#8B5CF6]/25 to-transparent blur-2xl" />

          <div className="p-6">
            <div className="flex items-start gap-5">
              <motion.div
                className="relative h-24 w-24 overflow-hidden rounded-2xl"
                initial={false}
                animate={{
                  rotate: status === "playing" ? 1.5 : 0,
                  scale: status === "playing" ? 1.02 : 1,
                }}
                transition={{ type: "spring", stiffness: 240, damping: 18 }}
                style={{
                  background: track.coverUrl
                    ? undefined
                    : "linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)",
                }}
              >
                {track.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={track.coverUrl}
                    alt={`${track.title} cover`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center">
                    <span className="text-4xl drop-shadow">🎵</span>
                  </div>
                )}
              </motion.div>

              {/* title + state bars */}
              <div className="min-w-0 flex-1 pt-1">
                <div className="truncate text-lg font-semibold text-white">
                  {track.title}
                </div>
                <div className="mt-1 truncate text-sm text-white/55">
                  {track.artist}
                </div>

                <div className="mt-5">
                  <AnimatePresence mode="wait" initial={false}>
                    {status === "playing" ? (
                      <motion.div
                        key="playing"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                      >
                        <PlayingBars />
                      </motion.div>
                    ) : status === "loading" ? (
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                      >
                        <LoadingBars />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="paused"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                      >
                        <PausedDots />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <div className="relative h-2 w-full rounded-full bg-white/12">
                <motion.div
                  className="absolute left-0 top-0 h-2 rounded-full bg-[#8B5CF6]"
                  initial={false}
                  animate={{
                    width: `${progress * 100}%`,
                    opacity: status === "loading" ? 0.45 : 1,
                  }}
                  transition={{ duration: status === "loading" ? 0.2 : 0.1 }}
                />
                <button
                  type="button"
                  className="absolute inset-0 cursor-pointer rounded-full"
                  onClick={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    const p = (e.clientX - r.left) / r.width;
                    seekTo(p);
                  }}
                  aria-label="Seek"
                />
              </div>

              <div className="mt-2 flex items-center justify-between text-xs text-white/40">
                <span>{formatTime(current)}</span>
                <span>{formatTime(duration || 3 * 60 + 45)}</span>
              </div>
            </div>

            {/* controls */}
            <div className="mt-6 flex items-center justify-center gap-7 text-white/70">
              <motion.button
                whileTap={{ scale: 0.92 }}
                className={isShuffle ? "text-[#8B5CF6]" : "hover:text-white"}
                onClick={() => setIsShuffle((v) => !v)}
                aria-label="Shuffle"
                type="button"
              >
                <Shuffle size={20} />
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.92 }}
                className="hover:text-white"
                onClick={prev}
                aria-label="Previous"
                type="button"
              >
                <SkipBack size={22} />
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.92 }}
                whileHover={{ scale: 1.03 }}
                className="grid h-14 w-14 place-items-center rounded-full bg-[#8B5CF6] text-white shadow-[0_10px_40px_rgba(139,92,246,0.35)]"
                onClick={togglePlay}
                aria-label="Play/Pause"
                type="button"
              >
                <AnimatePresence mode="wait" initial={false}>
                  {status === "playing" ? (
                    <motion.span
                      key="pause"
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                    >
                      <Pause size={22} />
                    </motion.span>
                  ) : (
                    <motion.span
                      key="play"
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                    >
                      <Play size={22} className="translate-x-px" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.92 }}
                className="hover:text-white"
                onClick={next}
                aria-label="Next"
                type="button"
              >
                <SkipForward size={22} />
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.92 }}
                className={isRepeat ? "text-[#8B5CF6]" : "hover:text-white"}
                onClick={() => setIsRepeat((v) => !v)}
                aria-label="Repeat"
                type="button"
              >
                <Repeat size={20} />
              </motion.button>
            </div>

            {/* volume */}
            <div className="mt-6 flex items-center gap-3">
              <Volume2 className="text-white/45" size={18} />
              <div className="relative h-2 w-full rounded-full bg-white/12">
                <motion.div
                  className="absolute left-0 top-0 h-2 rounded-full bg-white/35"
                  initial={false}
                  animate={{ width: `${clamp(volume, 0, 1) * 100}%` }}
                  transition={{ duration: 0.1 }}
                />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="absolute inset-0 h-2 w-full cursor-pointer opacity-0"
                  aria-label="Volume"
                />
              </div>
            </div>
          </div>

          <div className="h-px w-full bg-white/10" />
          <div className="h-4" />
        </motion.div>
      </div>
    </div>
  );
}
