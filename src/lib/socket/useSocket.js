"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { io } from "socket.io-client";

export function useSocket({ onToolCall, onAgentResponse, onThinking, onError }) {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  // Keep callback refs up to date so socket listeners always call the latest version
  const onToolCallRef = useRef(onToolCall);
  const onAgentResponseRef = useRef(onAgentResponse);
  const onThinkingRef = useRef(onThinking);
  const onErrorRef = useRef(onError);

  useEffect(() => { onToolCallRef.current = onToolCall; }, [onToolCall]);
  useEffect(() => { onAgentResponseRef.current = onAgentResponse; }, [onAgentResponse]);
  useEffect(() => { onThinkingRef.current = onThinking; }, [onThinking]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  useEffect(() => {
    const socket = io({
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Socket] Connected:", socket.id);
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("[Socket] Disconnected");
      setIsConnected(false);
    });

    socket.on("tool_call", (data) => {
      console.log("[Socket] Tool call:", data);
      onToolCallRef.current?.(data);
    });

    socket.on("agent_response", (data) => {
      console.log("[Socket] Agent response:", data);
      onAgentResponseRef.current?.(data);
    });

    socket.on("agent_thinking", (data) => {
      onThinkingRef.current?.(data);
    });

    socket.on("error", (data) => {
      console.error("[Socket] Error:", data);
      onErrorRef.current?.(data);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const sendInput = useCallback((text, designState) => {
    socketRef.current?.emit("user_input", { text, designState });
  }, []);

  const sendInterrupt = useCallback(() => {
    socketRef.current?.emit("interrupt");
  }, []);

  return { isConnected, sendInput, sendInterrupt };
}
