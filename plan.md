# Voice-Controlled Creative Canvas - Hackathon Build Plan

> **Duration:** 24-48 hours | ~~Voice Hackathon~~ **TEXT-ONLY MVP** (voice removed for stability)
> **Stack:** Next.js + JavaScript + Tailwind v3 + ~~Mastra AI~~ AI SDK Direct + Groq + ~~Smallest.AI~~ + Socket.IO
> Use this as a checklist. Work top-to-bottom. Each phase builds on the previous one.

**DEVIATIONS FROM ORIGINAL PLAN:**
- ❌ Removed all voice features (STT/TTS, mic button) for MVP simplicity
- ❌ Removed Mastra framework - using AI SDK directly with manual JSON parsing
- ✅ Downgraded Tailwind v4 → v3 for stability (hover variants work)
- ✅ Added localStorage persistence (moved from Phase 6 to Phase 2)
- ✅ Added OpenRouter fallback chain for Groq rate limits
- ✅ Navbar CTA auto-generated as real child component with own ID
- ✅ Recursive store operations for full nested tree targeting
- ✅ `insertBefore` ordering on all creation tools
- ✅ `add_child` tool for adding children to existing components
- ✅ `clear_canvas` tool for "delete all / start over"
- ✅ Stale closure fix in useSocket (ref pattern)
- ✅ Card renderer extended (price, period, subtitle, features[])

---

## PHASE 1: Voice Pipeline + Foundation (Hours 0-6) - MUST COMPLETE
*Voice-first. Get mic → transcription → display working before anything else.*

- [ ] **1.1 Project Scaffolding**
  - Initialize Next.js project with JavaScript
  - Install and configure Tailwind CSS
  - Set up project folder structure:
    ```
    /src
      /app              (Next.js app router pages)
      /components        (React UI components)
        /canvas          (Canvas renderer components)
        /ui              (Shared UI: buttons, panels, etc.)
        /voice           (Voice input/output components)
      /lib               (Utilities and helpers)
        /socket          (Socket.IO client setup)
        /voice           (STT/TTS integration helpers)
      /stores            (Zustand state stores)
      /styles            (Global styles)
    /server
      /agent             (Mastra AI agent config)
      /tools             (Agent tool definitions)
      /socket            (Socket.IO server setup)
    ```
  - Install all dependencies upfront:
    - Core: `next`, `react`, `react-dom`, `tailwindcss`, `@tailwindcss/postcss`, `postcss`
    - State: `zustand`
    - WebSocket: `socket.io`, `socket.io-client`
    - AI: `@mastra/core`, `@ai-sdk/groq`
    - Utilities: `uuid`
  - Set up `.env.local`: `GROQ_API_KEY`, `SMALLEST_AI_API_KEY`

- [ ] **1.2 Smallest.AI STT Integration (Voice Input)**
  - Set up Smallest.AI STT client in `/lib/voice/stt.js`
  - Create `useVoiceInput` hook:
    - Request microphone permission
    - Capture audio via Web Audio API / MediaRecorder
    - Stream audio to Smallest.AI STT endpoint
    - Return transcribed text in real-time
  - Add Voice Activity Detection (VAD):
    - Option A: Simple volume threshold (fastest to build)
    - Option B: `@ricky0123/vad-web` library (more accurate)
  - **Fallback:** If Smallest.AI has issues, use browser `SpeechRecognition` API (built-in, no API key)

- [ ] **1.3 Mic Button + Basic Page Layout**
  - Create main page layout:
    - Top: Simple header with app name
    - Center: Canvas area (empty for now, just a styled container)
    - Bottom: Input bar with text input + mic button
  - Create `<MicButton>` component:
    - Click/hold to start recording
    - Visual states: idle (gray), listening (pulsing animation), processing (spinner)
    - Show transcribed text in the input bar as it streams in
  - Style with Tailwind - dark theme for design tool feel
  - **Milestone:** User clicks mic, speaks, and sees their words appear as text

- [ ] **1.4 Smallest.AI TTS Integration (Voice Output)**
  - Set up Smallest.AI TTS client in `/lib/voice/tts.js`
  - Create `useVoiceOutput` hook:
    - Receives text string
    - Sends to Smallest.AI TTS endpoint
    - Plays audio via Web Audio API / `<audio>` element
    - Returns `stop()` function for interruption
  - Add toggle button to enable/disable voice output
  - **Milestone:** Can programmatically speak any text through the browser

