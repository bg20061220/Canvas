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

const SYSTEM_PROMPT = `You are a UI design assistant. Convert user requests into a single JSON tool call.

RESPONSE FORMAT (always valid JSON, nothing else):
{"tool":"tool_name","params":{...},"message":"one sentence"}

TOOLS:
1. create_component — {type, props, children?}
   Types: button|text|heading|card|input|container|section|image|divider|navbar
2. create_form — {title?, fields:[{type,label,placeholder?,required?}], submitText?}
   Field types: text|email|password|number|textarea|select
3. create_section — {sectionType:"hero"|"features"|"pricing"|"cta"|"footer", content?:{title?,subtitle?,ctaText?}}
4. modify_component — {componentId, changes}  ← use id from CANVAS context
5. delete_component — {componentId}
6. undo_action — {}

COLORS: Always use style object, never Tailwind color classes.
  style:{"backgroundColor":"#hex","color":"#hex","--hover-bg":"#hex"}
  Blue:#3b82f6 DarkBlue:#2563eb Green:#22c55e Red:#ef4444 Yellow:#eab308
  Purple:#a855f7 Pink:#ec4899 Gray:#6b7280 White:#ffffff Black:#000000

LAYOUT: Use className for spacing/shape only: px-4 py-2 rounded gap-4 grid grid-cols-3 etc.

MULTIPLE ITEMS: Use a container with children array.
MODIFY: Read componentId from CANVAS context below.
ONE tool call per response.

EXAMPLES:
{"tool":"create_component","params":{"type":"button","props":{"text":"Click","style":{"backgroundColor":"#3b82f6","color":"#ffffff","--hover-bg":"#2563eb"},"className":"px-4 py-2 rounded"}},"message":"Added blue button!"}
{"tool":"create_section","params":{"sectionType":"hero","content":{"title":"Welcome","ctaText":"Get Started"}},"message":"Created hero section!"}
{"tool":"create_component","params":{"type":"container","props":{"className":"grid grid-cols-3 gap-4"},"children":[{"type":"card","props":{"title":"F1","description":"Desc","className":"p-4"}},{"type":"card","props":{"title":"F2","description":"Desc","className":"p-4"}},{"type":"card","props":{"title":"F3","description":"Desc","className":"p-4"}}]},"message":"Created 3 cards!"}`;

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

  // Compact state context — skip entirely if canvas is empty
  const components = designState.components || [];
  const stateContext = components.length > 0
    ? `CANVAS:${JSON.stringify(components.map(c => ({ id: c.id, type: c.type, text: c.props?.text || c.props?.title || "" })))} LAST:${designState.context?.lastModified || "none"}`
    : `CANVAS:empty`;

  // Prepare messages
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history,
    {
      role: "user",
      content: stateContext + "\n" + userMessage,
    },
  ];

  try {
    const result = await generateText({
      model: groq("llama-3.1-8b-instant"),
      messages,
      maxTokens: 400,
    });

    console.log("🔍 [Backend] Raw LLM response:", result.text);

    // Parse JSON from response
    let toolCall;
    try {
      let jsonText = result.text.trim();
      if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      }
      toolCall = JSON.parse(jsonText);
    } catch (parseError) {
      console.error("❌ [Backend] Failed to parse JSON, retrying with 70b:", parseError);

      // Retry once with the larger model
      const retry = await generateText({
        model: groq("llama-3.3-70b-versatile"),
        messages,
        maxTokens: 400,
      });
      let jsonText = retry.text.trim();
      if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      }
      try {
        toolCall = JSON.parse(jsonText);
      } catch {
        return {
          text: "Sorry, I had trouble understanding that. Can you try rephrasing?",
          toolResults: [],
        };
      }
    }

    console.log("🟢 [Backend] Parsed tool call:", {
      tool: toolCall.tool,
      params: toolCall.params,
    });

    // Execute the tool
    const toolResult = await executeTool(toolCall.tool, toolCall.params);

    console.log("🟡 [Backend] Tool returned:", toolResult);

    // Store compact history — just user message + tool name (not full JSON blob)
    history.push({ role: "user", content: userMessage });
    history.push({ role: "assistant", content: JSON.stringify({ tool: toolCall.tool, message: toolCall.message }) });

    // Keep last 10 messages (5 turns)
    if (history.length > 10) {
      history.splice(0, history.length - 10);
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
