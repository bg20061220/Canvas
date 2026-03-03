"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import CanvasRenderer from "@/src/components/canvas/CanvasRenderer";
import useDesignStore from "@/src/stores/designStore";
import { useSocket } from "@/src/lib/socket/useSocket";

export default function Home() {
  const [textInput, setTextInput] = useState("");
  const [status, setStatus] = useState("idle");
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);

  const addComponent = useDesignStore((s) => s.addComponent);
  const updateComponent = useDesignStore((s) => s.updateComponent);
  const removeComponent = useDesignStore((s) => s.removeComponent);
  const undo = useDesignStore((s) => s.undo);
  const clearCanvas = useDesignStore((s) => s.clearCanvas);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Add message to chat
  const addMessage = useCallback((role, text) => {
    setMessages((prev) => [...prev, { role, text, timestamp: Date.now() }]);
  }, []);

  // Handle tool calls from agent
  const handleToolCall = useCallback(
    (data) => {
      console.log("🟣 [Frontend] Received tool_call from backend:", data);

      const { result } = data;
      if (!result) {
        console.log("❌ [Frontend] No result in tool_call data!");
        return;
      }

      console.log("🟣 [Frontend] Processing action:", result.action);

      switch (result.action) {
        case "add_component":
          console.log("🟣 [Frontend] Adding component to store:", result.component);
          addComponent(result.component);
          break;
        case "update_component":
          updateComponent(result.componentId, result.changes);
          break;
        case "delete_component":
          removeComponent(result.componentId);
          break;
        case "undo":
          undo();
          break;
        case "clear_canvas":
          clearCanvas();
          break;
        default:
          console.log("⚠️ [Frontend] Unknown action:", result.action);
      }
    },
    [addComponent, updateComponent, removeComponent, undo, clearCanvas]
  );

  // Handle agent text response
  const handleAgentResponse = useCallback(
    (data) => {
      addMessage("agent", data.text);
      setStatus("idle");
    },
    [addMessage]
  );

  // Handle agent thinking
  const handleThinking = useCallback(() => {
    setStatus("processing");
  }, []);

  // Handle errors
  const handleError = useCallback(
    (data) => {
      addMessage("agent", `Error: ${data.message}`);
      setStatus("idle");
    },
    [addMessage]
  );

  // Socket.IO connection
  const { isConnected, sendInput, sendInterrupt } = useSocket({
    onToolCall: handleToolCall,
    onAgentResponse: handleAgentResponse,
    onThinking: handleThinking,
    onError: handleError,
  });

  // Get current design state to send with each request
  const getDesignState = useCallback(() => {
    const state = useDesignStore.getState();
    return {
      components: state.components,
      theme: state.theme,
      context: state.context,
    };
  }, []);

  // Handle text submit
  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (!textInput.trim()) return;

    const designState = getDesignState();
    console.log("🔵 [Frontend] Sending to backend:", {
      text: textInput,
      designState,
    });

    addMessage("user", textInput);
    setStatus("processing");
    sendInput(textInput, designState);
    setTextInput("");
  };

  return (
    <div className="flex flex-col h-screen">
      {/* ─── Header ─── */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-gray-800 bg-[#0d0d1f] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3z"
              />
            </svg>
          </div>
          <h1 className="text-lg font-semibold">Voice Canvas</h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div
              className={`w-2 h-2 rounded-full ${
                !isConnected
                  ? "bg-orange-500"
                  : status === "processing"
                  ? "bg-yellow-500 animate-pulse"
                  : "bg-green-500"
              }`}
            />
            {!isConnected
              ? "Connecting..."
              : status === "processing"
              ? "Processing..."
              : "Ready"}
          </div>
        </div>
      </header>

      {/* ─── Main: Canvas (left) + Chat (right) ─── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ─── Canvas Panel (left) ─── */}
        <main className="flex-1 overflow-y-auto bg-[#0a0a1a] border-r border-gray-800">
          <CanvasRenderer />
        </main>

        {/* ─── Chat Panel (right sidebar) ─── */}
        <aside className="w-[380px] flex flex-col bg-[#0d0d1f] shrink-0">
          {/* Chat header */}
          <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0zm4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0zm4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0z"
              />
            </svg>
            <span className="text-sm font-medium text-gray-300">Chat</span>
            {isConnected && (
              <span className="ml-auto text-xs text-green-500">Connected</span>
            )}
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-gray-600 text-sm text-center px-4">
                <svg
                  className="w-10 h-10 mb-3 opacity-30"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
                  />
                </svg>
                <p>Type a message to get started</p>
                <p className="text-gray-700 mt-1">
                  Try: &quot;Create a hero section&quot;
                </p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-br-md"
                      : "bg-[#1a1a2e] text-gray-300 border border-gray-800 rounded-bl-md"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {status === "processing" && (
              <div className="flex justify-start">
                <div className="bg-[#1a1a2e] border border-gray-800 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1.5">
                    <span
                      className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="px-4 py-3 border-t border-gray-800">
            <form onSubmit={handleTextSubmit} className="flex items-center gap-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type a command... (e.g., 'Create a hero section')"
                disabled={status === "processing"}
                className="flex-1 bg-[#12122a] border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors disabled:opacity-50"
              />

              <button
                type="submit"
                disabled={status === "processing" || !textInput.trim()}
                className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors"
              >
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12zm0 0h7.5"
                  />
                </svg>
              </button>
            </form>
          </div>
        </aside>
      </div>
    </div>
  );
}
