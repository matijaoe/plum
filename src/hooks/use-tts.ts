import { useCallback, useEffect, useRef, useState } from "react";
import { splitIntoChunks } from "../tts-utils";

export type TtsStatus = "idle" | "speaking" | "paused";

interface Queue {
  chunks: string[];
  index: number;
  cancelled: boolean;
}

const SUPPORTED = typeof window !== "undefined" && "speechSynthesis" in window;

export function useTts() {
  const [status, setStatus] = useState<TtsStatus>("idle");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [rate, setRate] = useState(1);

  const queueRef = useRef<Queue>({ chunks: [], index: 0, cancelled: true });
  const rateRef = useRef(rate);
  const voiceRef = useRef(selectedVoice);

  // Plain function stored in a ref — no hook ordering concerns,
  // always has access to current refs.
  const speakChunkAt = useRef((index: number) => {
    const queue = queueRef.current;
    queue.index = index;
    if (queue.cancelled || index >= queue.chunks.length) {
      setStatus("idle");
      return;
    }

    const utterance = new SpeechSynthesisUtterance(queue.chunks[index]);
    if (voiceRef.current) {
      utterance.voice = voiceRef.current;
    }
    utterance.rate = rateRef.current;

    utterance.onend = () => {
      speakChunkAt.current(index + 1);
    };

    utterance.onerror = (e) => {
      if (e.error !== "interrupted" && e.error !== "canceled") {
        setStatus("idle");
      }
    };

    speechSynthesis.speak(utterance);
  });

  // Load voices
  useEffect(() => {
    if (!SUPPORTED) {
      return;
    }

    let loaded = false;

    function loadVoices() {
      const available = speechSynthesis.getVoices();
      if (available.length === 0 || loaded) {
        return;
      }
      loaded = true;
      setVoices(available);
      if (!voiceRef.current) {
        const english = available.find((v) => v.lang.startsWith("en"));
        const voice = english ?? available[0] ?? null;
        voiceRef.current = voice;
        setSelectedVoice(voice);
      }
    }

    loadVoices();
    speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => {
      speechSynthesis.removeEventListener("voiceschanged", loadVoices);
    };
  }, []);

  const speak = useCallback((text: string) => {
    if (!SUPPORTED || !text.trim()) {
      return;
    }
    speechSynthesis.cancel();
    const chunks = splitIntoChunks(text);
    if (chunks.length === 0) {
      return;
    }
    queueRef.current = { chunks, index: 0, cancelled: false };
    setStatus("speaking");
    speakChunkAt.current(0);
  }, []);

  const pause = useCallback(() => {
    if (!SUPPORTED) {
      return;
    }
    speechSynthesis.pause();
    setStatus("paused");
  }, []);

  const resume = useCallback(() => {
    if (!SUPPORTED) {
      return;
    }
    speechSynthesis.resume();
    setStatus("speaking");
  }, []);

  const stop = useCallback(() => {
    if (!SUPPORTED) {
      return;
    }
    queueRef.current.cancelled = true;
    speechSynthesis.cancel();
    setStatus("idle");
  }, []);

  const updateRate = useCallback((newRate: number) => {
    rateRef.current = newRate;
    setRate(newRate);
    // If currently speaking, restart the current chunk at the new rate
    const queue = queueRef.current;
    if (SUPPORTED && !queue.cancelled && queue.index < queue.chunks.length) {
      speechSynthesis.cancel();
      speakChunkAt.current(queue.index);
    }
  }, []);

  const updateVoice = useCallback((voice: SpeechSynthesisVoice | null) => {
    voiceRef.current = voice;
    setSelectedVoice(voice);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (SUPPORTED) {
        queueRef.current.cancelled = true;
        speechSynthesis.cancel();
      }
    };
  }, []);

  return {
    speak,
    pause,
    resume,
    stop,
    status,
    supported: SUPPORTED,
    voices,
    selectedVoice,
    setSelectedVoice: updateVoice,
    rate,
    setRate: updateRate,
  } as const;
}
