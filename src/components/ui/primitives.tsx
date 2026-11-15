import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

/* ------------------------------------------------------------------ */
/* Reduced motion                                                      */
/* ------------------------------------------------------------------ */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false,
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

/* ------------------------------------------------------------------ */
/* Reveal — IntersectionObserver-driven .ly-reveal                     */
/* ------------------------------------------------------------------ */
export function Reveal({
  children,
  className = "",
  delay = 0,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section" | "article" | "li" | "span";
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const Comp = Tag as unknown as "div";
  return (
    <Comp
      ref={ref as never}
      className={`ly-reveal ${visible ? "is-visible" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Comp>
  );
}

/* ------------------------------------------------------------------ */
/* CountUp — rAF count-up, easeOutQuart, pauses on tab hide, snaps     */
/* under prefers-reduced-motion                                        */
/* ------------------------------------------------------------------ */
export function CountUp({
  value,
  duration = 1200,
  format = (n: number) => Math.round(n).toLocaleString("en-KE"),
  suffix = "",
  className = "",
}: {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  suffix?: string;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(reduced ? value : 0);

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      return;
    }
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let start: number | null = null;
    let elapsedBeforePause = 0;
    let running = false;

    const tick = (ts: number) => {
      if (start === null) start = ts - elapsedBeforePause;
      const t = Math.min(1, (ts - start) / duration);
      const eased = 1 - Math.pow(1 - t, 4);
      setDisplay(value * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else running = false;
    };
    const begin = () => {
      if (running) return;
      running = true;
      start = null;
      raf = requestAnimationFrame(tick);
    };
    const onVis = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        if (start !== null) elapsedBeforePause = performance.now() - start;
        running = false;
      } else begin();
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          begin();
          io.disconnect();
          document.addEventListener("visibilitychange", onVis);
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [value, duration, reduced]);

  return (
    <span ref={ref} className={className}>
      {format(display)}
      {suffix}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Overlay stack — Escape closes only the top-most overlay; body       */
/* scroll stays locked until the last overlay closes.                  */
/* ------------------------------------------------------------------ */
const overlayStack: Array<{ current: () => void }> = [];
let scrollLocks = 0;

export function useOverlay(open: boolean, onClose: () => void, lockScroll = true) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    overlayStack.push(closeRef);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && overlayStack[overlayStack.length - 1] === closeRef) closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    if (lockScroll) {
      scrollLocks += 1;
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      const i = overlayStack.indexOf(closeRef);
      if (i >= 0) overlayStack.splice(i, 1);
      if (lockScroll) {
        scrollLocks = Math.max(0, scrollLocks - 1);
        if (scrollLocks === 0) document.body.style.overflow = "";
      }
    };
  }, [open, lockScroll]);
}

/* ------------------------------------------------------------------ */
/* Dialog                                                              */
/* ------------------------------------------------------------------ */
export function Dialog({
  open,
  onClose,
  title,
  eyebrow,
  children,
  footer,
  maxWidth = 560,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  eyebrow?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: number;
}) {
  useOverlay(open, onClose);

  if (!open) return null;
  return (
    <div className="ly-dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ly-dialog" role="dialog" aria-modal="true" style={{ maxWidth }}>
        <div className="ly-dialog-head">
          <div>
            {eyebrow && <div className="ly-eyebrow mb-1">{eyebrow}</div>}
            <h3 className="font-display" style={{ fontSize: "var(--fs-h3)", margin: 0, lineHeight: 1.2 }}>
              {title}
            </h3>
          </div>
          <button className="ly-icon-btn" aria-label="Close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="ly-dialog-body">{children}</div>
        {footer && <div className="ly-dialog-foot">{footer}</div>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Toast (single, platform-wide)                                       */
/* ------------------------------------------------------------------ */
type ToastCtx = { toast: (msg: ReactNode) => void };
const ToastContext = createContext<ToastCtx>({ toast: () => {} });
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<ReactNode | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const toast = useCallback((m: ReactNode) => {
    setMsg(m);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(null), 4200);
  }, []);
  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {msg && (
        <div className="ly-toast" role="status">
          <span className="ly-pulse" aria-hidden />
          <span>{msg}</span>
        </div>
      )}
    </ToastContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* Stepper (horizontal, §2.4)                                          */
/* ------------------------------------------------------------------ */
export function Stepper({ steps, active }: { steps: string[]; active: number }) {
  return (
    <div className="stepper-h" role="list">
      {steps.map((s, i) => (
        <div
          key={s}
          role="listitem"
          className={`step ${i < active ? "is-done" : ""} ${i === active ? "is-active" : ""}`}
        >
          <span
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.25)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.65rem",
              flexShrink: 0,
            }}
          >
            {i < active ? "✓" : i + 1}
          </span>
          <span className="truncate">{s}</span>
        </div>
      ))}
    </div>
  );
}
