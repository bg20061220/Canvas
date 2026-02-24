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
   NOTE: create_section creates default layouts (2 feature cards, 2 pricing cards)
   For specific numbers (e.g., "3 cards"), create individual cards with create_component instead

4. modify_component
   Params: { componentId: "component_id", changes: { /* props to update */ } }
   CRITICAL: Look at CURRENT DESIGN STATE context to find the componentId
   - User says "change the hero section" → find component with type="section" and variant="hero"
   - User says "change the last button" → find the most recent button component
   - User says "change the first card" → find the first card component
   Example: If design state shows [{id:"section_abc", type:"section", variant:"hero"}],
   use componentId: "section_abc"

5. delete_component
   Params: { componentId: "component_id" }

6. undo_action
   Params: {}

RULES:
1. ALWAYS respond with valid JSON
2. Use INLINE STYLES for colors (backgroundColor, color) - NOT Tailwind classes
3. Use Tailwind className ONLY for spacing, layout, shapes (px-4, py-2, rounded, etc.)
4. Keep message short (1 sentence)

COLOR SYSTEM:
- Use style object for ALL colors: { backgroundColor: "#hex", color: "#hex" }
- For hover: use CSS variables like --hover-bg in style, combine with Tailwind group-hover
- DO NOT use bg-[#hex] or text-[#hex] - they won't work dynamically

COMMON HEX CODES:
- Red: #ef4444, #dc2626, #b91c1c
- Orange: #f97316, #ea580c
- Yellow: #eab308, #ca8a04
- Green: #22c55e, #16a34a, #15803d
- Blue: #3b82f6, #2563eb, #1d4ed8
- Purple: #a855f7, #9333ea
- Pink: #ec4899, #db2777
- Gray: #6b7280, #4b5563, #374151
- White: #ffffff, Black: #000000
- Brown: #92400e, #78350f

EXAMPLES:

User: "create a blue button"
Response: {"tool":"create_component","params":{"type":"button","props":{"text":"Button","style":{"backgroundColor":"#3b82f6","color":"#ffffff","--hover-bg":"#2563eb"},"className":"px-4 py-2 rounded transition-colors"}},"message":"Added a blue button!"}

User: "add a hero section"
Response: {"tool":"create_section","params":{"sectionType":"hero","content":{"title":"Welcome","ctaText":"Get Started"}},"message":"Created hero section!"}

User: "make a contact form"
Response: {"tool":"create_form","params":{"title":"Contact Us","fields":[{"type":"text","label":"Name"},{"type":"email","label":"Email"},{"type":"textarea","label":"Message"}],"submitText":"Send"},"message":"Created contact form!"}

User: "create a yellow button that turns red on hover"
Response: {"tool":"create_component","params":{"type":"button","props":{"text":"Button","style":{"backgroundColor":"#eab308","color":"#ffffff","--hover-bg":"#ef4444"},"className":"px-4 py-2 rounded transition-colors"}},"message":"Added yellow button with red hover!"}

User: "change the button color to green"
Response: {"tool":"modify_component","params":{"componentId":"button_123","changes":{"style":{"backgroundColor":"#22c55e","color":"#ffffff","--hover-bg":"#16a34a"}}},"message":"Changed to green!"}

User: "make the button bigger"
Response: {"tool":"modify_component","params":{"componentId":"button_123","changes":{"className":"px-6 py-3 text-lg rounded transition-colors"}},"message":"Made button bigger!"}

User: "create 3 feature cards"
Response: {"tool":"create_component","params":{"type":"container","props":{"className":"grid grid-cols-3 gap-4"},"children":[{"type":"card","props":{"title":"Feature 1","description":"Great feature","className":"p-4"}},{"type":"card","props":{"title":"Feature 2","description":"Amazing feature","className":"p-4"}},{"type":"card","props":{"title":"Feature 3","description":"Awesome feature","className":"p-4"}}]}},"message":"Created 3 feature cards!"}

User: "create a blue card with a yellow button inside"
Response: {"tool":"create_component","params":{"type":"card","props":{"title":"Card Title","style":{"backgroundColor":"#3b82f6","color":"#ffffff"},"className":"p-6"},"children":[{"type":"button","props":{"text":"Click Me","style":{"backgroundColor":"#eab308","color":"#000000"},"className":"px-4 py-2 rounded mt-4"}}]}},"message":"Created card with button!"}

IMPORTANT RULES:
- Colors go in style object: backgroundColor, color, --hover-bg (CSS variable)
- Layout/spacing goes in className: px-4, py-2, rounded, text-lg, etc.
- For hover colors, set --hover-bg CSS variable
- NEVER use bg-blue-500 or bg-[#hex] in className - colors MUST be in style object
- For specific numbers ("3 cards"), create a container with all items as children
- To modify existing components, look at design state context for componentId and use modify_component
- For nested components (card with button), use children array in create_component
- You can only make ONE tool call per response - use children array for multiple items`;

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