- [ ] **1.5 Design State Store (Zustand)**
  - Create `designStore` with Zustand:
    - `components[]` - array of component objects on canvas
    - `theme` - current color/font theme
    - `context` - last modified element, current section
    - `history[]` - array of previous states for undo
    - Actions: `addComponent`, `updateComponent`, `removeComponent`, `undo`, `redo`, `clearCanvas`
  - Each component object shape: `{ id, type, props, children, position }`
  - History: push full state snapshot on each change (simple approach)

- [ ] **1.6 Basic Canvas Renderer**
  - Create `<CanvasRenderer>` component that reads from `designStore`
  - Map component types to React components:
    - `button` → renders a styled button
    - `text` → renders heading/paragraph
    - `card` → renders a card container
    - `input` → renders form input
    - `container` → renders a div wrapper
  - Start with just 3 types: `button`, `text`, `card`
  - Components render with Tailwind classes from their props
  - Add fade-in entrance animations

---

## PHASE 2: Agent + Voice-to-Canvas Pipeline (Hours 6-12) - MUST COMPLETE
*Connect voice → agent → canvas. This is the core demo loop.*

- [ ] **2.1 Mastra AI Agent Setup**
  - Install and configure Mastra AI with Groq provider
  - Create the design agent with system prompt:
    - Role: UI design assistant that creates web components
    - Output format: structured tool calls (JSON)
    - Knowledge of available component types and their props
    - Instructions to narrate what it's doing (for TTS)
  - Inject current design state as context with each request

- [ ] **2.2 Core Agent Tools - Creation**
  - `create_component` tool:
    - Params: `type`, `props` (styles, content, variant), `parentId` (optional)
    - Returns: component object with generated `id`
    - Handles: buttons, text, cards, inputs, containers, images
  - `create_form` tool:
    - Params: `fields[]` (each with type, label, placeholder), `submitText`
    - Returns: form component with children
  - `create_section` tool:
    - Params: `sectionType` (hero, features, cta, pricing), `content`
    - Returns: section component with pre-populated children

- [ ] **2.3 Core Agent Tools - Modification**
  - `modify_component` tool:
    - Params: `componentId`, `changes` (partial props update)
    - Returns: updated component
  - `delete_component` tool:
    - Params: `componentId`
    - Returns: confirmation
  - `undo_action` tool:
    - No params, pops last state from history

- [ ] **2.4 Socket.IO Server + Client**
  - Server (attached to Next.js custom server):
    - `user_input` event → pass text to Mastra agent
    - `interrupt` event → cancel current agent operation
    - Emits: `tool_call`, `agent_response`, `agent_thinking`, `error`
    - Stream agent responses as they arrive
  - Client hook (`useSocket`):
    - Connect on mount, handle reconnection
    - Send user input (from voice transcription OR text input)
    - Receive tool calls → update Zustand store
    - Receive agent responses → display + pass to TTS

- [ ] **2.5 Wire It All Together: Voice → Agent → Canvas → Voice**
  - Complete loop:
    1. User speaks → STT transcribes → text appears in input bar
    2. Transcribed text sent via Socket.IO to backend
    3. Mastra agent processes with Groq → calls tools
    4. Tool results sent back via Socket.IO
    5. Frontend updates Zustand store → canvas re-renders
    6. Agent narration sent to TTS → user hears response
  - Add status indicators: "Listening...", "Thinking...", "Creating..."
  - **Milestone:** Say "create a blue button" → button appears on canvas → agent says "I've created a blue button"

- [ ] **2.6 Interruption Handling**
  - When user starts speaking while TTS is playing:
    - Stop TTS playback immediately
    - Send `interrupt` event to backend
    - Cancel pending agent operations
    - Process new user input
  - Ensure canvas state stays consistent after interrupt

---

## PHASE 3: Expand Components + Context (Hours 12-20) - PARTIALLY COMPLETE

- [x] **3.1 Card Components** — DONE
  - [x] Pricing card (title, price, period, features list)
  - [x] Feature card (icon, title, description)
  - [x] Card renderer: title, subtitle, price, period, description, features[] checklist

- [x] **3.2 Form Components** — DONE
  - [x] Text, email, password, number inputs with labels
  - [x] Submit button auto-added
  - [x] create_form tool with fields[] array

