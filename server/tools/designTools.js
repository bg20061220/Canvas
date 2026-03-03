import { v4 as uuidv4 } from "uuid";

// ─── Create Component ───
export async function createComponent({ type, props = {}, children = [], parentId, insertBefore = null }) {
  const id = `${type}_${uuidv4().slice(0, 8)}`;
  let childComponents = (children || []).map((child) => ({
    id: `${child.type}_${uuidv4().slice(0, 8)}`,
    type: child.type,
    props: child.props || {},
    children: [],
  }));

  // Navbar: auto-generate CTA as a real button child so it has its own ID and is targetable
  if (type === "navbar" && props.cta) {
    childComponents = [
      ...childComponents,
      {
        id: `button_${uuidv4().slice(0, 8)}`,
        type: "button",
        props: {
          text: props.cta,
          style: { backgroundColor: "#3b82f6", color: "#ffffff", "--hover-bg": "#2563eb" },
          className: "px-4 py-2 rounded-lg text-sm font-medium",
        },
        children: [],
      },
    ];
  }

  return {
    action: "add_component",
    component: {
      id,
      type,
      props,
      children: childComponents,
    },
    parentId: parentId || null,
    insertBefore: insertBefore || null,
  };
}

// ─── Create Form ───
export async function createForm({ title, fields, submitText = "Submit", insertBefore = null }) {
  const formId = `form_${uuidv4().slice(0, 8)}`;
  const fieldComponents = fields.map((field) => ({
    id: `input_${uuidv4().slice(0, 8)}`,
    type: "input",
    props: {
      label: field.label,
      placeholder: field.placeholder || "",
      inputType: field.type,
      className: field.required ? "required" : "",
    },
    children: [],
  }));

  const submitButton = {
    id: `button_${uuidv4().slice(0, 8)}`,
    type: "button",
    props: {
      text: submitText,
      variant: "primary",
      className: "w-full",
    },
    children: [],
  };

  return {
    action: "add_component",
    component: {
      id: formId,
      type: "form",
      props: { title: title || "Form", className: "space-y-4" },
      children: [...fieldComponents, submitButton],
    },
    insertBefore: insertBefore || null,
  };
}

// ─── Create Section ───
export async function createSection({ sectionType, content = {}, insertBefore = null }) {
  const sectionId = `section_${uuidv4().slice(0, 8)}`;
  let children = [];

  switch (sectionType) {
    case "hero":
      children = [
        {
          id: `heading_${uuidv4().slice(0, 8)}`,
          type: "heading",
          props: {
            text: content.title || "Welcome to Our Product",
            variant: "h1",
            className: "text-5xl font-bold mb-4",
          },
          children: [],
        },
        {
          id: `text_${uuidv4().slice(0, 8)}`,
          type: "text",
          props: {
            text:
              content.subtitle ||
              "Build amazing things with our powerful platform",
            className: "text-xl text-gray-600 mb-8",
          },
          children: [],
        },
        {
          id: `button_${uuidv4().slice(0, 8)}`,
          type: "button",
          props: {
            text: content.ctaText || "Get Started",
            variant: "primary",
            className: "text-lg px-8 py-3",
          },
          children: [],
        },
      ];
      break;

    case "features":
      children = [
        {
          id: `heading_${uuidv4().slice(0, 8)}`,
          type: "heading",
          props: {
            text: content.title || "Features",
            variant: "h2",
            className: "text-3xl font-bold mb-8 text-center",
          },
          children: [],
        },
        {
          id: `card_${uuidv4().slice(0, 8)}`,
          type: "card",
          props: {
            title: "Feature 1",
            description: "Amazing feature description",
          },
          children: [],
        },
        {
          id: `card_${uuidv4().slice(0, 8)}`,
          type: "card",
          props: {
            title: "Feature 2",
            description: "Another great feature",
          },
          children: [],
        },
      ];
      break;

    case "pricing":
      children = [
        {
          id: `heading_${uuidv4().slice(0, 8)}`,
          type: "heading",
          props: {
            text: content.title || "Pricing",
            variant: "h2",
            className: "text-3xl font-bold mb-8 text-center",
          },
          children: [],
        },
        {
          id: `card_${uuidv4().slice(0, 8)}`,
          type: "card",
          props: {
            title: "Basic",
            description: "$9/month",
            variant: "pricing",
          },
          children: [],
        },
        {
          id: `card_${uuidv4().slice(0, 8)}`,
          type: "card",
          props: {
            title: "Pro",
            description: "$29/month",
            variant: "pricing",
          },
          children: [],
        },
      ];
      break;

    case "cta":
      children = [
        {
          id: `heading_${uuidv4().slice(0, 8)}`,
          type: "heading",
          props: {
            text: content.title || "Ready to get started?",
            variant: "h2",
            className: "text-3xl font-bold mb-4 text-center",
          },
          children: [],
        },
        {
          id: `button_${uuidv4().slice(0, 8)}`,
          type: "button",
          props: {
            text: content.ctaText || "Start Now",
            variant: "primary",
            className: "mx-auto text-lg px-8 py-3",
          },
          children: [],
        },
      ];
      break;

    case "footer":
      children = [
        {
          id: `text_${uuidv4().slice(0, 8)}`,
          type: "text",
          props: {
            text: "© 2024 Your Company. All rights reserved.",
            className: "text-center text-gray-600",
          },
          children: [],
        },
      ];
      break;
  }

  return {
    action: "add_component",
    component: {
      id: sectionId,
      type: "section",
      props: {
        variant: sectionType,
        className: "py-12 px-6",
      },
      children,
    },
    insertBefore: insertBefore || null,
  };
}

// ─── Modify Component ───
export async function modifyComponent({ componentId, changes }) {
  return {
    action: "update_component",
    componentId,
    changes,
  };
}

// ─── Delete Component ───
export async function deleteComponent({ componentId }) {
  return {
    action: "delete_component",
    componentId,
  };
}

// ─── Undo Action ───
export async function undoAction() {
  return {
    action: "undo",
  };
}

// ─── Clear Canvas ───
export async function clearCanvas() {
  return {
    action: "clear_canvas",
  };
}

// ─── Add Child ───
export async function addChild({ parentId, child, insertBefore = null }) {
  const newChild = {
    id: `${child.type}_${uuidv4().slice(0, 8)}`,
    type: child.type,
    props: child.props || {},
    children: [],
  };
  return {
    action: "add_child",
    parentId,
    child: newChild,
    insertBefore: insertBefore || null,
  };
}
