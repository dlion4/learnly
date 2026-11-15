export function LearnlyLogo({ light = false, size = 32 }: { light?: boolean; size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        style={{
          width: size,
          height: size,
          borderRadius: 10,
          background: light ? "var(--brand-accent)" : "var(--brand-primary)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "var(--shadow-2)",
          flexShrink: 0,
        }}
        aria-hidden
      >
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none" stroke={light ? "var(--text-primary)" : "var(--brand-accent)"} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 10 12 5 2 10l10 5 10-5Z" pathLength={1} className="icon-draw" />
          <path d="M6 12v5c3 3 9 3 12 0v-5" pathLength={1} className="icon-draw" style={{ animationDelay: "180ms" }} />
        </svg>
      </span>
      <span
        className="font-display"
        style={{
          fontSize: size * 0.72,
          fontWeight: 600,
          letterSpacing: "-0.01em",
          color: light ? "var(--text-on-brand)" : "var(--text-primary)",
          lineHeight: 1,
        }}
      >
        Learnly
      </span>
    </span>
  );
}
