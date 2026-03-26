import { Circle, CircleHalf, List, Pause, Play, Plus, Stop } from "@phosphor-icons/react";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useMemo, useState } from "react";
import { useSpeech } from "react-text-to-speech";
import { motion } from "motion/react";
import { Drawer } from "vaul";
import { useTheme } from "next-themes";

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

/** Animated equalizer bars — plays a looping CSS animation. */
function Equalizer() {
  return (
    <div className="flex items-end gap-[3px]" style={{ height: 14 }}>
      {[0.8, 0.55, 0.7].map((duration, i) => (
        <div
          key={i}
          className="w-[2.5px] rounded-full bg-white"
          style={{
            height: "100%",
            transformOrigin: "bottom",
            animation: `eq-bar ${duration}s ease-in-out ${i * 0.15}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

interface MobileDrawerProps {
  articleHtml: string;
  onClear: () => void;
}

export function MobileDrawer({ articleHtml, onClear }: MobileDrawerProps) {
  const [open, setOpen] = useState(false);
  const [rate, setRate] = useState(1);
  const text = useMemo(() => extractText(articleHtml), [articleHtml]);
  const { speechStatus, start, pause, stop } = useSpeech({
    text,
    rate,
    stableText: true,
  });
  const { theme, setTheme, resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  const isPlaying = speechStatus === "started";
  const isActive = isPlaying || speechStatus === "paused";

  function handlePlayPause() {
    if (isPlaying) {
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

  function cycleTheme() {
    const next = { system: "light", light: "dark", dark: "system" } as const;
    setTheme(next[(theme as keyof typeof next) ?? "system"]);
  }

  function handleReadNew() {
    stop();
    setOpen(false);
    onClear();
  }

  const themeLabel = theme === "system" ? "System" : dark ? "Dark" : "Light";
  const themeIconWeight: "bold" | "fill" = theme === "system" ? "bold" : dark ? "fill" : "bold";
  const ThemeIcon = theme === "system" ? CircleHalf : Circle;

  // Hotkeys
  useHotkey("L", () => (isActive ? stop() : start()));
  useHotkey("Space", handlePlayPause, {
    enabled: isActive,
    preventDefault: true,
  });
  useHotkey("Escape", () => stop(), { enabled: isActive });

  return (
    <>
      {/* Floating pill — centered, Dynamic Island style */}
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        whileTap={{ scale: 0.95 }}
        transition={springTap}
        className="fixed bottom-6 left-1/2 z-20 flex -translate-x-1/2 cursor-pointer items-center gap-2.5 rounded-full bg-drawer px-4 py-2.5 shadow-lg focus:outline-none"
        aria-label="Open controls"
      >
        {isPlaying ? (
          <>
            <Equalizer />
            <span className="text-[11px] font-medium tracking-wide text-white uppercase">
              Playing
            </span>
          </>
        ) : isActive ? (
          <>
            <Play size={13} weight="fill" className="text-white" />
            <span className="text-[11px] font-medium tracking-wide text-white uppercase">
              Paused
            </span>
          </>
        ) : (
          <>
            <List size={15} weight="bold" className="text-white" />
            <span className="text-[11px] font-medium tracking-wide text-white uppercase">Menu</span>
          </>
        )}
      </motion.button>

      {/* Drawer — dark surface */}
      <Drawer.Root open={open} onOpenChange={setOpen} noBodyStyles>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-30 bg-black/40" />
          <Drawer.Content
            className="fixed inset-x-0 bottom-0 z-30 rounded-t-2xl bg-drawer outline-none"
            aria-describedby={undefined}
          >
            <Drawer.Title className="sr-only">Controls</Drawer.Title>

            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-8 rounded-full bg-white/15" />
            </div>

            {/* Player controls */}
            <div className="flex items-center justify-center gap-6 py-5">
              {/* Speed */}
              <motion.button
                type="button"
                onClick={handleRateCycle}
                whileTap={{ scale: 0.93 }}
                transition={springTap}
                className="flex h-11 w-14 cursor-pointer items-center justify-center rounded-full text-[13px] font-semibold tabular-nums text-white/40 transition-colors hover:text-white/70 focus:outline-none"
                aria-label={`Speed: ${rate}x`}
              >
                {rate}x
              </motion.button>

              {/* Play/Pause */}
              <motion.button
                type="button"
                onClick={handlePlayPause}
                whileTap={{ scale: 0.93 }}
                transition={springTap}
                className="flex h-13 w-13 cursor-pointer items-center justify-center rounded-full bg-white text-black focus:outline-none"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause size={22} weight="fill" /> : <Play size={22} weight="fill" />}
              </motion.button>

              {/* Stop */}
              <motion.button
                type="button"
                onClick={handleStop}
                whileTap={{ scale: 0.93 }}
                transition={springTap}
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-white/35 transition-colors hover:text-white/60 focus:outline-none"
                aria-label="Stop"
              >
                <Stop size={18} weight="fill" />
              </motion.button>
            </div>

            {/* Separator */}
            <div className="mx-4 border-t border-white/10" />

            {/* Actions */}
            <div className="space-y-0.5 px-4 pt-2 pb-10">
              <button
                type="button"
                onClick={handleReadNew}
                className="flex w-full cursor-pointer items-center gap-3.5 rounded-xl px-3 py-3 text-left text-white/60 transition-colors active:bg-white/5"
              >
                <Plus size={18} weight="bold" />
                <span className="text-[14px]">Read new article</span>
              </button>

              <button
                type="button"
                onClick={cycleTheme}
                className="flex w-full cursor-pointer items-center gap-3.5 rounded-xl px-3 py-3 text-left text-white/60 transition-colors active:bg-white/5"
              >
                <ThemeIcon size={18} weight={themeIconWeight} />
                <span className="text-[14px]">Appearance</span>
                <span className="ml-auto text-[12px] text-white/30">{themeLabel}</span>
              </button>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}
