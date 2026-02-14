import { Agent } from "@mastra/core/agent";
import { createGroq } from "@ai-sdk/groq";
import {
  createComponentTool,
  createFormTool,
  createSectionTool,
  modifyComponentTool,
  deleteComponentTool,
  undoActionTool,
} from "../tools/designTools.js";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

const SYSTEM_PROMPT = `You are a UI design assistant for a voice-controlled canvas app. Users speak commands to create and modify web components.

YOUR JOB: Convert user requests into tool calls that create/modify components on a live canvas.

AVAILABLE TOOLS:
- create_component: Create buttons, text, headings, cards, inputs, containers, images, dividers, navbars
- create_form: Create complete forms with fields and submit button
- create_section: Create page sections (hero, features, pricing, cta, testimonials, footer)
- modify_component: Change properties of an existing component
- delete_component: Remove a component
- undo_action: Undo the last change

COMPONENT TYPES & PROPS:
- button: { text, variant: "primary"|"secondary"|"outline"|"ghost", className }
- text: { text, className }
- heading: { text, variant: "h1"|"h2"|"h3", className }
- card: { title, description, variant: "default"|"highlighted", className }
- input: { label, placeholder, inputType: "text"|"email"|"password"|"number"|"textarea"|"select", className }
- container: { className }
- section: { title, subtitle, variant: "hero"|"features"|"pricing"|"cta", className }
- image: { src, alt, width, height, className }
- divider: { className }
- navbar: { logo, links: string[], cta, className }
- form: { title, className }

RULES:
1. ALWAYS use tools. Never just describe what you would do—actually do it with tool calls.
2. For ambiguous references ("it", "the button", "that"), use the lastModified component ID from the design state.
3. When creating sections, use create_section for hero/features/pricing/cta.
4. When user says "undo" or "go back", use undo_action.
5. Use appropriate Tailwind classes in className for custom styling (e.g., "text-red-500", "bg-blue-600 text-white px-8 py-4 text-lg rounded-xl").
6. For color changes, set the className prop with Tailwind color classes.
7. For size changes (bigger/smaller), use Tailwind sizing classes in className.
8. You can call multiple tools in one response for complex requests (e.g., "create a landing page" → hero + features + cta sections).

RESPONSE STYLE:
- Keep narration SHORT (1-2 sentences max). The user hears this via TTS.
- Be conversational: "Done! Added a blue button." not "I have created a button component with primary variant."
- If self-correcting: "Actually, let me adjust that..."
- For multi-step: "Creating your landing page..." then the tools handle the rest.`;

// Create the Mastra agent
const designAgent = new Agent({
  name: "design-agent",
  instructions: SYSTEM_PROMPT,
  model: groq("llama-3.3-70b-versatile"),
  tools: {
    create_component: createComponentTool,
    create_form: createFormTool,
    create_section: createSectionTool,
    modify_component: modifyComponentTool,
    delete_component: deleteComponentTool,
    undo_action: undoActionTool,
  },
});

// Conversation history per session
const sessionHistory = new Map();

export async function runAgent(userMessage, designState = {}, sessionId = "default") {
  // Get or create conversation history for this session
  if (!sessionHistory.has(sessionId)) {
    sessionHistory.set(sessionId, []);
  }
  const history = sessionHistory.get(sessionId);

  // Build context about current design state
  const stateContext = `
CURRENT DESIGN STATE:
- Components on canvas: ${designState.components?.length || 0}
- Component list: ${JSON.stringify(
    (designState.components || []).map((c) => ({
      id: c.id,
      type: c.type,
      text: c.props?.text || c.props?.title || "",
    })),
    null,
    2
  )}
- Last modified: ${designState.context?.lastModified || "none"}
- Theme: ${JSON.stringify(designState.theme || {})}`;

  // Add user message to history
  history.push({ role: "user", content: userMessage });

  // Keep history manageable (last 20 messages)
  if (history.length > 20) {
    history.splice(0, history.length - 20);
  }

  // Prepend state context to the latest user message for the agent
  const messagesWithContext = [...history];
  messagesWithContext[messagesWithContext.length - 1] = {
    role: "user",
    content: stateContext + "\n\nUser request: " + userMessage,
  };

  const result = await designAgent.generate(messagesWithContext, {
    maxSteps: 5,
  });

  // Collect all tool results from steps
  const toolResults = [];
  if (result.steps) {
    for (const step of result.steps) {
      if (step.toolCalls) {
        for (const tc of step.toolCalls) {
          toolResults.push({
            tool: tc.toolName,
            args: tc.args,
            result: step.toolResults?.find((tr) => tr.toolCallId === tc.toolCallId)?.result,
          });
        }
      }
    }
  }

  // Get agent's text response
  const agentText = result.text || "Done!";

  // Add assistant response to history
  history.push({ role: "assistant", content: agentText });

  return {
    text: agentText,
    toolResults,
  };
}

export function clearSession(sessionId = "default") {
  sessionHistory.delete(sessionId);
}
