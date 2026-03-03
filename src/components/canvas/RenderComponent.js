"use client";

/**
 * Renders a single design component based on its type and props.
 * Supports nested children for containers/cards/forms.
 */
export default function RenderComponent({ component }) {
  const { type, props = {}, children = [] } = component;

  const renderChildren = () =>
    children.map((child) => (
      <RenderComponent key={child.id} component={child} />
    ));

  switch (type) {
    case "button":
      // Use inline styles for colors, Tailwind for layout
      const buttonStyle = props.style || {};
      const hasCustomClasses = props.className && props.className.trim().length > 0;
      const defaultButtonClasses = "px-6 py-2.5 rounded-lg font-medium transition-colors";
      const variantClasses =
        props.variant === "outline"
          ? "border-2 border-blue-500 text-blue-500 hover:bg-blue-500/10"
          : props.variant === "ghost"
          ? "text-blue-500 hover:bg-blue-500/10"
          : props.variant === "secondary"
          ? "bg-gray-600 hover:bg-gray-700 text-white"
          : "bg-blue-600 hover:bg-blue-700 text-white";

      return (
        <button
          className={hasCustomClasses ? props.className : `${defaultButtonClasses} ${variantClasses}`}
          style={buttonStyle}
          onMouseEnter={(e) => {
            if (buttonStyle['--hover-bg']) {
              e.currentTarget.style.backgroundColor = buttonStyle['--hover-bg'];
            }
          }}
          onMouseLeave={(e) => {
            if (buttonStyle.backgroundColor) {
              e.currentTarget.style.backgroundColor = buttonStyle.backgroundColor;
            }
          }}
        >
          {props.text || props.content || "Button"}
        </button>
      );

    case "text":
    case "heading":
      const Tag = props.tag || (type === "heading" ? "h2" : "p");
      return (
        <Tag
          className={`${
            Tag === "h1" ? "text-4xl font-bold" :
            Tag === "h2" ? "text-3xl font-bold" :
            Tag === "h3" ? "text-2xl font-semibold" :
            Tag === "h4" ? "text-xl font-semibold" :
            "text-base"
          } ${props.className || ""}`}
          style={props.style}
        >
          {props.text || props.content || "Text element"}
        </Tag>
      );

    case "card":
      return (
        <div
          className={`bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-6 ${props.className || ""}`}
          style={props.style}
        >
          {props.title && <h3 className="text-xl font-semibold mb-2">{props.title}</h3>}
          {props.subtitle && <p className="text-gray-400 text-sm mb-1">{props.subtitle}</p>}
          {props.price && (
            <div className="my-3">
              <span className="text-3xl font-bold">{props.price}</span>
              {props.period && <span className="text-gray-400 text-sm ml-1">{props.period}</span>}
            </div>
          )}
          {props.description && <p className="text-gray-400">{props.description}</p>}
          {props.features && Array.isArray(props.features) && (
            <ul className="mt-3 space-y-1">
              {props.features.map((f, i) => (
                <li key={i} className="text-gray-300 text-sm flex items-center gap-2">
                  <span className="text-green-400">✓</span>{f}
                </li>
              ))}
            </ul>
          )}
          {children.length > 0 && <div className="mt-4 space-y-3">{renderChildren()}</div>}
        </div>
      );

    case "input":
      return (
        <div className={`flex flex-col gap-1.5 ${props.className || ""}`}>
          {props.label && (
            <label className="text-sm font-medium text-gray-300">{props.label}</label>
          )}
          <input
            type={props.inputType || "text"}
            placeholder={props.placeholder || ""}
            className="bg-[#12122a] border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
            style={props.style}
            readOnly
          />
        </div>
      );

    case "container":
    case "section":
      return (
        <div
          className={`rounded-xl p-6 ${
            props.variant === "hero"
              ? "bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/20 py-16 text-center"
              : "bg-[#111128] border border-gray-800"
          } ${props.className || ""}`}
          style={props.style}
        >
          {props.title && (
            <h2 className="text-3xl font-bold mb-2">{props.title}</h2>
          )}
          {props.subtitle && (
            <p className="text-gray-400 mb-6">{props.subtitle}</p>
          )}
          {children.length > 0 && (
            <div className="space-y-4">{renderChildren()}</div>
          )}
        </div>
      );

    case "image":
      return (
        <div
          className={`bg-[#1a1a2e] border border-gray-700/50 rounded-lg flex items-center justify-center ${props.className || ""}`}
          style={{ width: props.width || "100%", height: props.height || "200px", ...props.style }}
        >
          <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21z" />
          </svg>
        </div>
      );

    case "divider":
      return <hr className="border-gray-700/50 my-4" />;

    case "form":
      return (
        <form
          className={`bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-6 space-y-4 ${props.className || ""}`}
          style={props.style}
          onSubmit={(e) => e.preventDefault()}
        >
          {props.title && <h3 className="text-xl font-semibold mb-4">{props.title}</h3>}
          {renderChildren()}
        </form>
      );

    case "navbar":
      const ctaChild = children.find((c) => c.type === "button");
      return (
        <nav
          className={`flex items-center justify-between px-6 py-4 bg-[#111128] border border-gray-800 rounded-xl ${props.className || ""}`}
          style={props.style}
        >
          <span className="text-xl font-bold">{props.logo || "Logo"}</span>
          <div className="flex items-center gap-6">
            {(props.links || ["Home", "Features", "Pricing", "Contact"]).map((link, i) => (
              <span key={i} className="text-gray-400 hover:text-white cursor-pointer transition-colors text-sm">
                {link}
              </span>
            ))}
          </div>
          {ctaChild && <RenderComponent component={ctaChild} />}
        </nav>
      );

    default:
      return (
        <div className="bg-[#1a1a2e] border border-dashed border-gray-600 rounded-lg p-4 text-gray-500 text-sm">
          Unknown component: {type}
        </div>
      );
  }
}
