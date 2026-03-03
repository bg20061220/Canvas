# Voice Canvas - Claude Session Context

> **Read this file first in any new session.** It has everything you need to continue building without re-reading the whole codebase.

## What This App Is

A text-based web app where users type commands to design web components on a live canvas. Type "create a pricing card" and it appears. Type "make the button blue" and it updates instantly. The agent understands context, maintains design state, and supports nested components. Voice features planned for later.

## Current Status

**Phase 1: COMPLETE** — Foundation + UI layout
**Phase 2: COMPLETE** — Agent + Socket.IO + text-to-canvas loop (+ all bug fixes)
**Phase 3: PARTIALLY COMPLETE** — Child targeting ✅, add_child ✅, card variants ✅, ordering ✅ | voice context pending
**Phase 5: IN PROGRESS** — Export feature next

The app runs (`node server.js` → localhost:3000). **Text input only** (voice removed for MVP). Uses Groq-powered AI agent with **manual JSON parsing**. All 15 core interactions work end-to-end including nested child targeting, component ordering, and API fallback chains.

## Tech Stack

| Layer | Tool | Package |
|-------|------|---------|
| Framework | Next.js (App Router) | `next` |
| Language | JavaScript (NOT TypeScript) | — |
| Styling | Tailwind CSS v3 | `tailwindcss`, `autoprefixer` |
| State | Zustand + persist | `zustand` |
| WebSocket | Socket.IO | `socket.io`, `socket.io-client` |
| AI/LLM | Vercel AI SDK + Groq | `ai`, `@ai-sdk/groq` |
| Model | **Llama 3.3 70B Versatile** (sole model) | via Groq API |
| Fallback | OpenRouter free models | `@openrouter/ai-sdk-provider` |
| Tool Calling | Manual JSON parsing | Custom implementation |
| Persistence | localStorage | Browser API via Zustand persist |
| IDs | uuid | `uuid` |

## File Map

```
Canvas/
├── app/
│   ├── layout.js              # Root layout. Dark theme, Inter font
│   ├── page.js                # Main page. Canvas (left) + chat sidebar (right)
│   │                          #   Handles all tool actions: add_component, update_component,
│   │                          #   delete_component, undo, add_child, clear_canvas
│   │                          #   Pulls addChildComponent + clearCanvas from store
│   ├── globals.css            # Tailwind import + custom animations
│   └── api/                   # (empty)
│
├── src/
│   ├── components/
│   │   ├── canvas/
│   │   │   ├── CanvasRenderer.js   # Reads designStore.components[], maps each to RenderComponent
│   │   │   └── RenderComponent.js  # Switch on component.type → renders React element
│   │   │                           # Types: button, text/heading, card, input, container/section,
│   │   │                           #        image, divider, form, navbar
│   │   │                           # Card renders: title, subtitle, price, period, description, features[]
│   │   │                           # Navbar: CTA rendered from children.find(c => c.type === "button")
│   │   │                           # All support recursive children
│   │   └── voice/
│   │       └── MicButton.js        # (unused in MVP)
│   │
│   ├── lib/
│   │   └── socket/
│   │       └── useSocket.js        # useSocket({ onToolCall, onAgentResponse, onThinking, onError })
│   │                               # Stale closure fix: all callbacks stored in refs, updated each render
│   │                               # Returns: { isConnected, sendInput(text, state), sendInterrupt() }
│   │
│   └── stores/
│       └── designStore.js          # Zustand store — single source of truth
│                                   # State: components[], theme, context, history[], future[]
│                                   # Actions:
│                                   #   addComponent(component, insertBefore?)
│                                   #   updateComponent(id, changes) — recursive applyUpdate()
│                                   #   removeComponent(id) — recursive applyRemove()
│                                   #   addChildComponent(parentId, child, insertBefore?)
│                                   #   setComponents, setTheme, undo, redo, clearCanvas
│
├── server.js                       # Custom Node.js server: Next.js + Socket.IO on same port
│
├── server/
│   ├── agent/
│   │   └── designAgent.js          # runAgent(text, designState, sessionId) → { text, toolResults[] }
│   │                               #   Primary: Groq llama-3.3-70b-versatile, maxTokens: 500
│   │                               #   Fallback on 429: OpenRouter free models (stepfun → arcee → nvidia)
│   │                               #   flattenComponents() → agent sees ALL IDs including children
│   │                               #   Compact history: { tool, message } only, max 10 messages
│   │                               #   params guard in executeTool (throws if params undefined)
│   ├── tools/
│   │   └── designTools.js          # 8 tool functions:
│   │                               #   create_component — auto-generates button child for navbar cta
│   │                               #   create_form — fields[] + submit button
│   │                               #   create_section — hero/features/pricing/cta/footer with insertBefore
│   │                               #   modify_component — pass-through
│   │                               #   delete_component — pass-through
│   │                               #   undo_action — pass-through
│   │                               #   clear_canvas — returns { action: "clear_canvas" }
│   │                               #   add_child — generates UUID for child, returns add_child action
│   └── socket/
│       └── handler.js              # user_input → runAgent → emit tool_call + agent_response
│
├── plan.md / progress.md / context.md
├── .env.local                      # GROQ_API_KEY, OPENROUTER_API_KEY
└── package.json
```

