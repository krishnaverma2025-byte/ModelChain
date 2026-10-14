import { memo, useId } from "react";

// Adapted from the supplied v3 prototype. Decorative only; no protocol state.
export const AuroraText = memo(function AuroraText({ children }) {
  return <span className="aurora-text">{children}</span>;
});

export function InteractiveGridPattern({ dark = false }) {
  const id = useId();
  return (
    <svg
      className={`interactive-grid${dark ? " grid-dark" : ""}`}
      aria-hidden="true"
      focusable="false"
      width="100%"
      height="100%"
      onPointerMove={(event) => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
          return;
        const bounds = event.currentTarget.getBoundingClientRect();
        event.currentTarget.style.setProperty(
          "--grid-x",
          `${Math.floor((event.clientX - bounds.left) / 40) * 40}px`
        );
        event.currentTarget.style.setProperty(
          "--grid-y",
          `${Math.floor((event.clientY - bounds.top) / 40) * 40}px`
        );
      }}
    >
      <defs>
        <pattern id={id} width="40" height="40" patternUnits="userSpaceOnUse">
          <path
            d="M40 0H0V40"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.65"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
      <rect className="grid-highlight" width="40" height="40" />
    </svg>
  );
}
