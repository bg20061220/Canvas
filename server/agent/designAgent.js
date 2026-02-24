import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";
import {
  createComponent,
  createForm,
  createSection,
  modifyComponent,
  deleteComponent,
  undoAction,
} from "../tools/designTools.js";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

const SYSTEM_PROMPT = `You are a UI design assistant. Users type commands to create and modify web components.

YOUR JOB: Convert user requests into JSON tool calls.

RESPONSE FORMAT - You must respond with JSON in this exact format:
{
  "tool": "tool_name",
  "params": { /* tool parameters */ },
  "message": "Short message to user"
}

AVAILABLE TOOLS:

1. create_component
   Params: { type, props, children?, parentId? }
   Types: "button" | "text" | "heading" | "card" | "input" | "container" | "section" | "image" | "divider" | "navbar"
   Props examples:
   - button: { text: "Click me", variant: "primary", className: "bg-blue-500 text-white px-4 py-2 rounded" }
   - text: { text: "Some text", className: "text-gray-700" }
   - heading: { text: "Title", variant: "h1", className: "text-4xl font-bold" }
   - card: { title: "Card Title", description: "Description" }

2. create_form
   Params: { title?, fields: [{type, label, placeholder?, required?}], submitText? }
   Field types: "text" | "email" | "password" | "number" | "textarea" | "select"

3. create_section
   Params: { sectionType: "hero" | "features" | "pricing" | "cta" | "footer", content?: {title?, subtitle?, ctaText?} }

4. modify_component
   Params: { componentId: "component_id", changes: { /* props to update */ } }

5. delete_component
   Params: { componentId: "component_id" }

6. undo_action
   Params: {}

RULES:
1. ALWAYS respond with valid JSON
2. Use Tailwind classes for styling in className
3. Keep message short (1 sentence)
4. For colors, use Tailwind classes like "bg-blue-500 text-white"

EXAMPLES:

User: "create a blue button"
Response: {"tool":"create_component","params":{"type":"button","props":{"text":"Button","variant":"primary","className":"bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded"}},"message":"Added a blue button!"}

User: "add a hero section"
Response: {"tool":"create_section","params":{"sectionType":"hero","content":{"title":"Welcome","ctaText":"Get Started"}},"message":"Created hero section!"}

User: "make a contact form"
Response: {"tool":"create_form","params":{"title":"Contact Us","fields":[{"type":"text","label":"Name"},{"type":"email","label":"Email"},{"type":"textarea","label":"Message"}],"submitText":"Send"},"message":"Created contact form!"}`;

// Conversation history per session
const sessionHistory = new Map();

// Tool executor
async function executeTool(toolName, params) {
  const tools = {
    create_component: createComponent,
    create_form: createForm,
    create_section: createSection,
    modify_component: modifyComponent,
    delete_component: deleteComponent,
    undo_action: undoAction,
  };

  const tool = tools[toolName];
  if (!tool) {
    throw new Error(`Unknown tool: ${toolName}`);
  }

  return await tool(params);
}

export async function runAgent(
  userMessage,
  designState = {},
  sessionId = "default"
) {
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
- Last modified: ${designState.context?.lastModified || "none"}`;

  // Prepare messages
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history,
    {
      role: "user",
      content: stateContext + "\n\nUser request: " + userMessage,
    },
  ];

  try {
    // Use llama-3.3-70b-versatile without tools (text generation only)
    const result = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      messages,
    });

    console.log("🔍 [Backend] Raw LLM response:", result.text);

    // Parse JSON from response
    let toolCall;
    try {
      // Extract JSON from response (might have markdown code blocks)
      let jsonText = result.text.trim();

      // Remove markdown code blocks if present
      if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      }

      toolCall = JSON.parse(jsonText);
    } catch (parseError) {
      console.error("❌ [Backend] Failed to parse JSON:", parseError);
      return {
        text: "Sorry, I had trouble understanding that. Can you try rephrasing?",
        toolResults: [],
      };
    }

    console.log("🟢 [Backend] Parsed tool call:", {
      tool: toolCall.tool,
      params: toolCall.params,
    });

    // Execute the tool
    const toolResult = await executeTool(toolCall.tool, toolCall.params);

    console.log("🟡 [Backend] Tool returned:", toolResult);

    // Add to history
    history.push({ role: "user", content: userMessage });
    history.push({ role: "assistant", content: result.text });

    // Keep history manageable (last 20 messages)
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }

    return {
      text: toolCall.message || "Done!",
      toolResults: [
        {
          tool: toolCall.tool,
          args: toolCall.params,
          result: toolResult,
        },
      ],
    };
  } catch (error) {
    console.error("❌ [Agent] Error:", error);
    return {
      text: "Sorry, something went wrong. Please try again.",
      toolResults: [],
    };
  }
}

export function clearSession(sessionId = "default") {
  sessionHistory.delete(sessionId);
}
