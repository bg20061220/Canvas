Voice-Controlled Creative Canvas - Project Documentation

**CURRENT STATUS:** Text-only MVP (voice features removed for simplicity). Working agent that creates/modifies components via text commands. LocalStorage persistence enabled.

Project Overview
A ~~voice-first~~ **text-based** web application for designing web components, UI elements, and complete pages through natural conversation. Users type commands to create, modify, and export designs in real-time. The agent understands design context and provides streaming visual feedback.

Core Value Proposition
Problem: Traditional design tools require extensive GUI interaction - clicking through menus, dragging elements, adjusting properties. This is slow for rapid iteration and prototyping of web components.
Solution: Voice-driven design that feels like working with a design partner. Say "create a pricing card" or "make the button more prominent" and see it happen instantly. The agent understands design principles, maintains context, and creates beautiful UI components through conversation.
Why Voice Wins: Designers and developers iterate rapidly ("try blue", "make it wider", "add more space"). Voice is 3x faster than navigating GUI tools for these refinements. Perfect for rapid prototyping, exploring variations, and building component libraries.

Target Use Cases

Component library creation: Build design systems and reusable UI components through voice
Rapid prototyping: Create landing pages, forms, dashboards in minutes through conversation
Developer handoff: Generate production-ready code for buttons, cards, navbars, forms
Design exploration: Quickly try variations ("show me 3 different hero styles")
Non-designers: People without design skills can create professional-looking components
Accessibility: Design without needing to use mouse/keyboard extensively


Supported Component Types
Basic Elements

Buttons (primary, secondary, outline, ghost, etc.)
Text elements (headings, paragraphs, labels)
Images (with various treatments)
Icons and icon groups
Dividers and spacers

Form Components

Input fields (text, email, password, number, etc.)
Textareas
Select dropdowns
Checkboxes and radio buttons
Form groups and fieldsets
Submit buttons
Form validation states

Card Components

Basic cards
Pricing cards
Feature cards
Product cards
Profile cards
Testimonial cards

Navigation

Headers/navbars
Footers
Breadcrumbs
Tabs
Sidebars
Mobile menus

Layout Sections

Hero sections (various layouts)
Feature sections (grids, rows, alternating)
CTA sections
Testimonial sections
Pricing sections
FAQ sections
Contact sections

Complete Pages

Landing pages
Sign-up/login pages
Pricing pages
About pages
Contact pages


Feature List
Core Voice Agent Features (Universal)

Conversational state management

Track entities and references across conversation ("that button", "the form", "the first card")
Maintain design context (current theme, last modified element, component relationships)
Resolve pronouns and implicit references
Remember component hierarchies (which button is inside which card)


Multi-step tool orchestration

Chain multiple design tools based on complex requests
Example: "Make this look professional" → fix typography + adjust spacing + refine colors
Example: "Create a complete contact form" → create form container + add fields + style + add validation
Plan and execute multi-step design workflows


Streaming responses