## Component Data Shape

```js
{
  id: "btn_1abc2def",     // uuid-generated: type_uuid8chars
  type: "button",         // button | text | heading | card | input | container | section | image | divider | form | navbar
  props: {
    text: "Sign Up",      // display text (button, text, heading)
    variant: "primary",   // button variants: primary/secondary/outline/ghost
    className: "",        // Tailwind layout classes (spacing, grid, rounded — NOT colors)
    style: {              // inline styles for colors (Tailwind JIT can't handle runtime classes)
      backgroundColor: "#3b82f6",
      color: "#ffffff",
      "--hover-bg": "#2563eb",   // handled via onMouseEnter/Leave in RenderComponent
    },
    // card: title, subtitle, price, period, description, features[]
    // input: label, placeholder, inputType
    // section/container: title, subtitle, variant ("hero")
    // navbar: logo, links[], cta (string — auto-generates button child)
    // image: width, height
  },
  children: [],           // nested component objects (same shape, recursive)
}
```

## Key Architecture Decisions

1. **No Mastra framework** — Using AI SDK directly with manual JSON parsing.
2. **Manual JSON parsing over structured tool calling** — More reliable with Groq models.
3. **Text-only input for MVP** — Voice removed. Can add back cleanly on top of working text system.
4. **Inline styles for colors** — Agent outputs `style: { backgroundColor, color, --hover-bg }`. Tailwind JIT can't handle runtime-generated classes.
5. **Hover via React events** — `onMouseEnter/Leave` on buttons handle `--hover-bg`. No CSS pseudo-classes.
6. **Tailwind for static layout only** — `px-4 py-2 rounded grid` etc. Never for colors.
7. **Multiple items via container children** — Agent wraps cards/etc in a `container` with `children[]`.
8. **70B as sole model** — `llama-3.3-70b-versatile`, `maxTokens: 500`. 8B failure rate too high.
9. **OpenRouter fallback chain on Groq 429** — `stepfun/step-3.5-flash:free` → `arcee-ai/trinity-large-preview:free` → `nvidia/nemotron-3-nano-30b-a3b:free`. Each validated for `params` before accepting.
10. **Compact history** — Only `{ tool, message }` stored per turn. Max 10 messages (5 turns).
11. **String-aware `extractJSON`** — Tracks `inString`/`escape` state. Skips `{}` inside strings. Prevents false "Unclosed JSON" errors.
12. **`clear_canvas` tool** — Maps "delete all / start over" → `clearCanvas()` in store.
13. **Navbar CTA as real child** — `createComponent` auto-generates a `button` child with its own UUID when `props.cta` is set. Agent can target it by ID. Renderer finds it via `children.find(c => c.type === "button")`.
14. **Flat context for agent** — `flattenComponents()` recursively walks entire tree and adds `parent` field to children. Agent sees all IDs including deeply nested ones.
15. **Recursive store operations** — `applyUpdate()`, `applyRemove()`, `applyAdd()` walk `children[]` at every level. Nested components can be targeted, deleted, and added.
16. **`updateComponent` merges into `props`** — Changes are props-level. Merged as `{ ...c.props, ...changes }`. Style is deep-merged. Agent sometimes wraps in `{ props: {...} }` — store normalizes this.
17. **`insertBefore` ordering** — All three creation tools (`create_component`, `create_form`, `create_section`) support `insertBefore` param. Store splices at correct index instead of appending.
18. **Stale closure fix in `useSocket`** — Socket listeners capture callbacks in refs updated each render. Avoids stale `onToolCall` after re-renders (was breaking `clear_canvas` until page refresh).
19. **History = full state snapshots** — Every mutating action pushes `components` to `history[]`. Undo pops and restores.
20. **Zustand + persist** — Designs auto-save to localStorage. Survive page refresh.

## What's Working End-to-End ✅

- Create: navbar, hero, feature cards, pricing cards, forms, sections, containers
- Modify: any component including nested children by ID
- Add child to existing component
- Delete: top-level and nested components
- Ordering: insertBefore on all creation tools
- Undo / redo
- Clear canvas (instant, no refresh needed)
- LocalStorage persistence
- Groq rate limit → OpenRouter fallback chain

## What's Left (Priority Order)

1. **Code export** — HTML/Tailwind download button (highest value)
2. **UI buttons** — Clear canvas + Undo in the toolbar
3. **Better default styling** — Spacing, typography defaults
4. **Voice input** — Add back on top of working text system

## Environment Variables

```
GROQ_API_KEY=           # Required — console.groq.com
OPENROUTER_API_KEY=     # For fallback chain — openrouter.ai
```

## Commands

```bash
npm run dev    # Start custom server with --watch (localhost:3000)
npm run build  # Production build
npm start      # Start production server (node server.js)
```
