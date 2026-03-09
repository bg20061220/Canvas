/**
 * Converts the component tree to a standalone HTML file with Tailwind CDN.
 * Colors are kept as inline styles (same as renderer — Tailwind JIT can't handle runtime values).
 */

function styleToString(style) {
  if (!style || typeof style !== "object") return "";
  return Object.entries(style)
    .filter(([k]) => !k.startsWith("--")) // skip CSS vars like --hover-bg
    .map(([k, v]) => {
      const prop = k.replace(/([A-Z])/g, (m) => `-${m.toLowerCase()}`);
      return `${prop}: ${v}`;
    })
    .join("; ");
}

function styleAttr(style) {
  const s = styleToString(style);
  return s ? ` style="${s}"` : "";
}

function componentToHTML(component, level = 1) {
  const { type, props = {}, children = [] } = component;
  const pad = "  ".repeat(level);
  const pad2 = "  ".repeat(level + 1);

  const childrenHTML = (extraLevel = 0) =>
    children.map((c) => componentToHTML(c, level + 1 + extraLevel)).join("\n");

  switch (type) {
    case "button": {
      const defaultClass =
        props.variant === "outline"
          ? "px-6 py-2.5 rounded-lg font-medium border-2 border-blue-500 text-blue-500"
          : props.variant === "ghost"
          ? "px-6 py-2.5 rounded-lg font-medium text-blue-500"
          : props.variant === "secondary"
          ? "px-6 py-2.5 rounded-lg font-medium bg-gray-600 text-white"
          : "px-6 py-2.5 rounded-lg font-medium bg-blue-600 text-white";
      const cls = props.className || defaultClass;
      return `${pad}<button class="${cls}"${styleAttr(props.style)}>${
        props.text || props.content || "Button"
      }</button>`;
    }

    case "text":
    case "heading": {
      const tag = props.tag || (type === "heading" ? "h2" : "p");
      const defaultClass =
        tag === "h1"
          ? "text-4xl font-bold"
          : tag === "h2"
          ? "text-3xl font-bold"
          : tag === "h3"
          ? "text-2xl font-semibold"
          : tag === "h4"
          ? "text-xl font-semibold"
          : "text-base";
      const cls = props.className || defaultClass;
      return `${pad}<${tag} class="${cls}"${styleAttr(props.style)}>${
        props.text || props.content || "Text element"
      }</${tag}>`;
    }

    case "card": {
      const cls =
        props.className ||
        "bg-gray-800 border border-gray-700 rounded-xl p-6";
      let inner = "";
      if (props.title)
        inner += `\n${pad2}<h3 class="text-xl font-semibold mb-2">${props.title}</h3>`;
      if (props.subtitle)
        inner += `\n${pad2}<p class="text-gray-400 text-sm mb-1">${props.subtitle}</p>`;
      if (props.price) {
        inner += `\n${pad2}<div class="my-3">`;
        inner += `\n${pad2}  <span class="text-3xl font-bold">${props.price}</span>`;
        if (props.period)
          inner += `<span class="text-gray-400 text-sm ml-1">${props.period}</span>`;
        inner += `\n${pad2}</div>`;
      }
      if (props.description)
        inner += `\n${pad2}<p class="text-gray-400">${props.description}</p>`;
      if (props.features && Array.isArray(props.features)) {
        inner += `\n${pad2}<ul class="mt-3 space-y-1">`;
        props.features.forEach((f) => {
          inner += `\n${pad2}  <li class="text-gray-300 text-sm flex items-center gap-2"><span class="text-green-400">✓</span>${f}</li>`;
        });
        inner += `\n${pad2}</ul>`;
      }
      if (children.length > 0) {
        inner += `\n${pad2}<div class="mt-4 space-y-3">`;
        inner += `\n${childrenHTML(1)}`;
        inner += `\n${pad2}</div>`;
      }
      return `${pad}<div class="${cls}"${styleAttr(props.style)}>${inner}\n${pad}</div>`;
    }

    case "input": {
      const cls = props.className || "flex flex-col gap-1.5";
      let inner = "";
      if (props.label)
        inner += `\n${pad2}<label class="text-sm font-medium text-gray-300">${props.label}</label>`;
      inner += `\n${pad2}<input type="${props.inputType || "text"}" placeholder="${
        props.placeholder || ""
      }" class="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"${styleAttr(props.style)} />`;
      return `${pad}<div class="${cls}">${inner}\n${pad}</div>`;
    }

    case "container":
    case "section": {
      const defaultClass =
        props.variant === "hero"
          ? "rounded-xl p-6 py-16 text-center bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/20"
          : "rounded-xl p-6 bg-gray-900 border border-gray-800";
      const cls = props.className || defaultClass;
      let inner = "";
      if (props.title)
        inner += `\n${pad2}<h2 class="text-3xl font-bold mb-2">${props.title}</h2>`;
      if (props.subtitle)
        inner += `\n${pad2}<p class="text-gray-400 mb-6">${props.subtitle}</p>`;
      if (children.length > 0) {
        inner += `\n${pad2}<div class="space-y-4">`;
        inner += `\n${childrenHTML(1)}`;
        inner += `\n${pad2}</div>`;
      }
      return `${pad}<div class="${cls}"${styleAttr(props.style)}>${inner}\n${pad}</div>`;
    }

    case "image": {
      const cls =
        props.className ||
        "bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center";
      const inlineStyle = `width: ${props.width || "100%"}; height: ${
        props.height || "200px"
      }${props.style ? "; " + styleToString(props.style) : ""}`;
      return `${pad}<div class="${cls}" style="${inlineStyle}">
${pad2}<svg class="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
${pad2}  <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21z" />
${pad2}</svg>
${pad}</div>`;
    }

    case "divider":
      return `${pad}<hr class="border-gray-700 my-4" />`;

    case "form": {
      const cls =
        props.className ||
        "bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4";
      let inner = "";
      if (props.title)
        inner += `\n${pad2}<h3 class="text-xl font-semibold mb-4">${props.title}</h3>`;
      if (children.length > 0) inner += `\n${childrenHTML()}`;
      return `${pad}<form class="${cls}"${styleAttr(props.style)}>${inner}\n${pad}</form>`;
    }

    case "navbar": {
      const cls =
        props.className ||
        "flex items-center justify-between px-6 py-4 bg-gray-900 border border-gray-800 rounded-xl";
      const links = props.links || ["Home", "Features", "Pricing", "Contact"];
      const ctaChild = children.find((c) => c.type === "button");
      let inner = `\n${pad2}<span class="text-xl font-bold">${
        props.logo || "Logo"
      }</span>`;
      inner += `\n${pad2}<div class="flex items-center gap-6">`;
      links.forEach((link) => {
        inner += `\n${pad2}  <a href="#" class="text-gray-400 hover:text-white text-sm transition-colors">${link}</a>`;
      });
      inner += `\n${pad2}</div>`;
      if (ctaChild) inner += `\n${componentToHTML(ctaChild, level + 1)}`;
      return `${pad}<nav class="${cls}"${styleAttr(props.style)}>${inner}\n${pad}</nav>`;
    }

    default:
      return `${pad}<!-- Unknown component: ${type} -->`;
  }
}

export function generateHTML(components) {
  if (!components || components.length === 0) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Exported Design</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-950 text-white p-8 font-sans">
  <p class="text-gray-500">No components to export.</p>
</body>
</html>`;
  }

  const body = components.map((c) => componentToHTML(c, 2)).join("\n\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Exported Design</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    body { font-family: 'Inter', sans-serif; }
  </style>
</head>
<body class="bg-gray-950 text-white p-8 space-y-6">

${body}

</body>
</html>`;
}
