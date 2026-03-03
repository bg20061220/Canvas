# Voice Canvas - Build Progress

## Phase 1: Voice Pipeline + Foundation - COMPLETE

**Project Structure:**
```
Canvas/
  app/
    layout.js          - Root layout, dark theme, Inter font
    page.js            - Main page: header + canvas + input bar + mic
    globals.css        - Tailwind + animations (pulse, fade-in)
  src/
    components/
      canvas/
        CanvasRenderer.js   - Reads Zustand store, renders components
        RenderComponent.js  - Maps types → React (button, text, card, input, container, form, navbar, image, divider)
      voice/
        MicButton.js        - Mic button with listening/idle states + pulse animation
    lib/
      voice/
        stt.js              - useVoiceInput hook (Smallest.AI STT → browser SpeechRecognition fallback)
        tts.js              - useVoiceOutput hook (Smallest.AI TTS → browser SpeechSynthesis fallback)
    stores/
      designStore.js        - Zustand store (components, theme, context, history, undo/redo)
```

**What works right now (run `npm run dev`):**
- Dark-themed canvas page at `localhost:3000`
- Mic button captures voice → transcribes via Smallest.AI (or browser fallback)
- Transcribed text shows in input bar
- Text input also works (type + Send)
- TTS ready to speak agent responses
- Canvas renderer ready to display components from the store
- Status indicators: Listening / Processing / Ready

**What's wired but waiting for Phase 2:** Voice/text input → Socket.IO → Mastra agent → canvas updates. Right now it shows "Agent not connected yet" as a placeholder.

---

## Phase 2: Agent + Text-to-Canvas Pipeline - COMPLETE ✅

**Architecture Changes:**
- ❌ **Removed Mastra framework** - too complex, using AI SDK directly
- ❌ **Removed voice features** - focusing on text-only MVP for stability
- ✅ **Manual JSON parsing** - LLM outputs JSON, we parse and execute tools manually
- ✅ **Tailwind v3** - downgraded from v4 for stability (hover variants work)
- ✅ **LocalStorage persistence** - designs survive page refresh

**New Files:**
```
server.js                        - Custom Node.js server wrapping Next.js + Socket.IO
server/
  agent/
    designAgent.js               - AI agent using Vercel AI SDK + Groq (Llama 3.3 70B)
                                   - Manual JSON parsing (no structured tool calling)
                                   - System prompt with Tailwind color palette
                                   - Conversation history per session (last 20 msgs)
  tools/
    designTools.js               - 6 plain functions (no Mastra wrappers):
                                   - createComponent, createForm, createSection
                                   - modifyComponent, deleteComponent, undoAction
  socket/
    handler.js                   - Socket.IO event handlers with debug logging
src/lib/socket/
  useSocket.js                   - Client hook: connect, sendInput, sendInterrupt
tailwind.config.js               - Tailwind v3 config with content paths
postcss.config.mjs               - PostCSS with tailwindcss + autoprefixer
```

**Modified Files:**
```
app/page.js                      - Text-only input (voice removed)
                                   - Socket.IO integration with debug logging
                                   - Connection status indicator
app/globals.css                  - Changed from @import to @tailwind directives (v3)
src/stores/designStore.js        - Added Zustand persist middleware for localStorage
src/components/canvas/RenderComponent.js - Fixed to respect custom className from agent
package.json                     - Downgraded tailwindcss v4 → v3, added autoprefixer
```

**What works now:**
- Text input → Socket.IO → Groq agent → JSON parsing → tool execution → canvas updates
- Agent responds with narration text → chat sidebar (no TTS)
- Agent understands design context and Tailwind colors correctly
- Hover effects work (bg-blue-500 hover:bg-amber-800)
- LocalStorage persistence across page refreshes
- Conversation history maintained per session
- Debug logging throughout the flow (🔵🟢🟡🟣📤)

**Requires:**
- `GROQ_API_KEY` in `.env.local`
- Run with: `node server.js` (not npm run dev)

