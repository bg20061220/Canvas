# Voice Canvas - Claude Session Context

> **Read this file first in any new session.** It has everything you need to continue building without re-reading the whole codebase.

## What This App Is

A voice-first web app where users speak commands to design web components on a live canvas. Say "create a pricing card" and it appears. Say "make the button blue" and it updates. The agent understands context, maintains design state, and responds via voice.

## Current Status

**Phase 1: COMPLETE** — Foundation + voice pipeline + UI layout
**Phase 2: NOT STARTED** — Agent + Socket.IO + voice-to-canvas loop

The app runs (`npm run dev` → localhost:3000) and shows a split-panel layout. Voice input/output hooks exist but the AI agent is not wired yet. The chat sidebar shows a placeholder "Agent not connected" message.

## Tech Stack

| Layer | Tool | Package |
|-------|------|---------|
| Framework | Next.js (App Router) | `next` (v16) |
| Language | JavaScript (NOT TypeScript) | — |
| Styling | Tailwind CSS v4 | `tailwindcss`, `@tailwindcss/postcss` |
| State | Zustand | `zustand` |
| WebSocket | Socket.IO | `socket.io`, `socket.io-client` |
| Agent | Mastra AI | `@mastra/core` |
| LLM | Groq (Llama 3.3 70B) | `@ai-sdk/groq` |
| STT | Smallest.AI (fallback: browser SpeechRecognition) | REST API |
| TTS | Smallest.AI (fallback: browser SpeechSynthesis) | REST API |
| IDs | uuid | `uuid` |

## File Map

```
Canvas/
├── app/
│   ├── layout.js              # Root layout. Dark theme, Inter font, html class="dark"
│   ├── page.js                # Main page. Split layout: canvas (left) + chat sidebar (right)
│   │                          #   - Manages: status, messages[], voiceEnabled, textInput
│   │                          #   - Uses: useVoiceInput, useVoiceOutput, useDesignStore
│   │                          #   - TODO: Wire handleTranscript to Socket.IO → agent
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
│   │   ├── socket/                 # (empty) Socket.IO client setup goes here (Phase 2)
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
├── server/                         # (empty dirs) Backend code goes here in Phase 2
│   ├── agent/                      # Mastra AI agent config
│   ├── tools/                      # Agent tool definitions (create_component, modify, etc.)
│   └── socket/                     # Socket.IO server setup
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

1. **Zustand over Context** — simpler API, no provider wrapping, works outside React
2. **RenderComponent is recursive** — cards/forms/sections can have children[], each rendered by the same switch
3. **STT/TTS have auto-fallback** — if Smallest.AI key missing or fails, uses free browser APIs
4. **Split layout** — canvas left, chat right (like VS Code + Copilot)
5. **History = full state snapshots** — simple but works for hackathon, every action pushes to history[]
6. **Agent doesn't touch DOM** — it produces component objects, Zustand stores them, React renders them

## What Needs to Happen Next (Phase 2)

1. **Mastra AI agent** in `server/agent/` — system prompt as UI design assistant, Groq provider
2. **Agent tools** in `server/tools/` — `create_component`, `create_form`, `create_section`, `modify_component`, `delete_component`, `undo_action`
3. **Socket.IO server** — attach to Next.js, handle `user_input` event → run agent → emit `tool_call` + `agent_response`
4. **Socket.IO client** in `src/lib/socket/` — `useSocket` hook
5. **Wire page.js** — `handleTranscript` sends text via socket instead of placeholder, received tool_calls update designStore, agent_response text goes to TTS

## Environment Variables Needed

```
GROQ_API_KEY=           # Get from console.groq.com
SMALLEST_AI_API_KEY=    # Get from smallest.ai dashboard
```

Both are empty in `.env.local` right now. Browser fallbacks work without them.

## Commands

```bash
npm run dev    # Start dev server (localhost:3000)
npm run build  # Production build
npm start      # Start production server
```
