import { Circle, CircleHalf, List, Pause, Play, Stop } from "@phosphor-icons/react";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useSpeech } from "react-text-to-speech";
import { motion } from "motion/react";
import { Drawer } from "vaul";
import { useTheme } from "next-themes";
import { Equalizer } from "./equalizer";
import { RATES, extractText, springTap } from "../utils";
import { usePlum } from "../plum-context";

export interface MobileDrawerAction {
  label: string;
  icon: ReactNode;
  onClick: () => void;
}

interface MobileDrawerProps {
  articleHtml: string;
  actions: MobileDrawerAction[];
}

export function MobileDrawer({ articleHtml, actions }: MobileDrawerProps) {
  const { portalContainer, onOverlayChange } = usePlum();
  const [open, setOpen] = useState(false);

  const handleOpenChange = useCallback(
    (value: boolean) => {
      setOpen(value);
      onOverlayChange(value);
    },
    [onOverlayChange],
  );
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

  function handleRateCycle() {
    const currentIndex = RATES.indexOf(rate as (typeof RATES)[number]);
    const nextIndex = (currentIndex + 1) % RATES.length;
    setRate(RATES[nextIndex]);
  }

  function cycleTheme() {
    const next = { system: "light", light: "dark", dark: "system" } as const;
    setTheme(next[(theme as keyof typeof next) ?? "system"]);
  }

  const themeLabel = theme === "system" ? "System" : dark ? "Dark" : "Light";
  const themeIconWeight: "bold" | "fill" = theme === "system" ? "bold" : dark ? "fill" : "bold";
  const ThemeIcon = theme === "system" ? CircleHalf : Circle;

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
        onClick={() => handleOpenChange(true)}
        animate={{
          opacity: open ? 0 : 1,
          scale: open ? 0.9 : 1,
        }}
        transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
        whileTap={{ scale: 0.96, transition: springTap }}
        className="fixed bottom-[calc(1.5rem+var(--sai-bottom))] z-20 flex -translate-x-1/2 cursor-pointer items-center gap-2.5 rounded-full border border-white/[0.06] bg-drawer px-5 py-3 shadow-lg focus:outline-none"
        style={{ left: "50vw", pointerEvents: open ? "none" : "auto" }}
        aria-label="Open controls"
      >
        {isPlaying ? (
          <>
            <Equalizer height={14} barWidth="2.5px" color="bg-white" />
            <span className="text-[12px] font-medium tracking-wide text-white uppercase">
              Playing
            </span>
          </>
        ) : isActive ? (
          <>
            <Play size={15} weight="fill" className="text-white" />
            <span className="text-[12px] font-medium tracking-wide text-white uppercase">
              Paused
            </span>
          </>
        ) : (
          <>
            <List size={17} weight="bold" className="text-white" />
            <span className="text-[12px] font-medium tracking-wide text-white uppercase">Menu</span>
          </>
        )}
      </motion.button>

      {/* Drawer — dark surface */}
      <Drawer.Root open={open} onOpenChange={handleOpenChange} noBodyStyles>
        <Drawer.Portal container={portalContainer}>
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
                whileTap={{ scale: 0.96 }}
                transition={springTap}
                className="flex h-11 w-14 cursor-pointer items-center justify-center rounded-full text-[13px] font-semibold tabular-nums text-white/50 transition-colors hover:text-white/70 focus:outline-none"
                aria-label={`Speed: ${rate}x`}
              >
                {rate}x
              </motion.button>

              {/* Play/Pause */}
              <motion.button
                type="button"
                onClick={handlePlayPause}
                whileTap={{ scale: 0.96 }}
                transition={springTap}
                className="flex h-13 w-13 cursor-pointer items-center justify-center rounded-full bg-white text-black focus:outline-none"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause size={22} weight="fill" /> : <Play size={22} weight="fill" />}
              </motion.button>

              {/* Stop */}
              <motion.button
                type="button"
                onClick={stop}
                whileTap={{ scale: 0.96 }}
                transition={springTap}
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-white/45 transition-colors hover:text-white/60 focus:outline-none"
                aria-label="Stop"
              >
                <Stop size={18} weight="fill" />
              </motion.button>
            </div>

            {/* Separator */}
            <div className="mx-4 border-t border-white/10" />

            {/* Actions */}
            <div className="space-y-0.5 px-4 pt-2 pb-[calc(2.5rem+var(--sai-bottom))]">
              {actions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => {
                    stop();
                    handleOpenChange(false);
                    action.onClick();
                  }}
                  className="flex w-full cursor-pointer items-center gap-3.5 rounded-xl px-3 py-3 text-left text-white/60 transition-[color,background-color,scale] duration-150 ease-out active:scale-[0.98] active:bg-white/5"
                >
                  {action.icon}
                  <span className="text-[14px]">{action.label}</span>
                </button>
              ))}

              <button
                type="button"
                onClick={cycleTheme}
                className="flex w-full cursor-pointer items-center gap-3.5 rounded-xl px-3 py-3 text-left text-white/60 transition-[color,background-color,scale] duration-150 ease-out active:scale-[0.98] active:bg-white/5"
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
