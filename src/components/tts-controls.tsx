import clsx from "clsx";
import { Pause, Play, Stop } from "@phosphor-icons/react";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useMemo, useState } from "react";
import { useSpeech } from "react-text-to-speech";

const RATES = [0.75, 1, 1.25, 1.5, 2] as const;

const buttonBase =
  "shrink-0 cursor-pointer px-1 py-2 transition-colors focus:outline-none focus:ring-0 focus:shadow-none";
const buttonClass = `${buttonBase} text-muted hover:text-foreground`;
const activeClass = `${buttonBase} text-foreground`;

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

  function handlePlayPause() {
    if (speechStatus === "started") {
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

  const isActive = speechStatus === "started" || speechStatus === "paused";

  useHotkey("L", () => (isActive ? stop() : start()));

  useHotkey("Space", handlePlayPause, {
    enabled: isActive,
    preventDefault: true,
  });

  useHotkey("Escape", () => stop(), {
    enabled: isActive,
  });

  return (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        onClick={handlePlayPause}
        className={isActive ? activeClass : buttonClass}
        aria-label={
          speechStatus === "started" ? "Pause" : speechStatus === "paused" ? "Resume" : "Listen"
        }
      >
        {speechStatus === "started" ? (
          <Pause size={15} weight="fill" />
        ) : (
          <Play size={15} weight="fill" />
        )}
      </button>

      {isActive && (
        <button type="button" onClick={stop} className={buttonClass} aria-label="Stop">
          <Stop size={15} weight="fill" />
        </button>
      )}

      <button
        type="button"
        onClick={handleRateCycle}
        className={clsx("text-xs tabular-nums", isActive ? activeClass : buttonClass)}
        aria-label={`Speed: ${rate}x`}
      >
        {rate}x
      </button>
    </div>
  );
}
