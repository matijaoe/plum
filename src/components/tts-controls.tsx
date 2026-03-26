import clsx from "clsx";
import { Pause, Play, Stop, SpeakerHigh } from "@phosphor-icons/react";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useMemo, useState } from "react";
import { useSpeech } from "react-text-to-speech";

const RATES = [0.75, 1, 1.25, 1.5, 2] as const;

function extractText(html: string): string {
  const el = document.createElement("div");
  el.innerHTML = html;
  return el.innerText;
}

interface TtsControlsProps {
  articleHtml: string;
}

export function TtsControls({ articleHtml }: TtsControlsProps) {
  const [rate, setRate] = useState(1);
  const text = useMemo(() => extractText(articleHtml), [articleHtml]);

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

  useHotkey("L", () => (isActive ? stop() : start()));

  useHotkey("Space", handlePlayPause, {
    enabled: isActive,
    preventDefault: true,
  });

  useHotkey("Escape", () => stop(), {
    enabled: isActive,
  });

  // Collapsed: just a play button matching the app's muted style
  if (!isActive) {
    return (
      <button
        type="button"
        onClick={handlePlayPause}
        className="cursor-pointer p-2 text-muted transition-colors hover:text-foreground focus:outline-none"
        aria-label="Listen"
      >
        <Play size={18} weight="fill" />
      </button>
    );
  }

  // Expanded: black panel
  return (
    <div className="flex w-52 flex-col items-center gap-5 rounded-[22px] bg-black px-6 py-5 shadow-2xl">
      {/* Status */}
      <div className="flex items-center gap-2">
        <SpeakerHigh size={14} weight="fill" className="text-white/35" />
        <span className="text-[11px] font-medium tracking-widest text-white/35 uppercase">
          {speechStatus === "started" ? "Playing" : "Paused"}
        </span>
      </div>

      {/* Controls — speed | play/pause | stop */}
      <div className="flex w-full items-center justify-between">
        <button
          type="button"
          onClick={handleRateCycle}
          className={clsx(
            "flex h-9 w-9 cursor-pointer items-center justify-center",
            "text-[13px] font-medium tabular-nums text-white/50",
            "transition-colors hover:text-white/80 focus:outline-none",
          )}
          aria-label={`Speed: ${rate}x`}
        >
          {rate}x
        </button>

        <button
          type="button"
          onClick={handlePlayPause}
          className={clsx(
            "flex h-12 w-12 cursor-pointer items-center justify-center",
            "rounded-full bg-white text-black",
            "transition-colors hover:bg-white/90 focus:outline-none",
          )}
          aria-label={speechStatus === "started" ? "Pause" : "Resume"}
        >
          {speechStatus === "started" ? (
            <Pause size={22} weight="fill" />
          ) : (
            <Play size={22} weight="fill" className="translate-x-[1px]" />
          )}
        </button>

        <button
          type="button"
          onClick={handleStop}
          className={clsx(
            "flex h-9 w-9 cursor-pointer items-center justify-center",
            "rounded-full bg-white/10 text-white/60",
            "transition-colors hover:bg-white/15 hover:text-white/80 focus:outline-none",
          )}
          aria-label="Stop"
        >
          <Stop size={16} weight="fill" />
        </button>
      </div>
    </div>
  );
}
