"use client";

import useDesignStore from "@/src/stores/designStore";
import RenderComponent from "./RenderComponent";

export default function CanvasRenderer() {
  const components = useDesignStore((s) => s.components);

  if (components.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 select-none">
        <svg className="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3z" />
        </svg>
        <p className="text-lg font-medium text-gray-500">Your canvas is empty</p>
        <p className="text-sm mt-1 text-gray-400">
          Type a command like &quot;Create a hero section&quot; to get started
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {components.map((component) => (
        <div key={component.id} className="canvas-component-enter">
          <RenderComponent component={component} />
        </div>
      ))}
    </div>
  );
}
