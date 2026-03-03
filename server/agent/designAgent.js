import { createGroq } from "@ai-sdk/groq";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import {
  createComponent,
  createForm,
  createSection,
  modifyComponent,
  deleteComponent,
  undoAction,
  clearCanvas,
  addChild,
} from "../tools/designTools.js";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const SYSTEM_PROMPT = `You are a UI design assistant. Convert user requests into a single JSON tool call.

RESPONSE FORMAT (always valid JSON, nothing else):
{"tool":"tool_name","params":{...},"message":"one sentence"}
CRITICAL: Every { must have a matching }. Never use ) to close an object.

TOOLS:
1. create_component — {type, props, children?, insertBefore?}
   Types: button|text|heading|card|input|container|section|image|divider|navbar
   navbar props: {logo:"Name", links:["Home","About"], cta:"Button text"}
   card props: {title, description?, subtitle?, price?"$9/mo", period?"per month", features?:["Feature 1","Feature 2"]}
   NAVBAR RULE: navbar uses ONLY logo/links/cta props. NO children array. The CTA button is auto-generated as a child — to modify it, find its button_xxx id in CANVAS context.
   ORDERING: use insertBefore with a componentId from CANVAS to place the new component above an existing one.
   Example: footer exists → add pricing section above it → insertBefore: "section_footer_id"
2. create_form — {title?, fields:[{type,label,placeholder?,required?}], submitText?, insertBefore?}
   Field types: text|email|password|number|textarea|select
3. create_section — {sectionType:"hero"|"features"|"pricing"|"cta"|"footer", content?:{title?,subtitle?,ctaText?}, insertBefore?}
4. modify_component — {componentId, changes}
   changes can ONLY update props: style, className, text, title, placeholder, etc.
   CANNOT add/remove children — use add_child or delete_component for that.
5. add_child — {parentId, child:{type, props}, insertBefore?}  ← adds a new child to an existing component
   Use for: "add a field to the form", "add a button to the card", "add an item to the container"
   parentId: the id of the parent from CANVAS context
   child: same shape as create_component params (type + props, no id needed)
   insertBefore: child id to insert before (for ordering within parent)
6. delete_component — {componentId}  ← works on both top-level and nested children
7. undo_action — {}
8. clear_canvas — {}  ← use this for "delete all", "clear everything", "start over"

COLORS: Always use style object, never Tailwind color classes.
  style:{"backgroundColor":"#hex","color":"#hex","--hover-bg":"#hex"}
  Blue:#3b82f6 DarkBlue:#2563eb Green:#22c55e Red:#ef4444 Yellow:#eab308
  Purple:#a855f7 Pink:#ec4899 Gray:#6b7280 White:#ffffff Black:#000000

LAYOUT: Use className for spacing/shape only: px-4 py-2 rounded gap-4 grid grid-cols-3 etc.

MULTIPLE ITEMS: Use a container with children array.
ONE tool call per response.

CHILD TARGETING RULE: CANVAS context shows every component including nested children.
Each child has a "parent" field showing which component contains it.
When user refers to "the button in the form" or "the heading in the hero":
  → Find the component with matching type AND whose parent matches the container
  → Use THAT child's id as componentId — NOT the parent's id
Example: CANVAS has [{"id":"form_abc","type":"form"},{"id":"button_xyz","type":"button","parent":"form_abc"}]
User: "make the form button green" → componentId must be "button_xyz", NOT "form_abc"

EXAMPLES:
{"tool":"create_component","params":{"type":"navbar","props":{"logo":"LaunchKit","links":["Home","Features","Pricing"],"cta":"Get Started"}},"message":"Created navbar!"}
{"tool":"create_component","params":{"type":"button","props":{"text":"Click","style":{"backgroundColor":"#3b82f6","color":"#ffffff","--hover-bg":"#2563eb"},"className":"px-4 py-2 rounded"}},"message":"Added blue button!"}
{"tool":"create_section","params":{"sectionType":"hero","content":{"title":"Welcome","ctaText":"Get Started"}},"message":"Created hero section!"}
{"tool":"modify_component","params":{"componentId":"button_xyz","changes":{"style":{"backgroundColor":"#22c55e","color":"#ffffff","--hover-bg":"#16a34a"}}},"message":"Made the form button green!"}
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
    clear_canvas: clearCanvas,
    add_child: addChild,
  };

  const tool = tools[toolName];
  if (!tool) {
    throw new Error(`Unknown tool: ${toolName}`);
  }
  if (!params) {
    throw new Error(`Tool "${toolName}" returned no params — model likely truncated the response`);
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

  // Flatten full component tree (including children) so agent can see all IDs
  function flattenComponents(components, parentId = null) {
    const result = [];
    for (const c of components) {
      result.push({ id: c.id, type: c.type, text: c.props?.text || c.props?.title || "", ...(parentId ? { parent: parentId } : {}) });
      if (c.children?.length > 0) {
        result.push(...flattenComponents(c.children, c.id));
      }
    }
    return result;
  }

  const components = designState.components || [];
  const stateContext = components.length > 0
    ? `CANVAS:${JSON.stringify(flattenComponents(components))} LAST:${designState.context?.lastModified || "none"}`
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
    // Parse JSON from response — extract first {...} block, ignore trailing commentary.
    // Properly skips { } characters inside string values so they don't affect depth.
    function extractJSON(text) {
      let s = text.trim();
      if (s.startsWith("```")) {
        s = s.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      }
      const start = s.indexOf("{");
      if (start === -1) throw new Error("No JSON object found");
      let depth = 0;
      let inString = false;
      let escape = false;
      for (let i = start; i < s.length; i++) {
        const ch = s[i];
        if (escape)        { escape = false; continue; }
        if (ch === "\\")   { escape = true;  continue; }
        if (ch === '"')    { inString = !inString; continue; }
        if (inString)      continue;
        if (ch === "{")    depth++;
        else if (ch === "}") {
          depth--;
          if (depth === 0) return JSON.parse(s.slice(start, i + 1));
        }
      }
      throw new Error("Unclosed JSON object");
    }

    let result;
    try {
      result = await generateText({
        model: groq("llama-3.3-70b-versatile"),
        messages,
        maxTokens: 500,
      });
      console.log("🔍 [Backend] Raw LLM response (Groq):", result.text);
    } catch (groqError) {
      const isRateLimit = groqError?.status === 429 || groqError?.message?.includes("rate") || groqError?.message?.includes("limit");
      if (isRateLimit && process.env.OPENROUTER_API_KEY) {
        console.warn("⚠️ [Backend] Groq rate limit hit, falling back to OpenRouter...");
        const fallbackModels = [
          "stepfun/step-3.5-flash:free",
          "arcee-ai/trinity-large-preview:free",
          "nvidia/nemotron-3-nano-30b-a3b:free",
        ];
        let lastError;
        for (const modelId of fallbackModels) {
          try {
            const candidate = await generateText({
              model: openrouter(modelId),
              messages,
              maxTokens: 500,
            });
            const parsed = extractJSON(candidate.text);
            if (!parsed.params) {
              console.warn(`⚠️ [Backend] ${modelId} returned no params, trying next model`);
              lastError = new Error(`${modelId} returned no params`);
              continue;
            }
            result = candidate;
            console.log(`🔍 [Backend] Raw LLM response (OpenRouter/${modelId}):`, candidate.text);
            break;
          } catch (fallbackError) {
            console.warn(`⚠️ [Backend] ${modelId} failed:`, fallbackError.message);
            lastError = fallbackError;
          }
        }
        if (!result) throw lastError;
      } else {
        throw groqError;
      }
    }

    let toolCall;
    try {
      toolCall = extractJSON(result.text);
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
