import clsx from "clsx";
import { useMemo } from "react";
import { useTts } from "../hooks/use-tts";
import { extractTextFromHtml } from "../tts-utils";

const RATES = [0.75, 1, 1.25, 1.5, 2] as const;

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6 19h4V5H6zm8-14v14h4V5z" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6 6h12v12H6z" />
    </svg>
  );
}

const buttonClass =
  "shrink-0 cursor-pointer text-sm text-neutral-500 transition-colors hover:text-neutral-900 dark:hover:text-neutral-100";
const activeClass =
  "shrink-0 cursor-pointer text-sm text-neutral-900 transition-colors hover:text-neutral-900 dark:text-neutral-100 dark:hover:text-neutral-100";

interface TtsControlsProps {
  articleHtml: string;
}

export function TtsControls({ articleHtml }: TtsControlsProps) {
  const { speak, pause, resume, stop, status, supported, rate, setRate } = useTts();

  const text = useMemo(() => extractTextFromHtml(articleHtml), [articleHtml]);

  if (!supported) {
    return null;
  }

  function handlePlayPause() {
    if (status === "idle") {
      speak(text);
    } else if (status === "speaking") {
      pause();
    } else {
      resume();
    }
  }

  function handleRateCycle() {
    const currentIndex = RATES.indexOf(rate as (typeof RATES)[number]);
    const nextIndex = (currentIndex + 1) % RATES.length;
    setRate(RATES[nextIndex]);
  }

  const isActive = status !== "idle";

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={handlePlayPause}
        className={isActive ? activeClass : buttonClass}
        aria-label={status === "speaking" ? "Pause" : status === "paused" ? "Resume" : "Listen"}
      >
        {status === "speaking" ? <PauseIcon /> : <PlayIcon />}
      </button>

      {isActive && (
        <button type="button" onClick={stop} className={buttonClass} aria-label="Stop">
          <StopIcon />
        </button>
      )}

      <button
        type="button"
        onClick={handleRateCycle}
        className={clsx("tabular-nums", isActive ? activeClass : buttonClass)}
        aria-label={`Speed: ${rate}x`}
      >
        {rate}x
      </button>
    </div>
  );
}