**Key Fixes This Session:**
1. Removed Mastra complexity → direct AI SDK usage
2. Fixed Groq tool calling issues → manual JSON parsing
3. Fixed Tailwind JIT dynamic class issue → switched to inline styles for colors
4. Colors use inline styles (backgroundColor, color, --hover-bg CSS variable)
5. Hover effects handled with onMouseEnter/onMouseLeave React events
6. Tailwind only for static layout/spacing (px-4, py-2, rounded, etc.)
7. Agent creates multiple items using children array + container
8. Agent modifies existing components by reading design state context for componentId
9. Added localStorage persistence → Zustand persist middleware

**Why Inline Styles:**
Tailwind JIT only generates CSS for classes found in source files at build time. Since the agent generates classes dynamically at runtime, Tailwind never sees them and doesn't generate CSS. Inline styles always work regardless of build-time scanning.

---

---

## Post-Phase 2 Bug Fixes & Optimizations - COMPLETE ✅

### Bug Fix: `updateComponent` not applying changes visually

**Root cause:** `designStore.updateComponent(id, changes)` was spreading `changes` at the component root (`{ ...c, ...changes }`) instead of into `props`. Since `changes` from the agent is `{ style: {...} }` (props-level), it ended up at `component.style` instead of `component.props.style`. `RenderComponent` reads `props.style`, so nothing visually changed.

**Fix (`src/stores/designStore.js`):**
```js
props: {
  ...c.props,
  ...changes,
  ...(changes.style ? { style: { ...c.props?.style, ...changes.style } } : {}),
}
```
- `changes` now merges into `props` (not component root)
- `style` is deep-merged so existing style keys aren't wiped on partial updates

### Optimization: Token usage in `designAgent.js`

**Changes:**
- System prompt trimmed from ~700 to ~250 tokens (removed duplicate rules, collapsed examples to 3 inline ones)
- Primary model switched to `llama-3.1-8b-instant` (cheap/fast). Auto-retries with `llama-3.3-70b-versatile` if JSON parse fails
- `maxTokens: 400` added — caps output since JSON responses are never more than ~300 tokens
- State context compacted to single line, skipped entirely when canvas is empty
- History stores only `{ tool, message }` per assistant turn instead of full JSON blob
- History limit reduced from 20 → 10 messages

---

## Post-Phase 2 Reliability Fixes - COMPLETE ✅

### Added `clear_canvas` tool
- `server/tools/designTools.js` — new `clearCanvas()` function returning `{ action: "clear_canvas" }`
- Registered in `designAgent.js` tool map
- `page.js` — handles `clear_canvas` action by calling `useDesignStore.clearCanvas()`
- System prompt updated: tool #7 `clear_canvas — {}` with note to use for "delete all / clear everything / start over"
- Fixes: agent previously tried to call `delete_component` 11 times and failed to parse multi-call responses

### Fixed `extractJSON` string-awareness
**Problem:** The brace-depth parser counted `{` and `}` inside quoted string values (e.g. `"/div>"` hallucinated by 8B model), causing false "Unclosed JSON object" errors even when a valid JSON block was present.
**Fix:** Parser now tracks `inString` state and `escape` flag, skipping all characters inside quoted strings when counting brace depth.

### Switched primary model back to `llama-3.3-70b-versatile`
**Problem:** `llama-3.1-8b-instant` reliably failed on complex components (navbar, multi-child containers) — generating invalid JSON with nested containers instead of using built-in types, then triggering a 70B retry anyway. Net cost: both models called per failure.
**Fix:** 70B as sole model (`maxTokens: 500`). No fallback needed — one reliable call is cheaper than 8B-fail + 70B-retry.
**Also:** Added `NAVBAR RULE` to system prompt and navbar as first example — model now uses `{logo, links, cta}` props directly instead of improvising nested containers.

---

## Phase 3: Expand Components + Context - PENDING

## Phase 4: Smart Voice Features - PENDING

## Phase 5: Export & UI Polish - PENDING

## Phase 6: Nice-to-Have - PENDING
