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

---

## Phase 2: Agent + Text-to-Canvas Pipeline - COMPLETE ✅

**Architecture Changes:**
- ❌ **Removed Mastra framework** - too complex, using AI SDK directly
- ❌ **Removed voice features** - focusing on text-only MVP for stability
- ✅ **Manual JSON parsing** - LLM outputs JSON, we parse and execute tools manually
- ✅ **Tailwind v3** - downgraded from v4 for stability (hover variants work)
- ✅ **LocalStorage persistence** - designs survive page refresh

**What works:**
- Text input → Socket.IO → Groq agent → JSON parsing → tool execution → canvas updates
- Agent responds with narration text → chat sidebar
- LocalStorage persistence across page refreshes
- Conversation history maintained per session

---

## Post-Phase 2 Bug Fixes & Optimizations - COMPLETE ✅

### Bug Fix: `updateComponent` not applying changes visually
`designStore.updateComponent` was spreading `changes` at the component root instead of into `props`. Fixed to merge into `props` with deep-merge for `style`.

### Token Optimization: `designAgent.js`
- System prompt trimmed ~700 → ~250 tokens
- History stores only `{ tool, message }` per turn (not full JSON blob)
- History limit 20 → 10 messages
- State context compacted to single line, skipped when canvas is empty

---

## Post-Phase 2 Reliability Fixes - COMPLETE ✅

### `clear_canvas` tool
New tool maps "delete all / clear everything" to a single tool call hitting `clearCanvas()` in the store.

### `extractJSON` string-awareness
Brace-depth parser now tracks `inString`/`escape` state — skips `{}` inside quoted strings, preventing false "Unclosed JSON object" errors.

### Model: 70B as sole model
Dropped 8B+fallback strategy. `llama-3.3-70b-versatile` directly — one reliable call is cheaper than 8B-fail + 70B-retry.

### Navbar as atomic component with auto-generated CTA child
Navbar uses `{logo, links[], cta}` props only. `cta` string auto-generates a real `button` child with its own ID in `createComponent`. Renderer finds it via `children.find(c => c.type === "button")`.

---

## Session 3: Full Feature Completion - COMPLETE ✅

### Child targeting (full stack)
**Problem:** Agent couldn't modify nested components (button inside form, heading inside hero).
**Fix — two parts:**
1. `designAgent.js` — `flattenComponents()` recursively walks the full tree and sends every component (including children) to the agent with a `parent` field. Agent now sees all IDs.
2. `designStore.js` — `updateComponent` now uses recursive `applyUpdate()` that walks `children[]` at every level to find and update the target.
3. System prompt — `CHILD TARGETING RULE` added with explicit example showing agent must use child's ID not parent's.

### `add_child` tool
New tool `addChild({ parentId, child, insertBefore? })` adds a component as a real child of an existing component. Recursive `addChildComponent` store action walks the tree to find the parent.

### Recursive `removeComponent`
`removeComponent` now uses `applyRemove()` to filter at every level of the tree — deleting nested children works correctly.

### `insertBefore` ordering
All three creation tools (`create_component`, `create_form`, `create_section`) support `insertBefore` param. Store's `addComponent` and `addChildComponent` splice at the correct index instead of always appending. Fixes: pricing section appearing after footer.

### Groq → OpenRouter fallback chain
When Groq hits rate limit (429), automatically falls through a list of free OpenRouter models:
1. `stepfun/step-3.5-flash:free`
2. `arcee-ai/trinity-large-preview:free`
3. `nvidia/nemotron-3-nano-30b-a3b:free`

Each candidate is parsed and validated (must have `params`) before accepting. If a model returns valid JSON but missing `params`, skips to next model.

### `useSocket.js` stale closure fix
**Problem:** `socket.on("tool_call", ...)` captured `onToolCall` at mount and never updated it. After any re-render, the socket was calling a stale callback — `clear_canvas` and other actions appeared to do nothing until page refresh.
**Fix:** Store all callbacks in refs (`onToolCallRef`, etc.), update refs on every render. Socket listeners call `ref.current` — always the latest version.

### `changes` normalization in `updateComponent`
Agent sometimes wraps changes in a redundant `props` key: `changes: { props: { style: {...} } }`. Store now normalizes — unwraps `changes.props` if present before applying.

### Card renderer extended
`RenderComponent` card case now renders: `title`, `subtitle`, `price`, `period`, `description`, `features[]` (as checklist with ✓). Agent system prompt updated with full card props shape.

### `extractJSON` params guard
`executeTool` now throws a clear error if `params` is undefined (small models sometimes return tool name but no params). Fallback loop skips models that return no params instead of crashing.

---

---

## Session 4: Export + Styling + Bug Fixes - COMPLETE ✅

