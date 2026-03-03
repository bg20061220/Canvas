# Voice Canvas - Claude Session Context

> **Read this file first in any new session.** It has everything you need to continue building without re-reading the whole codebase.

## What This App Is

A voice-first web app where users speak commands to design web components on a live canvas. Say "create a pricing card" and it appears. Say "make the button blue" and it updates. The agent understands context, maintains design state, and responds via voice.

## Current Status

**Phase 1: COMPLETE** — Foundation + UI layout (voice removed)
**Phase 2: COMPLETE** — Agent + Socket.IO + text-to-canvas loop (+ bug fixes)
**Phase 3: NOT STARTED** — Expand components + context intelligence

The app runs (`node server.js` → localhost:3000) with a custom server that wraps Next.js + Socket.IO. **Text input only** (voice features removed for MVP). Uses Groq-powered AI agent with **manual JSON parsing** (no Mastra). Agent outputs JSON, we parse and execute tool functions. Components persist to localStorage. Requires `GROQ_API_KEY` in `.env.local`.

**Create and modify both work correctly.** The `updateComponent` store bug (changes merging at component root instead of into `props`) has been fixed.

## Tech Stack

| Layer | Tool | Package |
|-------|------|---------|
| Framework | Next.js (App Router) | `next` (v16) |
| Language | JavaScript (NOT TypeScript) | — |
| Styling | Tailwind CSS v3 | `tailwindcss`, `autoprefixer` |
| State | Zustand + persist | `zustand` |
| WebSocket | Socket.IO | `socket.io`, `socket.io-client` |
| AI/LLM | Vercel AI SDK + Groq | `ai`, `@ai-sdk/groq` |
| Model | **Llama 3.3 70B Versatile** (sole model) | via Groq API |
| Tool Calling | Manual JSON parsing | Custom implementation |
| Persistence | localStorage | Browser API via Zustand persist |
| IDs | uuid | `uuid` |

## File Map

```
Canvas/
├── app/
│   ├── layout.js              # Root layout. Dark theme, Inter font, html class="dark"
│   ├── page.js                # Main page. Split layout: canvas (left) + chat sidebar (right)
│   │                          #   - Manages: status, messages[], voiceEnabled, textInput
│   │                          #   - Uses: useVoiceInput, useVoiceOutput, useDesignStore
│   │                          #   - handleTranscript → sendInput via Socket.IO → agent
│   ├── globals.css            # Tailwind import + custom animations (mic-pulse, fade-in-up, scrollbar)
│   └── api/                   # (empty) Next.js API routes go here
│
├── src/
│   ├── components/
│   │   ├── canvas/
│   │   │   ├── CanvasRenderer.js   # Reads designStore.components[], maps each to RenderComponent
│   │   │   │                       # Shows empty state placeholder when no components
│   │   │   └── RenderComponent.js  # Switch on component.type → renders React element
│   │   │                           # Types: button, text/heading, card, input, container/section,
│   │   │                           #        image, divider, form, navbar
│   │   │                           # Supports recursive children for nested components
│   │   ├── ui/                     # (empty) Shared UI components go here
│   │   └── voice/
│   │       └── MicButton.js        # Mic toggle button. States: idle (blue), listening (red+pulse)
│   │
│   ├── lib/
│   │   ├── socket/
│   │   │   └── useSocket.js        # useSocket({ onToolCall, onAgentResponse, onThinking, onError })
│   │   │                           #   Returns: { isConnected, sendInput(text, state), sendInterrupt() }
│   │   └── voice/
│   │       ├── stt.js              # useVoiceInput() hook
│   │       │                       #   - Tries: MediaRecorder → Smallest.AI /transcribe endpoint
│   │       │                       #   - Fallback: browser SpeechRecognition API
│   │       │                       #   - Returns: { isListening, transcript, error, startListening, stopListening }
│   │       │                       #   - Calls onTranscript(text) when final result ready
│   │       └── tts.js              # useVoiceOutput() hook
│   │                               #   - Tries: Smallest.AI /synthesize endpoint
│   │                               #   - Fallback: browser SpeechSynthesis API
│   │                               #   - Returns: { speak(text), stop(), isSpeaking }
│   │
│   └── stores/
│       └── designStore.js          # Zustand store — the single source of truth
│                                   # State:
│                                   #   components[] — array of { id, type, props, children }
│                                   #   theme — { primaryColor, secondaryColor, fontFamily, style }
│                                   #   context — { lastModified, currentSection, designIntent }
│                                   #   history[] / future[] — for undo/redo
│                                   # Actions:
│                                   #   addComponent(component)
│                                   #   updateComponent(id, changes)
│                                   #   removeComponent(id)
│                                   #   setComponents(components) — bulk replace (for agent)
│                                   #   setTheme(theme)
│                                   #   undo() / redo() / clearCanvas()
│
├── server.js                       # Custom Node.js server: Next.js + Socket.IO on same port
│
├── server/
│   ├── agent/
│   │   └── designAgent.js          # runAgent(text, designState, sessionId) → { text, toolResults[] }
│   │                               #   Uses: Mastra Agent class + Groq llama-3.3-70b-versatile
│   │                               #   System prompt: UI design assistant with tool knowledge
│   │                               #   Tracks conversation history per session (last 20 msgs)
│   │                               #   Injects current design state as context
│   ├── tools/
│   │   └── designTools.js          # 6 Mastra createTool() tools with zod schemas:
│   │                               #   create_component, create_form, create_section,
│   │                               #   modify_component, delete_component, undo_action
│   │                               #   Each returns { action, component/componentId/changes }
│   └── socket/
│       └── handler.js              # Socket.IO event handlers:
│                                   #   user_input → runAgent → emit tool_call + agent_response
│                                   #   interrupt → abort agent, clear processing flag
│                                   #   clear_session → reset conversation history
│
├── plan.md                         # Full hackathon build plan with phases & checklist
├── progress.md                     # Build progress log per phase
├── context.md                      # THIS FILE — session context for Claude
├── claude.md                       # Project docs, spec, architecture diagrams
├── .env.local                      # GROQ_API_KEY=, SMALLEST_AI_API_KEY= (empty, needs keys)
├── next.config.mjs                 # Basic Next.js config
├── postcss.config.mjs              # Tailwind v4 PostCSS plugin
├── jsconfig.json                   # Path alias: @/* → ./*
└── package.json                    # All deps installed, scripts: dev/build/start
```

