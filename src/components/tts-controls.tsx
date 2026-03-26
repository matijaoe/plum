import { Pause, Play, Stop } from "@phosphor-icons/react";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useEffect, useMemo, useState } from "react";
import { useSpeech } from "react-text-to-speech";
import { AnimatePresence, motion, LayoutGroup } from "motion/react";
import { Drawer } from "vaul";

const RATES = [0.75, 1, 1.25, 1.5, 2] as const;

const spring = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
};

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

function PlayerControls({
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
  return (
    <div className="grid w-full grid-cols-3 items-center">
      {/* Left — speed */}
      <div className="flex justify-start">
        <motion.button
          type="button"
          onClick={onRateCycle}
          whileTap={{ scale: 0.93 }}
          transition={springTap}
          className={
            large
              ? "flex h-11 cursor-pointer items-center justify-center rounded-full px-3 text-[13px] font-semibold tabular-nums text-white/45 transition-colors hover:bg-white/10 hover:text-white/70 focus:outline-none"
              : "flex h-9 cursor-pointer items-center justify-center rounded-full px-2.5 text-[12px] font-semibold tabular-nums text-white/45 transition-colors hover:bg-white/10 hover:text-white/70 focus:outline-none"
          }
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
          whileTap={{ scale: 0.93 }}
          whileHover={{ scale: 1.03 }}
          transition={springTap}
          className={
            large
              ? "flex h-13 w-13 cursor-pointer items-center justify-center rounded-full bg-white text-black focus:outline-none"
              : "flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-white text-black focus:outline-none"
          }
          aria-label={speechStatus === "started" ? "Pause" : "Resume"}
        >
          {speechStatus === "started" ? (
            <Pause size={large ? 24 : 20} weight="fill" />
          ) : (
            <Play size={large ? 24 : 20} weight="fill" />
          )}
        </motion.button>
      </div>

      {/* Right — stop */}
      <div className="flex justify-end">
        <motion.button
          type="button"
          onClick={onStop}
          whileTap={{ scale: 0.93 }}
          transition={springTap}
          className={
            large
              ? "flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/10 hover:text-white/70 focus:outline-none"
              : "flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/10 hover:text-white/70 focus:outline-none"
          }
          aria-label="Stop"
        >
          <Stop size={large ? 18 : 16} weight="fill" />
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

  // Desktop: single morphing element using layoutId
  if (!isMobile) {
    return (
      <LayoutGroup>
        <AnimatePresence mode="wait">
          {!isActive ? (
            /* Compact bar — idle state */
            <motion.button
              key="compact"
              layoutId="player"
              type="button"
              onClick={handlePlayPause}
              className="flex cursor-pointer items-center gap-2 rounded-full bg-player  px-3.5 py-2 shadow-lg focus:outline-none"
              aria-label="Listen"
              transition={spring}
              whileTap={{ scale: 0.95 }}
            >
              <span className="flex items-center gap-2 text-white/50 transition-colors hover:text-white/70">
                <Play size={14} weight="fill" />
                <span className="text-[11px] font-medium tracking-wide uppercase">Listen</span>
              </span>
            </motion.button>
          ) : (
            /* Expanded panel — playing state */
            <motion.div
              key="expanded"
              layoutId="player"
              className="flex w-64 flex-col gap-4 rounded-2xl bg-player  px-5 py-5 shadow-2xl"
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

  // Mobile: Vaul drawer
  return (
    <>
      <motion.button
        type="button"
        onClick={handlePlayPause}
        className="flex cursor-pointer items-center gap-2 rounded-full bg-player  px-3.5 py-2 text-white/50 shadow-lg transition-colors hover:text-white/70 focus:outline-none"
        aria-label="Listen"
        whileTap={{ scale: 0.95 }}
        transition={springTap}
      >
        <Play size={14} weight="fill" />
        <span className="text-[11px] font-medium tracking-wide uppercase">
          {speechStatus === "started" ? "Playing" : speechStatus === "paused" ? "Paused" : "Listen"}
        </span>
      </motion.button>

      <Drawer.Root open={isActive} onOpenChange={handleDrawerOpenChange} modal={false} noBodyStyles>
        <Drawer.Portal>
          <Drawer.Content
            className="fixed inset-x-0 bottom-0 z-30 rounded-t-2xl bg-player  px-6 pt-3 pb-10 shadow-2xl outline-none"
            aria-describedby={undefined}
          >
            <Drawer.Title className="sr-only">Audio Player</Drawer.Title>
            <Drawer.Handle className="mx-auto mb-5 h-1 w-8 rounded-full bg-white/20" />

            <PlayerControls
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
    </>
  );
}
