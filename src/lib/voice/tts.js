/**
 * Smallest.AI TTS integration with browser SpeechSynthesis fallback.
 *
 * Usage:
 *   const { useVoiceOutput } = require('./tts');
 *   // In a component: const { speak, stop, isSpeaking } = useVoiceOutput();
 */

import { useState, useRef, useCallback, useEffect } from "react";

/**
 * Hook for voice output.
 * Tries Smallest.AI TTS first. Falls back to browser SpeechSynthesis.
 */
export function useVoiceOutput({ smallestAiKey, enabled = true } = {}) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef(null);
  const abortRef = useRef(null);

  const stop = useCallback(() => {
    // Stop Smallest.AI audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    // Abort in-flight fetch
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    // Stop browser TTS
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(
    async (text) => {
      if (!enabled || !text) return;

      // Stop any ongoing speech
      stop();

      const apiKey = smallestAiKey || process.env.NEXT_PUBLIC_SMALLEST_AI_API_KEY;

      // Try Smallest.AI TTS
      if (apiKey) {
        try {
          const controller = new AbortController();
          abortRef.current = controller;

          const res = await fetch("https://atoms-api.smallest.ai/api/v1/synthesize", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text,
              voice_id: "emily",
              sample_rate: 24000,
            }),
            signal: controller.signal,
          });

          if (res.ok) {
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audioRef.current = audio;

            setIsSpeaking(true);
            audio.onended = () => {
              setIsSpeaking(false);
              URL.revokeObjectURL(url);
            };
            audio.onerror = () => {
              setIsSpeaking(false);
              URL.revokeObjectURL(url);
            };
            await audio.play();
            return;
          }
        } catch (err) {
          if (err.name === "AbortError") return;
          console.warn("Smallest.AI TTS failed, falling back to browser TTS", err);
        }
      }

      // Fallback: browser SpeechSynthesis
      if (typeof window !== "undefined" && window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.1;
        utterance.pitch = 1;
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
      }
    },
    [enabled, smallestAiKey, stop]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => stop();
  }, [stop]);

  return { speak, stop, isSpeaking };
}
