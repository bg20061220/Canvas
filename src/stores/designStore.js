import { create } from "zustand";
import { persist } from "zustand/middleware";

const useDesignStore = create(
  persist(
    (set, get) => ({
  // Component tree on the canvas
  components: [],

  // Current theme
  theme: {
    primaryColor: "#3b82f6",
    secondaryColor: "#8b5cf6",
    fontFamily: "Inter",
    style: "modern",
  },

  // Conversation/design context
  context: {
    lastModified: null,
    currentSection: null,
    designIntent: "professional",
  },

  // History stack for undo/redo
  history: [],
  future: [],

  // ---- Actions ----

  addComponent: (component, insertBefore = null) => {
    const state = get();
    let newComponents;
    if (insertBefore) {
      const idx = state.components.findIndex((c) => c.id === insertBefore);
      if (idx !== -1) {
        newComponents = [...state.components.slice(0, idx), component, ...state.components.slice(idx)];
      } else {
        newComponents = [...state.components, component];
      }
    } else {
      newComponents = [...state.components, component];
    }
    set({
      history: [...state.history, { components: [...state.components] }],
      future: [],
      components: newComponents,
      context: { ...state.context, lastModified: component.id },
    });
  },

  updateComponent: (id, changes) => {
    const state = get();

    // Normalize: agent sometimes wraps changes in a redundant "props" key
    const normalized = changes.props && typeof changes.props === "object" ? changes.props : changes;

    function applyUpdate(components) {
      return components.map((c) => {
        if (c.id === id) {
          return {
            ...c,
            props: {
              ...c.props,
              ...normalized,
              ...(normalized.style ? { style: { ...c.props?.style, ...normalized.style } } : {}),
            },
          };
        }
        if (c.children?.length > 0) {
          return { ...c, children: applyUpdate(c.children) };
        }
        return c;
      });
    }

    set({
      history: [...state.history, { components: [...state.components] }],
      future: [],
      components: applyUpdate(state.components),
      context: { ...state.context, lastModified: id },
    });
  },

  removeComponent: (id) => {
    const state = get();

    function applyRemove(components) {
      return components
        .filter((c) => c.id !== id)
        .map((c) => c.children?.length > 0 ? { ...c, children: applyRemove(c.children) } : c);
    }

    set({
      history: [...state.history, { components: [...state.components] }],
      future: [],
      components: applyRemove(state.components),
    });
  },

  addChildComponent: (parentId, child, insertBefore = null) => {
    const state = get();

    function applyAdd(components) {
      return components.map((c) => {
        if (c.id === parentId) {
          const siblings = c.children || [];
          let newChildren;
          if (insertBefore) {
            const idx = siblings.findIndex((s) => s.id === insertBefore);
            if (idx !== -1) {
              newChildren = [...siblings.slice(0, idx), child, ...siblings.slice(idx)];
            } else {
              newChildren = [...siblings, child];
            }
          } else {
            newChildren = [...siblings, child];
          }
          return { ...c, children: newChildren };
        }
        if (c.children?.length > 0) {
          return { ...c, children: applyAdd(c.children) };
        }
        return c;
      });
    }

    set({
      history: [...state.history, { components: [...state.components] }],
      future: [],
      components: applyAdd(state.components),
      context: { ...state.context, lastModified: parentId },
    });
  },

  undo: () => {
    const state = get();
    if (state.history.length === 0) return;
    const prev = state.history[state.history.length - 1];
    set({
      future: [{ components: [...state.components] }, ...state.future],
      history: state.history.slice(0, -1),
      components: prev.components,
    });
  },

  redo: () => {
    const state = get();
    if (state.future.length === 0) return;
    const next = state.future[0];
    set({
      history: [...state.history, { components: [...state.components] }],
      future: state.future.slice(1),
      components: next.components,
    });
  },

  clearCanvas: () => {
    const state = get();
    set({
      history: [...state.history, { components: [...state.components] }],
      future: [],
      components: [],
    });
  },

  setTheme: (theme) => set({ theme: { ...get().theme, ...theme } }),

  // Bulk replace components (used by socket to apply agent state)
  setComponents: (components) => {
    const state = get();
    set({
      history: [...state.history, { components: [...state.components] }],
      future: [],
      components,
    });
  },
    }),
    {
      name: "voice-canvas-storage", // localStorage key
      partialPersist: true, // Only persist what we specify
      // Don't persist history/future (keeps localStorage small)
      partialize: (state) => ({
        components: state.components,
        theme: state.theme,
        context: state.context,
      }),
    }
  )
);

export default useDesignStore;
