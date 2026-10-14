import { memo, useId } from "react";

// Adapted from the supplied v3 prototype. Decorative only; no protocol state.
export const AuroraText = memo(function AuroraText({ children }) {
  return <span className="aurora-text">{children}</span>;
});

// Binary registration evidence, not a model-quality percentage or trust score.
export function VerificationRing({ verified, label, detail }) {
  return (
    <div
      className="verification-ring"
      role="img"
      aria-label={`${label}: ${
        detail || (verified ? "verified on-chain" : "not verified")
      }`}
    >
      <svg viewBox="0 0 100 100" fill="none" aria-hidden="true">
        <circle
          cx="50"
          cy="50"
          r="45"
          stroke="currentColor"
          opacity=".15"
          strokeWidth="8"
        />
        {verified && (
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="currentColor"
            strokeWidth="8"
          />
        )}
      </svg>
      <span>
        <strong>{verified ? "✓" : "—"}</strong>
        <small>{label}</small>
      </span>
    </div>
  );
}

export function InteractiveGridPattern({ dark = false }) {
  const id = useId();
  return (
    <svg
      className={`interactive-grid${dark ? " grid-dark" : ""}`}
      aria-hidden="true"
      focusable="false"
      width="100%"
      height="100%"
      viewBox={dark ? "0 0 640 480" : "0 0 1440 720"}
      preserveAspectRatio="xMidYMid slice"
      onPointerMove={(event) => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
          return;
        const bounds = event.currentTarget.getBoundingClientRect();
        const viewWidth = dark ? 640 : 1440,
          viewHeight = dark ? 480 : 720;
        const scale = Math.max(
          bounds.width / viewWidth,
          bounds.height / viewHeight
        );
        const x =
          (event.clientX -
            bounds.left -
            (bounds.width - viewWidth * scale) / 2) /
          scale;
        const y =
          (event.clientY -
            bounds.top -
            (bounds.height - viewHeight * scale) / 2) /
          scale;
        event.currentTarget.style.setProperty(
          "--grid-x",
          `${Math.floor(x / 40) * 40}px`
        );
        event.currentTarget.style.setProperty(
          "--grid-y",
          `${Math.floor(y / 40) * 40}px`
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
            strokeOpacity="0.22"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
      <rect className="grid-highlight" width="40" height="40" />
    </svg>
  );
}