### HTML Export feature
New export pipeline — click **Export** in the header to view and download a standalone HTML file.
- `src/lib/export/generateHTML.js` — recursively walks component tree, maps every type to HTML with Tailwind classes and inline styles for colors. Wraps in full HTML boilerplate with Tailwind CDN + Inter font.
- `src/components/export/ExportModal.js` — modal with syntax-highlighted code preview, Copy and Download buttons. Closes on Escape or clicking outside.
- `app/page.js` — Export button in header (disabled when canvas empty), `showExport` state, renders modal.
- **Format:** standalone `.html` with Tailwind CDN. Inline `style=""` attributes for colors (consistent with renderer approach).

### Light-mode canvas + component reskin
Canvas background changed from near-black `#0a0a1a` to warm off-white `#f7f5f0`. All components updated to complement:
- Cards, forms, navbar → `bg-white border border-gray-200 shadow-sm`
- Hero → `from-blue-50 to-purple-50 border border-blue-100`
- Headings → `text-gray-900`, body text → `text-gray-500/600`
- Inputs → `bg-white border-gray-300`
- Image placeholder → `bg-gray-100`
- Button secondary → `bg-gray-100 border-gray-300 text-gray-800`

### Better default styling (typography + spacing)
`RenderComponent.js` overhaul — components look polished without the agent specifying every detail:
- Headings: `leading-tight tracking-tight`, full color hierarchy (`text-gray-900` → `text-gray-800`)
- Body text: `text-gray-300 leading-relaxed` (dark) / `text-gray-600 leading-relaxed` (light)
- Cards: replaced ad-hoc `mb-2/my-3/mt-3` margins with `flex flex-col gap-3`
- Hero: content wrapped in `max-w-2xl mx-auto` so text doesn't stretch edge-to-edge; children in `flex-wrap gap-3 justify-center`
- `_parentType` prop passed one level down — buttons inside hero get `px-8 py-3 text-base` (larger CTA size) automatically

### Bug fix: `createComponent` dropping nested children
**Problem:** `createComponent` in `designTools.js` hardcoded `children: []` when mapping child components — any child that itself had children (e.g. grid container → pricing cards) silently lost its nested content.
**Fix:** Extracted recursive `buildChild()` helper that walks the full tree at any depth, assigning UUIDs at every level.

### Bug fix: LLM using `)` instead of `}` in JSON
**Problem:** Groq model occasionally closes JSON objects with `)` instead of `}` (e.g. `"changes":{...})`). `extractJSON` only tracked `{`/`}` depth so `)` was invisible → "Unclosed JSON object" error.
**Fix:** `extractJSON` now builds the output string character-by-character. Outside of strings, `)` is treated as `}` (decrements depth, written as `}`). `)` inside string values is left untouched.

### New tool: `reorder_child`
Moves an existing child to a new index within its parent.
- `designTools.js` — `reorderChild({ parentId, childId, newIndex })` returns `{ action: "reorder_child" }`
- `designStore.js` — `reorderChild(parentId, childId, newIndex)` splices child out and re-inserts at clamped index, recursive tree walk
- `designAgent.js` — registered in executor, tool #6 added to system prompt with 0-based index example
- `app/page.js` — `case "reorder_child"` handler added
- **Use case:** "move the button below the subtitle", "put the heading first"

### Bug fix: `create_section` hero always injecting default subtitle
**Problem:** Hero sections always added a hardcoded `"Build amazing things with our powerful platform"` text child even when no subtitle was requested.
**Fix:** Subtitle child now only added when `content.subtitle` is explicitly provided (conditional spread).

### `create_section` hero: `ctaStyle` support
Hero CTA button now accepts `content.ctaStyle: { backgroundColor, color, "--hover-bg" }`. System prompt updated to document this. Enables "create hero with black button" without a separate `modify_component` call.

---

## What's Working End-to-End ✅
- Create: navbar, hero, feature cards, pricing cards, forms, sections, containers
- Modify: any component including nested children by ID
- Reorder children within a parent
- Add child to existing component
- Delete: top-level and nested components
- Ordering: insertBefore on all creation tools
- Undo / redo
- Clear canvas (instant, no refresh needed)
- LocalStorage persistence
- Groq rate limit → OpenRouter fallback chain
- **Export: HTML/Tailwind download**
- **Light-mode canvas with polished component defaults**

## What's Left
- [ ] Clear canvas + Undo buttons in the UI toolbar
- [ ] Voice input (add back on top of text)

---

## Phase 3: Expand Components + Context - PARTIALLY COMPLETE
(child targeting, add_child, card variants done — voice context still pending)

## Phase 4: Smart Voice Features - PENDING

## Phase 5: Export & UI Polish - COMPLETE ✅

## Phase 6: Nice-to-Have - PENDING