Start visual updates immediately (don't wait for full response)
Progressive element building with voice narration
Parallel streams: visual updates + voice output
Example: Form appears field-by-field as agent speaks


Self-correction loop

Execute design change
Evaluate result aesthetically
If wrong or ugly → diagnose issue → try different approach
Iterate until satisfactory or give up gracefully
Example: Creates button too large → "Actually that's too dominant, let me balance it"


Interruption handling

User can cut off agent mid-sentence
Stop TTS playback immediately
Cancel pending operations
Pick up conversation gracefully
Preserve design state across interruption


Adaptive verbosity

Detailed explanations on first interaction
Concise responses for repeated actions
Match user's communication style (brief vs detailed)
Example: First button: "I've created a primary button with rounded corners, blue background, and white text"
Example: Fifth button: "Button added"


Proactive awareness

Notice design issues unprompted
Suggest improvements autonomously
Examples:

"The form fields aren't aligned. Want me to fix that?"
"This button doesn't meet accessibility contrast ratios. Should I adjust?"
"You have 3 different button styles. Want me to standardize them?"
"The form is missing labels. Should I add them?"





Design Canvas Specific Features

Real-time visual updates

Each tool call triggers immediate canvas change
No page refreshes or loading states
Smooth transitions between states
User sees design build in real-time


Design context intelligence

Understand and maintain design themes (modern, minimal, bold, etc.)
Apply consistent color schemes automatically
Recognize when elements don't fit aesthetic
Make design decisions based on principles (balance, hierarchy, spacing, accessibility)
Maintain component consistency (all buttons same style unless specified)
Understand design system patterns


Ambiguity resolution

"Make it bigger" → determine what "it" refers to (last modified element)
"Add some space" → determine where (between elements, padding, margins)
"Change the color" → determine which element and which color property
Ask clarifying questions when truly ambiguous
Example: "Which button - the submit button or the cancel button?"


Progressive element building

Complex components created step-by-step
Voice narration during creation
Example: "Creating your pricing card... adding header... adding price... adding features list... adding CTA button... done!"
User sees each piece appear as it's described


Visual design validation

Evaluate aesthetics after changes
Check accessibility (contrast ratios, font sizes, touch targets)
Verify responsive behavior
Ensure form usability
Self-correct design violations
Example: Detects button text is unreadable → increases contrast automatically


Undo/redo via voice

"Go back" reverts last change
"Undo that" cancels specific action
"Try the previous version" restores earlier state
Maintains history stack
Can describe what will be undone


Design state persistence

Remember entire component/page across session
Track all elements and relationships
Maintain history for undo
Preserve theme and context
Can resume work later


Multi-element coordination

Adjust related elements when one changes
Example: Increase form field size → adjust labels and spacing to match
Example: Change button style → update all buttons to maintain consistency
Maintain layout balance automatically
Ensure parent-child relationships stay intact


Export to code

Generate clean, production-ready HTML/CSS
Optional: Tailwind CSS classes
Optional: React/Vue components
Downloadable as files
Properly structured and formatted
Includes accessibility attributes
Responsive by default




Technical Stack (Finalized)

Frontend

Framework: Next.js (App Router) with React - JavaScript (not TypeScript)
UI Rendering: React components for canvas
Styling: Tailwind CSS v3 (generated code also uses Tailwind) - v4 removed due to hover variant issues
State Management: Zustand + persist middleware (localStorage for persistence across refreshes)
Audio: Web Audio API for voice capture
Voice Activity Detection: @ricky0123/vad-web (optional, fallback to manual push-to-talk)
Communication: Socket.IO Client (socket.io-client)
Code Display: prism-react-renderer (for export code preview)
Unique IDs: uuid

Backend

AI/LLM: Vercel AI SDK (@ai-sdk/groq) + Groq

Model: Llama 3.3 70B (via Groq)
Purpose: Natural language understanding, design reasoning
Implementation: Manual JSON parsing (no structured tool calling)
Process: LLM outputs JSON text → we parse → execute tool functions
Why: Groq models have inconsistent structured tool calling support; manual parsing is more reliable
Why Groq: Extremely fast inference, good for real-time UX


Tool Execution: Plain JavaScript functions

No framework wrapper (removed Mastra)
6 functions: createComponent, createForm, createSection, modifyComponent, deleteComponent, undoAction
Each returns standardized action objects
Simpler, more transparent, easier to debug


WebSocket Server: Socket.IO (socket.io)

Purpose: Real-time bidirectional communication between frontend and backend
Handles: User input streaming, agent response streaming, interrupts
Why Socket.IO: Auto-reconnect, fallback transport, room support, easy event handling



Voice Services

**REMOVED FOR MVP** - Focusing on text-only input for stability and simplicity.

Voice features (STT/TTS, mic button) were stripped out to reduce complexity and dependencies. Can be added back later if needed. The core design-to-code functionality works perfectly with text commands.



Infrastructure

WebSocket Server: Socket.IO running alongside Next.js (custom server or API route)
Database: None (localStorage for MVP persistence)
Deployment: Vercel (frontend) or single Node.js server for hackathon


System Architecture
┌─────────────────────────────────────────────────────────┐
│  Frontend (React/Next.js)                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────┐         ┌────────────────────┐   │
│  │  Voice Input     │         │  Canvas Renderer   │   │
│  │  - Web Audio API │         │  - React Components│   │
│  │  - VAD           │         │  - Real-time updates│  │
│  │  - Smallest.AI   │         │  - Smooth animations│  │
│  │    STT           │         │                    │   │
│  └────────┬─────────┘         └─────────▲──────────┘   │
│           │                             │              │
│           │ (transcribed text)          │              │
│           ▼                             │              │
│  ┌──────────────────────────────────────┴──────────┐   │
│  │  WebSocket Client                              │   │
│  │  - Sends: user input, interrupts               │   │
│  │  - Receives: tool calls, agent responses       │   │
│  └────────┬───────────────────────────────────────┘   │
│           │                             ▲              │
│           │                             │              │
│  ┌────────▼─────────┐         ┌─────────┴──────────┐   │
│  │  Voice Output    │         │  State Manager     │   │
│  │  - Smallest.AI   │         │  - Design state    │   │
│  │    TTS           │         │  - History stack   │   │
│  │  - Interruptible │         │  - Context tracking│   │
│  └──────────────────┘         └────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
                            ↕
                    (WebSocket Connection)
                            ↕
┌─────────────────────────────────────────────────────────┐
│  Backend (Node.js/Python)                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  WebSocket Server                                │   │
│  │  - Handles connections                           │   │
│  │  - Streams responses                             │   │
│  │  - Manages interrupts                            │   │
│  └────────┬─────────────────────────────────────────┘   │
│           │                                             │
│           ▼                                             │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Mastra AI Agent                                 │   │
│  │  ┌────────────────────────────────────────────┐  │   │
│  │  │  Core Agent Loop                           │  │   │
│  │  │  - Receives user input                     │  │   │
│  │  │  - Plans actions (LLM reasoning)           │  │   │
│  │  │  - Selects tools                           │  │   │
│  │  │  - Executes tools                          │  │   │
│  │  │  - Self-evaluates                          │  │   │
│  │  │  - Self-corrects if needed                 │  │   │
│  │  └────────────────────────────────────────────┘  │   │
│  │                                                  │   │
│  │  ┌────────────────────────────────────────────┐  │   │
│  │  │  Memory System                             │  │   │
│  │  │  - Conversation history                    │  │   │
│  │  │  - Design state                            │  │   │
│  │  │  - Context tracking                        │  │   │
│  │  └────────────────────────────────────────────┘  │   │
│  │                                                  │   │
│  │  ┌────────────────────────────────────────────┐  │   │
│  │  │  Tool Registry                             │  │   │
│  │  │                                            │  │   │
│  │  │  Component Creation Tools:                 │  │   │
│  │  │  - create_button()                         │  │   │
│  │  │  - create_form()                           │  │   │
│  │  │  - create_card()                           │  │   │
│  │  │  - create_section()                        │  │   │
│  │  │  - create_navigation()                     │  │   │
│  │  │                                            │  │   │
│  │  │  Modification Tools:                       │  │   │
│  │  │  - modify_style()                          │  │   │
│  │  │  - update_layout()                         │  │   │
│  │  │  - adjust_spacing()                        │  │   │
│  │  │  - change_colors()                         │  │   │
│  │  │                                            │  │   │
│  │  │  Content Tools:                            │  │   │
│  │  │  - generate_text()                         │  │   │
│  │  │  - add_placeholder_image()                 │  │   │
│  │  │                                            │  │   │
│  │  │  Validation Tools:                         │  │   │
│  │  │  - validate_design()                       │  │   │
│  │  │  - check_accessibility()                   │  │   │
│  │  │                                            │  │   │
│  │  │  History Tools:                            │  │   │
│  │  │  - undo_last_action()                      │  │   │
│  │  │  - get_previous_state()                    │  │   │
│  │  │                                            │  │   │
│  │  │  Export Tools:                             │  │   │
│  │  │  - export_html_css()                       │  │   │
│  │  │  - export_react_component()                │  │   │
│  │  │  - export_tailwind()                       │  │   │
│  │  └────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Design State Manager                            │   │
│  │  - Current component tree                        │   │
│  │  - Theme and style context                       │   │
│  │  - History stack (for undo/redo)                 │   │
│  │  - Last modified element tracker                 │   │
│  │  - Component relationships                       │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘

Data Flow
Complete User Interaction Cycle
1. User speaks: "Create a login form"
2. Frontend: Web Audio API captures audio
3. Frontend: Send audio to Smallest.AI STT
4. Frontend: Receive transcribed text "Create a login form"
5. Frontend: Send text to backend via WebSocket
6. Backend: Mastra agent receives input
7. Backend: Agent reasons with LLM
   - Understands: User wants a login form
   - Plans: Need email field, password field, submit button, labels
   - Decides: Call create_form tool with specific parameters
8. Backend: Execute create_form tool
   - Generate form structure
   - Add email input with validation
   - Add password input
   - Add submit button
   - Apply styling
9. Backend: Stream result to frontend (progressive updates)
10. Frontend: Receive updates via WebSocket
11. Frontend: Update canvas (form appears progressively)
12. Frontend: Send narration to Smallest.AI TTS
13. Frontend: Play audio "Creating your login form..."
14. Backend: Continue streaming sub-elements
15. Frontend: Progressive updates (each field appears as narrated)
16. User interrupts: "Wait, make the button bigger"
17. Frontend: Detect speech during playback, cancel TTS
18. Frontend: Send interrupt + new input to backend
19. Backend: Cancel pending operations
20. Backend: Process new input "make the button bigger"
21. Backend: Agent reasons, selects modify_style tool
22. Backend: Execute modify_style
23. Backend: Evaluate result → too big
24. Backend: Self-correction triggered
25. Backend: Stream correction to frontend
26. Frontend: Update button size (users see it change, then correct)
27. Frontend: Play audio "Actually, that's too big. Let me balance it..."
28. Cycle complete, waiting for next input

Streaming Strategy
Two Parallel Streams
Visual Stream (Primary)

Agent decides tool call → immediately send to frontend → canvas updates
Progressive building: form container → email field → password field → button
User sees design build in real-time

Audio Stream (Secondary)

Agent narration sent to TTS while visual updates happen
"Creating your form..." (during container render)
"Adding email field..." (while field appears)
Audio plays during or slightly after visual changes

Key Insight: Visual updates happen BEFORE or DURING voice playback, not after. Makes experience feel 3x faster.

WebSocket Message Format
Frontend → Backend
json{
  "type": "user_input",
  "text": "Create a hero section",
  "timestamp": "..."
}

{
  "type": "interrupt",
  "timestamp": "..."
}
Backend → Frontend
json// Tool execution
{
  "type": "tool_call",
  "tool": "create_button",
  "result": {
    "elementId": "btn_123",
    "component": { /* component data */ }
  },
  "state": { /* updated design state */ }
}

// Agent narration
{
  "type": "agent_narration",
  "text": "Creating a primary button...",
  "speak": true
}

// Self-correction
{
  "type": "correction",
  "text": "Actually, let me adjust that...",
  "update": { /* corrected state */ },
  "speak": true
}

// Question/clarification
{
  "type": "question",
  "text": "Which button do you mean?",
  "options": ["submit", "cancel"],
  "speak": true
}

Design State Structure
javascript{
  components: [
    {
      id: "hero_1",
      type: "hero_section",
      layout: "image-left-text-right",
      properties: { /* styles */ },
      children: [
        { id: "hero_heading", type: "heading", content: "...", properties: {} },
        { id: "hero_cta", type: "button", variant: "primary", properties: {} }
      ]
    }
  ],
  
  theme: {
    primaryColor: "#3b82f6",
    fontFamily: "Inter",
    spacing: "consistent",
    style: "modern-minimal"
  },
  
  context: {
    lastModified: "hero_cta",
    currentSection: "hero_1",
    designIntent: "professional"
  },
  
  history: [
    { action: "create", elementId: "hero_1", timestamp: "...", state: {} }
  ]
}

Performance Targets
STT (Smallest.AI):        < 500ms
Agent reasoning (Mastra):  < 1000ms
Tool execution:           < 100ms
Canvas update (React):    < 50ms
TTS (Smallest.AI):        < 300Claude's response was interruptedRetryokay also what is a playwright skill9:40 PMA 





