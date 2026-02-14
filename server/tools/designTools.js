import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

// ─── Create Component ───
export const createComponentTool = createTool({
  id: "create_component",
  description:
    "Creates a UI component on the canvas. Use this for buttons, text/headings, cards, inputs, containers, images, dividers, navbars. For forms with multiple fields use create_form instead. For page sections (hero, features, pricing) use create_section instead.",
  inputSchema: z.object({
    type: z.enum([
      "button",
      "text",
      "heading",
      "card",
      "input",
      "container",
      "section",
      "image",
      "divider",
      "navbar",
    ]),
    props: z
      .object({
        text: z.string().optional(),
        variant: z.string().optional(),
        className: z.string().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        label: z.string().optional(),
        placeholder: z.string().optional(),
        inputType: z.string().optional(),
        logo: z.string().optional(),
        links: z.array(z.string()).optional(),
        cta: z.string().optional(),
        subtitle: z.string().optional(),
        width: z.string().optional(),
        height: z.string().optional(),
        src: z.string().optional(),
        alt: z.string().optional(),
      })
      .optional(),
    children: z
      .array(
        z.object({
          type: z.string(),
          props: z.record(z.any()).optional(),
        })
      )
      .optional(),
    parentId: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const { type, props = {}, children = [], parentId } = context;
    const id = `${type}_${uuidv4().slice(0, 8)}`;
    const childComponents = children.map((child) => ({
      id: `${child.type}_${uuidv4().slice(0, 8)}`,
      type: child.type,
      props: child.props || {},
      children: [],
    }));

    return {
      action: "add_component",
      component: {
        id,
        type,
        props,
        children: childComponents,
      },
      parentId: parentId || null,
    };
  },
});

// ─── Create Form ───
export const createFormTool = createTool({
  id: "create_form",
  description:
    "Creates a complete form with labeled fields, inputs, and a submit button. Use this when the user asks for a form, login form, signup form, contact form, etc.",
  inputSchema: z.object({
    fields: z.array(
      z.object({
        label: z.string(),
        type: z
          .enum(["text", "email", "password", "number", "textarea", "select"])
          .default("text"),
        placeholder: z.string().optional(),
        options: z.array(z.string()).optional(),
      })
    ),
    submitText: z.string().default("Submit"),
    title: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const { fields, submitText, title } = context;
    const formId = `form_${uuidv4().slice(0, 8)}`;
    const children = [];

    for (const field of fields) {
      children.push({
        id: `input_${uuidv4().slice(0, 8)}`,
        type: "input",
        props: {
          label: field.label,
          inputType: field.type,
          placeholder: field.placeholder || `Enter ${field.label.toLowerCase()}`,
          options: field.options,
        },
        children: [],
      });
    }

    children.push({
      id: `btn_${uuidv4().slice(0, 8)}`,
      type: "button",
      props: {
        text: submitText,
        variant: "primary",
      },
      children: [],
    });

    return {
      action: "add_component",
      component: {
        id: formId,
        type: "form",
        props: { title: title || "" },
        children,
      },
    };
  },
});

// ─── Create Section ───
export const createSectionTool = createTool({
  id: "create_section",
  description:
    "Creates a page section like hero, features grid, pricing, CTA, or testimonials. Use this for larger layout sections, not individual elements.",
  inputSchema: z.object({
    sectionType: z.enum(["hero", "features", "pricing", "cta", "testimonials", "footer"]),
    props: z
      .object({
        title: z.string().optional(),
        subtitle: z.string().optional(),
        variant: z.string().optional(),
        className: z.string().optional(),
      })
      .optional(),
    children: z
      .array(
        z.object({
          type: z.string(),
          props: z.record(z.any()).optional(),
          children: z
            .array(
              z.object({
                type: z.string(),
                props: z.record(z.any()).optional(),
              })
            )
            .optional(),
        })
      )
      .optional(),
  }),
  execute: async ({ context }) => {
    const { sectionType, props = {}, children = [] } = context;
    const sectionId = `section_${uuidv4().slice(0, 8)}`;

    const buildChildren = (items) =>
      items.map((item) => ({
        id: `${item.type}_${uuidv4().slice(0, 8)}`,
        type: item.type,
        props: item.props || {},
        children: item.children ? buildChildren(item.children) : [],
      }));

    let sectionChildren = children.length > 0 ? buildChildren(children) : [];

    if (sectionChildren.length === 0) {
      switch (sectionType) {
        case "hero":
          sectionChildren = [
            {
              id: `heading_${uuidv4().slice(0, 8)}`,
              type: "heading",
              props: { text: props.title || "Welcome to Our Platform", variant: "h1" },
              children: [],
            },
            {
              id: `text_${uuidv4().slice(0, 8)}`,
              type: "text",
              props: { text: props.subtitle || "Build something amazing with our powerful tools and services." },
              children: [],
            },
            {
              id: `btn_${uuidv4().slice(0, 8)}`,
              type: "button",
              props: { text: "Get Started", variant: "primary" },
              children: [],
            },
          ];
          break;
        case "features":
          sectionChildren = [1, 2, 3].map((n) => ({
            id: `card_${uuidv4().slice(0, 8)}`,
            type: "card",
            props: {
              title: `Feature ${n}`,
              description: `Description for feature ${n}. This is a great feature.`,
            },
            children: [],
          }));
          break;
        case "pricing":
          sectionChildren = ["Basic", "Pro", "Enterprise"].map((tier, i) => ({
            id: `card_${uuidv4().slice(0, 8)}`,
            type: "card",
            props: {
              title: tier,
              description: `$${(i + 1) * 29}/mo`,
              variant: i === 1 ? "highlighted" : "default",
            },
            children: [
              {
                id: `btn_${uuidv4().slice(0, 8)}`,
                type: "button",
                props: { text: "Choose Plan", variant: i === 1 ? "primary" : "outline" },
                children: [],
              },
            ],
          }));
          break;
        case "cta":
          sectionChildren = [
            {
              id: `heading_${uuidv4().slice(0, 8)}`,
              type: "heading",
              props: { text: props.title || "Ready to Get Started?", variant: "h2" },
              children: [],
            },
            {
              id: `text_${uuidv4().slice(0, 8)}`,
              type: "text",
              props: { text: props.subtitle || "Join thousands of satisfied customers today." },
              children: [],
            },
            {
              id: `btn_${uuidv4().slice(0, 8)}`,
              type: "button",
              props: { text: "Start Free Trial", variant: "primary" },
              children: [],
            },
          ];
          break;
        case "footer":
          sectionChildren = [
            {
              id: `text_${uuidv4().slice(0, 8)}`,
              type: "text",
              props: { text: "\u00a9 2026 Company. All rights reserved." },
              children: [],
            },
          ];
          break;
      }
    }

    return {
      action: "add_component",
      component: {
        id: sectionId,
        type: "section",
        props: {
          ...props,
          title: props.title || sectionType.charAt(0).toUpperCase() + sectionType.slice(1),
          variant: sectionType,
        },
        children: sectionChildren,
      },
    };
  },
});

// ─── Modify Component ───
export const modifyComponentTool = createTool({
  id: "modify_component",
  description:
    "Modifies an existing component on the canvas. Changes its props (text, variant, className, colors, etc). Use the componentId to target a specific component. If user says 'make it bigger' or 'change the color', use this tool on the last modified component.",
  inputSchema: z.object({
    componentId: z.string(),
    changes: z.object({
      props: z.record(z.any()).optional(),
      type: z.string().optional(),
    }),
  }),
  execute: async ({ context }) => {
    const { componentId, changes } = context;
    return {
      action: "update_component",
      componentId,
      changes,
    };
  },
});

// ─── Delete Component ───
export const deleteComponentTool = createTool({
  id: "delete_component",
  description:
    "Deletes a component from the canvas. Use when user says 'remove', 'delete', or 'get rid of' something.",
  inputSchema: z.object({
    componentId: z.string(),
  }),
  execute: async ({ context }) => {
    const { componentId } = context;
    return {
      action: "delete_component",
      componentId,
    };
  },
});

// ─── Undo Action ───
export const undoActionTool = createTool({
  id: "undo_action",
  description:
    "Undoes the last action on the canvas. Use when user says 'undo', 'go back', 'revert', or 'undo that'.",
  inputSchema: z.object({}),
  execute: async () => {
    return {
      action: "undo",
    };
  },
});