- [x] **3.3 Navigation Components** — DONE
  - [x] Navbar with logo, links[], CTA button (auto-generated child with own ID)
  - [x] Footer via create_section sectionType="footer"

- [x] **3.4 Section/Layout Components** — DONE
  - [x] Hero section (heading, subtext, CTA button)
  - [x] Features section (heading + 2 feature cards)
  - [x] Pricing section (heading + 2 pricing cards)
  - [x] CTA section (heading + button)
  - [x] insertBefore on all creation tools for correct ordering

- [x] **3.5 Child Targeting (Full Stack)** — DONE
  - [x] flattenComponents() → agent sees all nested IDs with parent field
  - [x] Recursive applyUpdate() in store walks full children[] tree
  - [x] CHILD TARGETING RULE in system prompt with example
  - [x] add_child tool for adding children to existing components
  - [x] Recursive applyRemove() for deleting nested components

- [ ] **3.6 Conversational Context (Remaining)**
  - [ ] Smarter "it" / "the button" resolution beyond lastModified
  - [ ] Agent asks clarifying questions when ambiguous

---

## PHASE 4: Smart Voice Features (Hours 20-28) - MEDIUM PRIORITY
*Makes the voice experience feel polished and intelligent.*

- [ ] **4.1 Undo/Redo via Voice**
  - "Go back" / "Undo that" → triggers undo
  - "Redo" → restores last undone change
  - Agent describes what was undone: "Reverted the button color change"
  - Keyboard shortcuts also work: Ctrl+Z / Ctrl+Y

- [ ] **4.2 Theme/Style Intelligence**
  - Agent maintains consistent theme across components
  - "Make it look modern" → applies modern design tokens
  - "Use a dark theme" → updates all components
  - Consistent spacing, colors, fonts
  - Agent auto-applies theme to new components

- [ ] **4.3 Streaming / Progressive Updates**
  - Complex components build progressively on canvas
  - Agent narrates as each piece appears
  - Example: "Creating pricing card... adding title... adding price..."
  - Visual transitions between states (fade in, slide in)

- [ ] **4.4 Multi-Step Commands**
  - Handle complex voice requests needing multiple tool calls:
    - "Create a complete login page" → hero + form + footer
    - "Make this look professional" → fix fonts + colors + spacing
  - Agent plans steps, executes sequentially, streams results

- [ ] **4.5 Voice UX Polish**
  - Better visual feedback during voice interaction
  - Audio waveform visualization while listening
  - Smooth transitions between voice states
  - "Thinking" animation while agent processes
  - Debounce to avoid sending partial transcriptions

---

## PHASE 5: Export & UI Polish (Hours 28-36) - IN PROGRESS
*Demo closer and production-quality output.*

- [ ] **5.1 Export to HTML/CSS**
  - Generate clean HTML + Tailwind CSS from canvas state
  - Download as `.html` file
  - Include Tailwind via CDN link
  - Properly formatted, readable code

- [ ] **5.2 Export to React Component**
  - Generate JSX component from canvas state
  - Include Tailwind classes
  - Download as `.jsx` file

- [ ] **5.3 Code Preview Panel**
  - Add "View Code" button/tab
  - Show generated code alongside canvas
  - Syntax highlighting (use `prism-react-renderer`)
  - Copy to clipboard button

- [ ] **5.4 UI Polish**
  - Smooth animations for component creation/modification
  - Loading states and skeletons
  - Error handling with friendly voice + visual messages
  - Responsive layout
  - Keyboard shortcuts overlay

---

## PHASE 6: Nice-to-Have (Hours 36-48) - LOW PRIORITY
*Only if time permits. Cherry on top.*

- [ ] **6.1 Self-Correction Loop**
  - Agent evaluates its own output after creation
  - Auto-fixes obvious issues (bad contrast, misalignment)
  - Narrates corrections: "Actually, let me fix that contrast..."

- [ ] **6.2 Proactive Suggestions**
  - Agent notices patterns: "You have 3 different button styles, want me to standardize?"
  - Suggest improvements unprompted via voice
  - "This form is missing labels, should I add them?"

- [ ] **6.3 Adaptive Verbosity**
  - First interaction: detailed explanation
  - Repeated actions: concise responses
  - Match user's communication style

- [ ] **6.4 Design Validation**
  - Check accessibility (contrast ratios, font sizes)
  - Warn about design issues via voice
  - Agent proactively suggests fixes

