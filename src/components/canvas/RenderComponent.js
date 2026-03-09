"use client";

/**
 * Renders a single design component based on its type and props.
 * Light-mode palette — canvas bg is warm off-white (#f7f5f0).
 * Components use white surfaces with gray borders.
 */
export default function RenderComponent({ component, _parentType }) {
  const { type, props = {}, children = [] } = component;

  const renderChildren = (parentType) =>
    children.map((child) => (
      <RenderComponent key={child.id} component={child} _parentType={parentType} />
    ));

  switch (type) {
    case "button": {
      const buttonStyle = props.style || {};
      const hasCustomClasses = props.className && props.className.trim().length > 0;

      // Larger padding when sitting directly inside a hero
      const isHeroCTA = _parentType === "hero";
      const sizeClasses = isHeroCTA ? "px-8 py-3 text-base" : "px-5 py-2.5 text-sm";

      const baseClasses = `${sizeClasses} rounded-lg font-semibold transition-colors`;
      const variantClasses =
        props.variant === "outline"
          ? "border-2 border-blue-600 text-blue-600 hover:bg-blue-50"
          : props.variant === "ghost"
          ? "text-blue-600 hover:bg-blue-50"
          : props.variant === "secondary"
          ? "bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300"
          : "bg-blue-600 hover:bg-blue-700 text-white";

      return (
        <button
          className={hasCustomClasses ? props.className : `${baseClasses} ${variantClasses}`}
          style={buttonStyle}
          onMouseEnter={(e) => {
            if (buttonStyle["--hover-bg"]) {
              e.currentTarget.style.backgroundColor = buttonStyle["--hover-bg"];
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
    }

    case "text":
    case "heading": {
      const Tag = props.tag || (type === "heading" ? "h2" : "p");
      const defaultClass =
        Tag === "h1"
          ? "text-5xl font-bold leading-tight tracking-tight text-gray-900"
          : Tag === "h2"
          ? "text-3xl font-bold leading-tight tracking-tight text-gray-900"
          : Tag === "h3"
          ? "text-2xl font-semibold leading-snug text-gray-900"
          : Tag === "h4"
          ? "text-xl font-semibold leading-snug text-gray-800"
          : "text-base text-gray-600 leading-relaxed";

      return (
        <Tag
          className={`${defaultClass} ${props.className || ""}`}
          style={props.style}
        >
          {props.text || props.content || "Text element"}
        </Tag>
      );
    }

    case "card": {
      return (
        <div
          className={`bg-white border border-gray-200 rounded-xl p-6 flex flex-col gap-3 shadow-sm ${props.className || ""}`}
          style={props.style}
        >
          {props.title && (
            <h3 className="text-xl font-semibold text-gray-900 leading-snug">{props.title}</h3>
          )}
          {props.subtitle && (
            <p className="text-gray-500 text-sm leading-relaxed -mt-1">{props.subtitle}</p>
          )}
          {props.price && (
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-gray-900">{props.price}</span>
              {props.period && (
                <span className="text-gray-400 text-sm">{props.period}</span>
              )}
            </div>
          )}
          {props.description && (
            <p className="text-gray-500 text-sm leading-relaxed">{props.description}</p>
          )}
          {props.features && Array.isArray(props.features) && (
            <ul className="flex flex-col gap-2">
              {props.features.map((f, i) => (
                <li key={i} className="text-gray-600 text-sm flex items-center gap-2">
                  <span className="text-green-500 shrink-0">✓</span>
                  {f}
                </li>
              ))}
            </ul>
          )}
          {children.length > 0 && (
            <div className="flex flex-col gap-3 mt-1">{renderChildren("card")}</div>
          )}
        </div>
      );
    }

    case "input": {
      return (
        <div className={`flex flex-col gap-1.5 ${props.className || ""}`}>
          {props.label && (
            <label className="text-sm font-medium text-gray-700">{props.label}</label>
          )}
          <input
            type={props.inputType || "text"}
            placeholder={props.placeholder || ""}
            className="bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors text-sm"
            style={props.style}
            readOnly
          />
        </div>
      );
    }

    case "container":
    case "section": {
      const isHero = props.variant === "hero";

      return (
        <div
          className={`rounded-xl p-8 ${
            isHero
              ? "bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-100 py-20 text-center"
              : "bg-white border border-gray-200 shadow-sm"
          } ${props.className || ""}`}
          style={props.style}
        >
          {isHero ? (
            <div className="max-w-2xl mx-auto flex flex-col gap-5">
              {props.title && (
                <h2 className="text-5xl font-bold leading-tight tracking-tight text-gray-900">
                  {props.title}
                </h2>
              )}
              {props.subtitle && (
                <p className="text-lg text-gray-500 leading-relaxed">{props.subtitle}</p>
              )}
              {children.length > 0 && (
                <div className="flex flex-wrap gap-3 justify-center mt-2">
                  {renderChildren("hero")}
                </div>
              )}
            </div>
          ) : (
            <>
              {props.title && (
                <h2 className="text-2xl font-bold text-gray-900 mb-1">{props.title}</h2>
              )}
              {props.subtitle && (
                <p className="text-gray-500 text-sm leading-relaxed mb-5">{props.subtitle}</p>
              )}
              {children.length > 0 && (
                <div className="flex flex-col gap-4">{renderChildren(type)}</div>
              )}
            </>
          )}
        </div>
      );
    }

    case "image": {
      return (
        <div
          className={`bg-gray-100 border border-gray-200 rounded-xl flex items-center justify-center ${props.className || ""}`}
          style={{ width: props.width || "100%", height: props.height || "200px", ...props.style }}
        >
          <svg
            className="w-10 h-10 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21z"
            />
          </svg>
        </div>
      );
    }

    case "divider":
      return <hr className="border-gray-200 my-2" />;

    case "form": {
      return (
        <form
          className={`bg-white border border-gray-200 rounded-xl p-6 flex flex-col gap-4 shadow-sm ${props.className || ""}`}
          style={props.style}
          onSubmit={(e) => e.preventDefault()}
        >
          {props.title && (
            <h3 className="text-xl font-semibold text-gray-900 mb-1">{props.title}</h3>
          )}
          {renderChildren("form")}
        </form>
      );
    }

    case "navbar": {
      const ctaChild = children.find((c) => c.type === "button");
      return (
        <nav
          className={`flex items-center justify-between px-6 py-4 bg-white border border-gray-200 rounded-xl shadow-sm ${props.className || ""}`}
          style={props.style}
        >
          <span className="text-xl font-bold text-gray-900 tracking-tight">
            {props.logo || "Logo"}
          </span>
          <div className="flex items-center gap-7">
            {(props.links || ["Home", "Features", "Pricing", "Contact"]).map((link, i) => (
              <span
                key={i}
                className="text-gray-500 hover:text-gray-900 cursor-pointer transition-colors text-sm font-medium"
              >
                {link}
              </span>
            ))}
          </div>
          {ctaChild && <RenderComponent component={ctaChild} _parentType="navbar" />}
        </nav>
      );
    }

    default:
      return (
        <div className="bg-white border border-dashed border-gray-300 rounded-lg p-4 text-gray-400 text-sm">
          Unknown component: {type}
        </div>
      );
  }
}
