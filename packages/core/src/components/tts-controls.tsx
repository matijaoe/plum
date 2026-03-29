import { Pause, Play, Stop } from "@phosphor-icons/react";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useEffect, useMemo, useState } from "react";
import { useSpeech } from "react-text-to-speech";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { Equalizer } from "./equalizer";
import { useReaderContext } from "../reader-context";
import { RATES, extractText, springTap } from "../utils";

/** Higher damping for smooth layout morphing (compact ↔ expanded). */
const spring = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
};

function PlayerControls({
  speechStatus,
  rate,
  onPlayPause,
  onStop,
  onRateCycle,
}: {
  speechStatus: string;
  rate: number;
  onPlayPause: () => void;
  onStop: () => void;
  onRateCycle: () => void;
}) {
  return (
    <motion.div
      className="flex w-full flex-col gap-3"
      initial={{ opacity: 0, filter: "blur(4px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.15, delay: 0.06 }}
    >
      {/* Status */}
      <div className="flex items-center justify-center gap-2">
        {speechStatus === "started" ? (
          <>
            <Equalizer />
            <span className="text-[10px] font-medium tracking-wider text-white/40 uppercase">
              Listening
            </span>
          </>
        ) : (
          <span className="text-[10px] font-medium tracking-wider text-white/40 uppercase">
            Paused
          </span>
        )}
      </div>

      {/* Controls */}
      <div className="grid grid-cols-3 items-center">
        {/* Left — speed */}
        <div className="flex justify-start">
          <motion.button
            type="button"
            onClick={onRateCycle}
            whileTap={{ scale: 0.96 }}
            transition={springTap}
            className="flex h-9 cursor-pointer items-center justify-center rounded-full px-2.5 text-[12px] font-semibold tabular-nums text-white/55 transition-colors hover:bg-white/10 hover:text-white/70 focus:outline-none"
            aria-label={`Speed: ${rate}x`}
          >
            {rate}x
          </motion.button>
        </div>

        {/* Center — play/pause */}
        <div className="flex justify-center">
          <motion.button
            type="button"
            onClick={onPlayPause}
            whileTap={{ scale: 0.96 }}
            whileHover={{ scale: 1.03 }}
            transition={springTap}
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-white text-black focus:outline-none"
            aria-label={speechStatus === "started" ? "Pause" : "Resume"}
          >
            {speechStatus === "started" ? (
              <Pause size={20} weight="fill" />
            ) : (
              <Play size={20} weight="fill" />
            )}
          </motion.button>
        </div>

        {/* Right — stop */}
        <div className="flex justify-end">
          <motion.button
            type="button"
            onClick={onStop}
            whileTap={{ scale: 0.96 }}
            transition={springTap}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/10 hover:text-white/70 focus:outline-none"
            aria-label="Stop"
          >
            <Stop size={16} weight="fill" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

interface TtsControlsProps {
  articleHtml: string;
}

export function TtsControls({ articleHtml }: TtsControlsProps) {
  const { overlayOpen } = useReaderContext();
  const [rate, setRate] = useState(1);
  const [pending, setPending] = useState(false);
  const text = useMemo(() => extractText(articleHtml), [articleHtml]);

  const { speechStatus, start, pause, stop } = useSpeech({
    text,
    rate,
    stableText: true,
  });

  const speechActive = speechStatus === "started" || speechStatus === "paused";
  const isActive = speechActive || pending;

  useEffect(() => {
    if (pending && speechActive) {
      setPending(false);
    }
  }, [pending, speechActive]);

  function handlePlayPause() {
    if (speechStatus === "started") {
      pause();
    } else {
      setPending(true);
      start();
    }
  }

  function handleStop() {
    setPending(false);
    stop();
  }

  function handleRateCycle() {
    const currentIndex = RATES.indexOf(rate as (typeof RATES)[number]);
    const nextIndex = (currentIndex + 1) % RATES.length;
    setRate(RATES[nextIndex]);
  }

  useHotkey("L", () => (isActive ? handleStop() : start()), {
    enabled: !overlayOpen,
  });

  useHotkey("Space", handlePlayPause, {
    enabled: isActive && !overlayOpen,
    preventDefault: true,
  });

  useHotkey("Escape", handleStop, {
    enabled: isActive && !overlayOpen,
  });

  return (
    <LayoutGroup>
      <AnimatePresence initial={false} mode="wait">
        {!isActive ? (
          /* Compact bar — idle state */
          <motion.button
            key="compact"
            layoutId="player"
            type="button"
            onClick={handlePlayPause}
            className="flex cursor-pointer items-center gap-2 rounded-full border border-white/[0.06] bg-player px-3.5 py-2 shadow-lg focus:outline-none"
            aria-label="Listen (L)"
            title="Press L"
            transition={spring}
            whileTap={{ scale: 0.96 }}
          >
            <span className="flex items-center gap-2 text-white">
              <Play size={14} weight="fill" />
              <span className="text-[11px] font-medium tracking-wide uppercase">Listen</span>
            </span>
          </motion.button>
        ) : (
          /* Expanded panel — playing state */
          <motion.div
            key="expanded"
            layoutId="player"
            className="flex w-56 flex-col rounded-2xl border border-white/[0.06] bg-player px-4 py-4 shadow-2xl"
            transition={spring}
          >
            <PlayerControls
              speechStatus={speechStatus}
              rate={rate}
              onPlayPause={handlePlayPause}
              onStop={handleStop}
              onRateCycle={handleRateCycle}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </LayoutGroup>
  );
}
