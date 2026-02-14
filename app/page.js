"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import MicButton from "@/src/components/voice/MicButton";
import CanvasRenderer from "@/src/components/canvas/CanvasRenderer";
import { useVoiceInput } from "@/src/lib/voice/stt";
import { useVoiceOutput } from "@/src/lib/voice/tts";
import useDesignStore from "@/src/stores/designStore";
import { useSocket } from "@/src/lib/socket/useSocket";

export default function Home() {
  const [textInput, setTextInput] = useState("");
  const [status, setStatus] = useState("idle");
  const [messages, setMessages] = useState([]);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const messagesEndRef = useRef(null);

  const addComponent = useDesignStore((s) => s.addComponent);
  const updateComponent = useDesignStore((s) => s.updateComponent);
  const removeComponent = useDesignStore((s) => s.removeComponent);
  const undo = useDesignStore((s) => s.undo);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // TTS hook
  const { speak, stop: stopSpeaking, isSpeaking } = useVoiceOutput({
    enabled: voiceEnabled,
  });

  // Add message to chat
  const addMessage = useCallback((role, text) => {
    setMessages((prev) => [...prev, { role, text, timestamp: Date.now() }]);
  }, []);

  // Handle tool calls from agent
  const handleToolCall = useCallback(
    (data) => {
      const { result } = data;
      if (!result) return;

      switch (result.action) {
        case "add_component":
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
      }
    },
    [addComponent, updateComponent, removeComponent, undo]
  );

  // Handle agent text response
  const handleAgentResponse = useCallback(
    (data) => {
      addMessage("agent", data.text);
      setStatus("idle");

      if (data.speak && voiceEnabled) {
        speak(data.text);
      }
    },
    [addMessage, speak, voiceEnabled]
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

  // Handle completed transcription
  const handleTranscript = useCallback(
    (text) => {
      if (!text.trim()) return;
      setTextInput("");
      addMessage("user", text);
      setStatus("processing");

      // Send to agent via Socket.IO
      sendInput(text, getDesignState());
    },
    [addMessage, sendInput, getDesignState]
  );

  // STT hook
  const {
    isListening,
    transcript,
    error: sttError,
    startListening,
    stopListening,
  } = useVoiceInput({ onTranscript: handleTranscript });

  // Toggle mic
  const handleMicClick = () => {
    if (isListening) {
      stopListening();
      setStatus("processing");
    } else {
      // Interrupt agent if speaking
      if (isSpeaking) {
        stopSpeaking();
        sendInterrupt();
      }
      startListening();
      setStatus("listening");
    }
  };

  // Handle text submit
  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    handleTranscript(textInput);
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
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              voiceEnabled
                ? "border-blue-500/50 text-blue-400 bg-blue-500/10"
                : "border-gray-700 text-gray-500"
            }`}
          >
            {voiceEnabled ? "Voice On" : "Voice Off"}
          </button>

          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div
              className={`w-2 h-2 rounded-full ${
                !isConnected
                  ? "bg-orange-500"
                  : status === "listening"
                  ? "bg-red-500 animate-pulse"
                  : status === "processing"
                  ? "bg-yellow-500 animate-pulse"
                  : status === "speaking"
                  ? "bg-blue-500 animate-pulse"
                  : "bg-green-500"
              }`}
            />
            {!isConnected
              ? "Connecting..."
              : status === "listening"
              ? "Listening..."
              : status === "processing"
              ? "Processing..."
              : status === "speaking"
              ? "Speaking..."
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
            <span className="text-sm font-medium text-gray-300">Voice Chat</span>
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
                    d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3z"
                  />
                </svg>
                <p>Click the mic or type a message</p>
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
            {sttError && (
              <p className="text-red-400 text-xs mb-2">Mic error: {sttError}</p>
            )}

            <form onSubmit={handleTextSubmit} className="flex items-center gap-2">
              <MicButton
                isListening={isListening}
                onClick={handleMicClick}
                disabled={status === "processing"}
              />

              <input
                type="text"
                value={isListening ? transcript || "Listening..." : textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Ask me to create something..."
                readOnly={isListening}
                className={`flex-1 bg-[#12122a] border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors ${
                  isListening ? "border-red-500/50 text-gray-300" : ""
                }`}
              />

              <button
                type="submit"
                disabled={isListening || !textInput.trim()}
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
