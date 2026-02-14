import { create } from "zustand";

const useDesignStore = create((set, get) => ({
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

  addComponent: (component) => {
    const state = get();
    set({
      history: [...state.history, { components: [...state.components] }],
      future: [],
      components: [...state.components, component],
      context: { ...state.context, lastModified: component.id },
    });
  },

  updateComponent: (id, changes) => {
    const state = get();
    set({
      history: [...state.history, { components: [...state.components] }],
      future: [],
      components: state.components.map((c) =>
        c.id === id ? { ...c, ...changes, props: { ...c.props, ...changes.props } } : c
      ),
      context: { ...state.context, lastModified: id },
    });
  },

  removeComponent: (id) => {
    const state = get();
    set({
      history: [...state.history, { components: [...state.components] }],
      future: [],
      components: state.components.filter((c) => c.id !== id),
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
}));

export default useDesignStore;
