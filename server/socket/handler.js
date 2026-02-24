import { runAgent, clearSession } from "../agent/designAgent.js";

export function setupSocketHandlers(io) {
  io.on("connection", (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Track if agent is currently processing for this socket
    let isProcessing = false;
    let abortController = null;

    socket.on("user_input", async (data) => {
      const { text, designState } = data;

      if (!text?.trim()) return;

      // If already processing, ignore (or handle interrupt)
      if (isProcessing) {
        console.log(`[Socket] Ignoring input, agent busy: "${text}"`);
        return;
      }

      isProcessing = true;
      abortController = new AbortController();

      console.log(`[Socket] User input: "${text}"`);

      // Emit thinking state
      socket.emit("agent_thinking", { text: "Thinking..." });

      try {
        const result = await runAgent(text, designState, socket.id);

        // Check if we were interrupted
        if (abortController.signal.aborted) {
          console.log(`[Socket] Agent was interrupted`);
          return;
        }

        // Send tool results (canvas updates) one by one for progressive rendering
        for (const toolResult of result.toolResults) {
          if (abortController.signal.aborted) break;

          if (toolResult.result) {
            console.log("📤 [Socket] Emitting tool_call to frontend:", {
              tool: toolResult.tool,
              result: toolResult.result,
            });
            socket.emit("tool_call", {
              tool: toolResult.tool,
              result: toolResult.result,
            });
          }
        }

        // Send agent's text response (for chat + TTS)
        socket.emit("agent_response", {
          text: result.text,
          speak: true,
        });
      } catch (error) {
        console.error(`[Socket] Agent error:`, error);
        socket.emit("agent_response", {
          text: "Sorry, something went wrong. Try again.",
          speak: true,
        });
        socket.emit("error", { message: error.message });
      } finally {
        isProcessing = false;
        abortController = null;
      }
    });

    socket.on("interrupt", () => {
      console.log(`[Socket] Interrupt received`);
      if (abortController) {
        abortController.abort();
      }
      isProcessing = false;
    });

    socket.on("clear_session", () => {
      clearSession(socket.id);
      console.log(`[Socket] Session cleared for ${socket.id}`);
    });

    socket.on("disconnect", () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
      clearSession(socket.id);
    });
  });
}