- [ ] **6.5 Drag-and-Drop Reordering**
  - Manual reordering of components on canvas
  - Click to select, drag to move
  - Supplements voice commands

- [ ] **6.6 Persist Designs**
  - Save designs to localStorage
  - Load previous designs
  - Share via URL

---

## Demo Script (for judges)
*Voice-first throughout. Practice this flow:*

1. **Open the app**, show empty canvas with mic button
2. **Click mic, say:** "Create a hero section for a SaaS product"
   - Watch it build on canvas, hear agent narrate
3. **Say:** "Add a pricing section with three tiers below it"
   - Complex component appears with voice feedback
4. **Say:** "Make the middle card stand out more"
   - Agent understands context, modifies the right card
5. **Say:** "Change the color scheme to dark mode"
   - All components update consistently
6. **Say:** "Undo that" → reverts, then "Actually, keep it"
   - Show voice undo/redo
7. **Say:** "Export the code"
   - Show clean HTML/Tailwind output
8. **Highlight to judges:** Voice-first UX, real-time canvas, AI agent with context, clean code output

---

## Lessons Learned / Key Fixes

### 1. Mastra Framework Was Overkill
**Problem:** Mastra added unnecessary complexity and abstraction layers.
**Solution:** Removed Mastra. Use AI SDK directly with manual JSON parsing.
**Lesson:** For MVPs, simpler is better. Don't add frameworks unless absolutely necessary.

### 2. Structured Tool Calling Was Unreliable
**Problem:** Groq models had inconsistent support for structured tool calling. Generated malformed tool calls.
**Solution:** Manual JSON parsing. LLM outputs JSON text, we parse and execute manually.
**Lesson:** When LLM features are unreliable, fall back to text parsing. It's more transparent anyway.

### 3. Tailwind v4 Is Not Production Ready
**Problem:** Tailwind v4 didn't generate hover pseudo-class variants properly with Next.js.
**Solution:** Downgraded to Tailwind v3. All variants work correctly now.
**Lesson:** Don't use beta/experimental versions for time-sensitive projects.