## Component Data Shape

This is what goes in `designStore.components[]` and what the agent tools must produce:

```js
{
  id: "btn_1",           // unique, generated via uuid
  type: "button",        // one of: button, text, heading, card, input, container, section, image, divider, form, navbar
  props: {               // type-specific properties
    text: "Sign Up",     // display text (button, text, heading)
    variant: "primary",  // visual variant (button: primary/secondary/outline/ghost)
    className: "",       // extra Tailwind classes
    style: {},           // inline styles (rarely used)
    // card: title, description
    // input: label, placeholder, inputType
    // section: title, subtitle, variant ("hero")
    // navbar: logo, links[], cta
    // image: width, height
  },
  children: [],          // nested components (for card, form, section, container, navbar)
}
```

## Key Architecture Decisions

1. **No Mastra framework** — Removed for simplicity. Using AI SDK directly with manual JSON parsing.
2. **Manual JSON parsing over structured tool calling** — LLM outputs JSON text, we parse manually. More reliable with Groq models.
3. **Text-only input** — Voice features removed for MVP. Faster iteration, fewer dependencies, can add back later.
4. **Inline styles for colors** — Agent outputs style object with backgroundColor, color, --hover-bg. Tailwind JIT can't handle dynamically generated classes, inline styles always work.
5. **Hover via React events** — onMouseEnter/onMouseLeave handle hover colors using --hover-bg CSS variable. No CSS pseudo-classes needed.
6. **Tailwind for static layout only** — px-4, py-2, rounded, grid, etc. Never for colors (they're dynamic).
7. **Multiple items via children array** — Agent creates container with children for "3 cards" requests.
8. **Modify uses design state context** — Agent reads component IDs from design state to modify existing components.
9. **Zustand + persist middleware** — Designs save to localStorage automatically. Survives page refresh.
10. **RenderComponent is recursive** — cards/forms/sections can have children[], each rendered by the same switch
11. **Split layout** — canvas left, chat right (like VS Code + Copilot)
12. **History = full state snapshots** — simple but works for MVP, every action pushes to history[]
13. **`updateComponent` merges changes into `props`** — `changes` from the agent are props-level (`{ style, className, text, ... }`). Must be spread into `c.props`, not `c` root. `style` is deep-merged to preserve existing style keys.
14. **70B as sole model** — `llama-3.3-70b-versatile`, `maxTokens: 500`. 8B was dropped — it failed on complex components and triggered 70B retries anyway, costing more than just using 70B directly.
15. **Compact history** — Only `{ tool, message }` stored per assistant turn (not full JSON blob). Max 10 messages (5 turns).
16. **`extractJSON` is string-aware** — Brace-depth parser tracks `inString`/`escape` state to skip `{}` inside quoted strings. Prevents false "Unclosed JSON object" on LLM outputs with string values containing braces.
17. **`clear_canvas` tool** — Maps "delete all / clear everything / start over" to a single tool call. Store already had `clearCanvas()` — tool just wires it up end-to-end.
18. **Navbar uses logo/links/cta props only** — No children array. System prompt has explicit `NAVBAR RULE` + navbar as first example to prevent model from improvising nested containers.

## What Needs to Happen Next (Phase 3)

1. **Card variants** — pricing card, feature card, profile/testimonial card, product card
2. **Form components** — text, email, password, number inputs, textarea, select, checkboxes, radio, validation states
3. **Navigation** — header/navbar improvements, footer with columns
4. **Section/layout** — hero variants, features grid, CTA/banner, pricing section
5. **Conversational context** — resolve "it"/"the button" references, track lastModified, multi-turn context
6. **Update agent system prompt** — add all new component types and design principles

## Environment Variables Needed

```
GROQ_API_KEY=           # Get from console.groq.com
SMALLEST_AI_API_KEY=    # Get from smallest.ai dashboard
```

GROQ_API_KEY is **required** for the agent to work. SMALLEST_AI_API_KEY is optional (browser fallbacks work without it).

## Commands

```bash
npm run dev    # Start custom server with --watch (localhost:3000, Next.js + Socket.IO)
npm run build  # Production build
npm start      # Start production server (node server.js)
```
