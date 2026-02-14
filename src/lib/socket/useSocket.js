"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { io } from "socket.io-client";

export function useSocket({ onToolCall, onAgentResponse, onThinking, onError }) {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

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
      onToolCall?.(data);
    });

    socket.on("agent_response", (data) => {
      console.log("[Socket] Agent response:", data);
      onAgentResponse?.(data);
    });

    socket.on("agent_thinking", (data) => {
      onThinking?.(data);
    });

    socket.on("error", (data) => {
      console.error("[Socket] Error:", data);
      onError?.(data);
    });

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendInput = useCallback((text, designState) => {
    socketRef.current?.emit("user_input", { text, designState });
  }, []);

  const sendInterrupt = useCallback(() => {
    socketRef.current?.emit("interrupt");
  }, []);

  return { isConnected, sendInput, sendInterrupt };
}