### 4. LLMs Don't Know Tailwind Colors
**Problem:** LLM generated invalid colors like "brown-500" (doesn't exist in Tailwind).
**Solution:** Added complete Tailwind color palette to system prompt with examples.
**Lesson:** Be explicit about constraints. LLMs will make up values if not told what's valid.

### 5. CSS Specificity Issues
**Problem:** RenderComponent's default variant styles overrode agent's custom className.
**Solution:** Only apply variant defaults when NO custom className provided.
**Lesson:** When mixing default and custom styles, make one take precedence clearly.

### 6. Voice Adds Complexity
**Problem:** Voice features (STT/TTS/VAD) added many dependencies and potential failure points.
**Solution:** Removed all voice features. Text-only MVP works perfectly.
**Lesson:** For hackathons/MVPs, cut features aggressively. Voice can be added later.

### 7. LocalStorage Is Free Persistence
**Problem:** Users lost work on page refresh.
**Solution:** Zustand persist middleware → automatic localStorage sync.
**Lesson:** Add persistence early. It's trivial with modern tools and provides huge UX value.

### 8. `updateComponent` Must Merge Into `props`, Not Component Root
**Problem:** Agent sends `changes: { style: {...} }` (props-level). Store was doing `{ ...component, ...changes }` which put `style` at the component root, not inside `props`. `RenderComponent` reads `props.style` — so modifications had no visual effect.
**Solution:** Merge changes into `props`: `props: { ...c.props, ...changes }`. Deep-merge `style` to avoid wiping existing style keys on partial updates.
**Lesson:** Be precise about the shape of your update payloads. Know whether `changes` is component-level or props-level and merge accordingly.

### 10. Small Models + Fallback Can Cost More Than Just Using the Large Model
**Problem:** `llama-3.1-8b-instant` failed on complex JSON (navbar, multi-child containers), triggering a 70B retry — paying for both models on every failure. Failure rate was high enough that average cost exceeded just using 70B directly.
**Solution:** Dropped 8B entirely. Use `llama-3.3-70b-versatile` as sole model. One reliable call is always cheaper than two unreliable ones.
**Lesson:** Measure actual failure rate before assuming a small+fallback strategy saves money. If failure rate > ~30%, direct large model is cheaper.

### 11. JSON Parsers Must Be String-Aware
**Problem:** Brace-depth counter incremented/decremented on `{}` inside quoted string values, causing false "Unclosed JSON object" errors when the JSON was actually valid but contained string values with braces (e.g. CSS values, HTML fragments hallucinated by smaller models).
**Solution:** Track `inString` and `escape` state — skip all characters inside quoted strings when counting depth.
**Lesson:** Any custom JSON boundary detection must handle strings. `JSON.parse` handles this internally but custom extractors don't get it for free.

### 12. Child Targeting Requires Two-Sided Fix
**Problem:** Agent used parent ID instead of child ID when modifying nested components ("the button in the form").
**Fix — two parts:** (1) `flattenComponents()` sends every component including children to agent with `parent` field; (2) `applyUpdate()` in store recursively walks `children[]` at every level.
**Lesson:** Both the agent context AND the store must support nested operations. Fixing only one side doesn't work.

### 13. Navbar CTA Must Be a Real Child
**Problem:** Navbar's CTA string (`props.cta`) couldn't be targeted by the agent — it had no ID.
**Solution:** `createComponent` auto-generates a real `button` child with a UUID when `props.cta` is set. Renderer finds it via `children.find(c => c.type === "button")`.
**Lesson:** Any element that users might want to modify must have its own ID in the tree.

### 14. Stale Closures Break Socket Listeners
**Problem:** `socket.on("tool_call", ...)` captured `onToolCall` at mount. After any re-render, the socket called a stale callback — `clear_canvas` appeared to do nothing until page refresh.
**Solution:** Store all callbacks in refs (`onToolCallRef`). Update refs on every render. Socket listeners call `ref.current`.
**Lesson:** Socket listeners registered once at mount will always call the version of callbacks from mount time. Use refs to always get the current version.

### 15. API Fallback Chains Need Validation
**Problem:** OpenRouter fallback models sometimes returned valid JSON but with `params: undefined` (model too weak). This crashed the tool executor.
**Solution:** Fallback loop validates `parsed.params` exists before accepting a candidate response. Skips to next model if missing.
**Lesson:** Don't just check if JSON parses — validate the required fields too.

### 16. `insertBefore` Must Thread Through All Layers
**Problem:** `create_section` with `insertBefore` worked in the system prompt example but the section always appeared at the end. The `insertBefore` param was accepted but silently dropped.
**Solution:** Added `insertBefore` as a param to `createSection()`, added it to the returned action object, and updated `page.js` to pass `result.insertBefore` to `addComponent`.
**Lesson:** Trace the full data flow when a param seems to have no effect. Often it's dropped at one layer.

### 9. Token Costs Accumulate Fast With Verbose Prompts + Large History
**Problem:** System prompt had duplicate rules (~700 tokens), history stored full JSON blobs (~200 tokens/turn × 20 turns), state context used pretty-printed JSON, no output cap.
**Solution:** Trimmed system prompt to ~250 tokens, switched to 8B model (70B as fallback), added `maxTokens: 400`, compacted state context to a single line, store only `{ tool, message }` in history, reduced history to 10 messages.
**Lesson:** Every token in the system prompt + history is paid on every request. Audit token usage early.

---

## Key Dependencies to Install (Actual)
```
# Core
next react react-dom

# Styling
tailwindcss@3 autoprefixer postcss

# State
zustand

# WebSocket
socket.io socket.io-client

# AI/LLM
ai @ai-sdk/groq zod

# Utilities
uuid

# Export/Code Display (Phase 5 - not yet installed)
# prism-react-renderer
```

**Removed:**
- ❌ @mastra/core (too complex)
- ❌ @tailwindcss/postcss (v4 plugin, using v3 now)
- ❌ smallest-ai (voice removed)
- ❌ @ricky0123/vad-web (voice removed)

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Smallest.AI STT issues | Fall back to browser `SpeechRecognition` API (built-in, zero setup) |
| Smallest.AI TTS issues | Fall back to browser `SpeechSynthesis` API (built-in) |
| Groq rate limits | Add debounce on voice input, cache common responses |
| Socket.IO complexity | Start with Next.js API routes + polling, upgrade to Socket.IO if time |
| Agent gives bad output | Strong system prompt with examples, validate tool call JSON format |
| Mic permission denied | Show clear instructions, provide text input as fallback |
| Time pressure | **Phase 1-2 = minimum demo.** Voice works + canvas updates. Everything else is bonus. |
