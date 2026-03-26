import { Pause, Play, Stop } from "@phosphor-icons/react";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useEffect, useMemo, useState } from "react";
import { useSpeech } from "react-text-to-speech";
import { AnimatePresence, motion } from "motion/react";
import { Drawer } from "vaul";

const RATES = [0.75, 1, 1.25, 1.5, 2] as const;

const springTap = {
  type: "spring" as const,
  stiffness: 400,
  damping: 25,
};

function extractText(html: string): string {
  const el = document.createElement("div");
  el.innerHTML = html;
  return el.innerText;
}

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < breakpoint,
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    setIsMobile(mq.matches);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);

  return isMobile;
}

/** Three animated bars that bounce when playing */
function Equalizer({ paused, size = 14 }: { paused?: boolean; size?: number }) {
  const barWidth = Math.max(2, Math.round(size / 5));
  const gap = Math.max(2, Math.round(size / 6));

  return (
    <div className="flex items-end" style={{ height: size, gap }}>
      {[1, 2, 3].map((i) => (
        <motion.span
          key={i}
          className="rounded-full bg-white/80"
          style={{ width: barWidth }}
          animate={
            paused
              ? { height: barWidth }
              : { height: [barWidth, size, size * 0.4, size * 0.85, barWidth] }
          }
          transition={
            paused
              ? { duration: 0.3 }
              : { duration: 0.8 + i * 0.15, repeat: Infinity, ease: "easeInOut" }
          }
        />
      ))}
    </div>
  );
}

function PlayerPanel({
  speechStatus,
  rate,
  onPlayPause,
  onStop,
  onRateCycle,
  large,
}: {
  speechStatus: string;
  rate: number;
  onPlayPause: () => void;
  onStop: () => void;
  onRateCycle: () => void;
  large?: boolean;
}) {
  const isPaused = speechStatus === "paused";

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Status */}
      <div className="flex items-center gap-2.5">
        <Equalizer paused={isPaused} size={large ? 16 : 14} />
        <span className="text-[11px] font-medium tracking-widest text-white/40 uppercase">
          {isPaused ? "Paused" : "Playing"}
        </span>
      </div>

      {/* Controls — speed | play/pause | stop */}
      <div className="flex w-full items-center justify-between px-2">
        {/* Speed */}
        <motion.button
          type="button"
          onClick={onRateCycle}
          whileTap={{ scale: 0.93 }}
          whileHover={{ scale: 1.04 }}
          transition={springTap}
          className={
            large
              ? "flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-white/10 text-[15px] font-semibold tabular-nums text-white/60 transition-colors hover:bg-white/15 hover:text-white/80 focus:outline-none"
              : "flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-white/10 text-[13px] font-semibold tabular-nums text-white/60 transition-colors hover:bg-white/15 hover:text-white/80 focus:outline-none"
          }
          aria-label={`Speed: ${rate}x`}
        >
          {rate}x
        </motion.button>

        {/* Play / Pause */}
        <motion.button
          type="button"
          onClick={onPlayPause}
          whileTap={{ scale: 0.93 }}
          whileHover={{ scale: 1.03 }}
          transition={springTap}
          className={
            large
              ? "flex h-16 w-16 cursor-pointer items-center justify-center rounded-full bg-white text-black focus:outline-none"
              : "flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-white text-black focus:outline-none"
          }
          aria-label={speechStatus === "started" ? "Pause" : "Resume"}
        >
          {speechStatus === "started" ? (
            <Pause size={large ? 28 : 24} weight="fill" />
          ) : (
            <Play size={large ? 28 : 24} weight="fill" />
          )}
        </motion.button>

        {/* Stop */}
        <motion.button
          type="button"
          onClick={onStop}
          whileTap={{ scale: 0.93 }}
          whileHover={{ scale: 1.04 }}
          transition={springTap}
          className={
            large
              ? "flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white/60 transition-colors hover:bg-white/15 hover:text-white/80 focus:outline-none"
              : "flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white/60 transition-colors hover:bg-white/15 hover:text-white/80 focus:outline-none"
          }
          aria-label="Stop"
        >
          <Stop size={large ? 20 : 18} weight="fill" />
        </motion.button>
      </div>
    </div>
  );
}

interface TtsControlsProps {
  articleHtml: string;
}

export function TtsControls({ articleHtml }: TtsControlsProps) {
  const [rate, setRate] = useState(1);
  const text = useMemo(() => extractText(articleHtml), [articleHtml]);
  const isMobile = useIsMobile();

  const { speechStatus, start, pause, stop } = useSpeech({
    text,
    rate,
    stableText: true,
  });

  const isActive = speechStatus === "started" || speechStatus === "paused";

  function handlePlayPause() {
    if (speechStatus === "started") {
      pause();
    } else {
      start();
    }
  }

  function handleStop() {
    stop();
  }

  function handleRateCycle() {
    const currentIndex = RATES.indexOf(rate as (typeof RATES)[number]);
    const nextIndex = (currentIndex + 1) % RATES.length;
    setRate(RATES[nextIndex]);
  }

  function handleDrawerOpenChange(open: boolean) {
    if (!open) {
      stop();
    }
  }

  useHotkey("L", () => (isActive ? stop() : start()));

  useHotkey("Space", handlePlayPause, {
    enabled: isActive,
    preventDefault: true,
  });

  useHotkey("Escape", () => stop(), {
    enabled: isActive,
  });

  return (
    <>
      {/* Collapsed trigger */}
      <AnimatePresence>
        {!isActive && (
          <motion.button
            type="button"
            onClick={handlePlayPause}
            className="cursor-pointer p-2 text-muted transition-colors hover:text-foreground focus:outline-none"
            aria-label="Listen"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            whileTap={{ scale: 0.85 }}
          >
            <Play size={18} weight="fill" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Desktop: floating panel */}
      {!isMobile && (
        <AnimatePresence>
          {isActive && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.92 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              className="w-64 rounded-[24px] bg-black px-7 py-7 shadow-2xl"
            >
              <PlayerPanel
                speechStatus={speechStatus}
                rate={rate}
                onPlayPause={handlePlayPause}
                onStop={handleStop}
                onRateCycle={handleRateCycle}
              />
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Mobile: Vaul drawer */}
      {isMobile && (
        <Drawer.Root
          open={isActive}
          onOpenChange={handleDrawerOpenChange}
          modal={false}
          noBodyStyles
        >
          <Drawer.Portal>
            <Drawer.Content
              className="fixed inset-x-0 bottom-0 z-30 rounded-t-2xl bg-black px-6 pt-3 pb-10 shadow-2xl outline-none"
              aria-describedby={undefined}
            >
              <Drawer.Title className="sr-only">Audio Player</Drawer.Title>
              <Drawer.Handle className="mx-auto mb-5 h-1 w-8 rounded-full bg-white/20" />
              <PlayerPanel
                speechStatus={speechStatus}
                rate={rate}
                onPlayPause={handlePlayPause}
                onStop={handleStop}
                onRateCycle={handleRateCycle}
                large
              />
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      )}
    </>
  );
}
