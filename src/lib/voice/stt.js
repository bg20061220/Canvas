/**
 * Smallest.AI STT integration with browser SpeechRecognition fallback.
 *
 * Usage:
 *   const { useVoiceInput } = require('./stt');
 *   // In a component: const { isListening, transcript, startListening, stopListening } = useVoiceInput();
 */

import { useState, useRef, useCallback, useEffect } from "react";

// ─── Browser SpeechRecognition fallback ───
function getBrowserRecognition() {
  if (typeof window === "undefined") return null;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  return SR ? new SR() : null;
}

/**
 * Hook for voice input.
 * Tries Smallest.AI STT first. Falls back to browser SpeechRecognition API.
 */
export function useVoiceInput({ onTranscript, smallestAiKey } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  // ─── Smallest.AI STT via REST ───
  const transcribeWithSmallestAI = useCallback(
    async (audioBlob) => {
      const apiKey = smallestAiKey || process.env.NEXT_PUBLIC_SMALLEST_AI_API_KEY;
      if (!apiKey) return null;

      try {
        const formData = new FormData();
        formData.append("file", audioBlob, "audio.webm");
        formData.append("model", "whisper-v2");
        formData.append("language", "en");

        const res = await fetch("https://atoms-api.smallest.ai/api/v1/transcribe", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` },
          body: formData,
        });

        if (!res.ok) return null;
        const data = await res.json();
        return data.text || data.transcript || null;
      } catch {
        return null;
      }
    },
    [smallestAiKey]
  );

  // ─── Start listening ───
  const startListening = useCallback(async () => {
    setError(null);
    setTranscript("");

    const apiKey = smallestAiKey || process.env.NEXT_PUBLIC_SMALLEST_AI_API_KEY;

    // Try MediaRecorder + Smallest.AI path
    if (apiKey && navigator.mediaDevices) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        chunksRef.current = [];
        const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          const text = await transcribeWithSmallestAI(blob);
          if (text) {
            setTranscript(text);
            onTranscript?.(text);
          } else {
            setError("Transcription failed, try again");
          }
          setIsListening(false);
        };

        recorder.start();
        setIsListening(true);
        return;
      } catch (err) {
        console.warn("MediaRecorder failed, falling back to browser STT", err);
      }
    }

    // Fallback: browser SpeechRecognition
    const recognition = getBrowserRecognition();
    if (!recognition) {
      setError("No speech recognition available. Check microphone permissions.");
      return;
    }

    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let final = "";
      let interim = "";
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      const text = final || interim;
      setTranscript(text);
      if (final) {
        onTranscript?.(final);
      }
    };

    recognition.onerror = (event) => {
      setError(event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
    setIsListening(true);
  }, [smallestAiKey, onTranscript, transcribeWithSmallestAI]);

  // ─── Stop listening ───
  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      return; // onstop handler sets isListening to false
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  return { isListening, transcript, error, startListening, stopListening };
}
