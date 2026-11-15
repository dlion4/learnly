import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { catLabel, type RequestCategory } from "../../data/students";
import { Icon } from "./Icon";
import { useOverlay, useReducedMotion } from "./primitives";

/* ------------------------------------------------------------------ */
/* Drawer — slide-in right on lg+, full-screen sheet on sm             */
/* ------------------------------------------------------------------ */
export function Drawer({
  open, onClose, title, eyebrow, children, footer, tabs, width = 540,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  eyebrow?: string;
  children: ReactNode;
  footer?: ReactNode;
  tabs?: ReactNode;
  width?: number;
}) {
  useOverlay(open, onClose);
  if (!open) return null;
  return (
    <div className="ly-drawer-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="ly-drawer" role="dialog" aria-modal="true" style={{ ["--drawer-w" as string]: `${width}px` }}>
        <header className="ly-drawer-head">
          <div className="min-w-0">
            {eyebrow && <div className="ly-eyebrow mb-1">{eyebrow}</div>}
            <h2 className="font-display ly-drawer-title">{title}</h2>
          </div>
          <button type="button" className="ly-icon-btn" aria-label="Close panel" onClick={onClose}>
            <Icon name="x" size={16} />
          </button>
        </header>
        {tabs && <div className="ly-drawer-tabs">{tabs}</div>}
        <div className="ly-drawer-body">{children}</div>
        {footer && <footer className="ly-drawer-foot">{footer}</footer>}
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dropdown — portalled menu, never clipped by tables or drawers       */
/* ------------------------------------------------------------------ */
export interface MenuItem {
  label: string;
  icon?: string;
  onSelect: () => void;
  danger?: boolean;
  separatorBefore?: boolean;
}

export function Dropdown({
  label, trigger, triggerClassName = "ly-icon-btn", items, children, align = "end", width = 230,
}: {
  label: string;
  trigger: ReactNode;
  triggerClassName?: string;
  items?: MenuItem[];
  children?: (close: () => void) => ReactNode;
  align?: "start" | "end";
  width?: number;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const close = useCallback(() => {
    setOpen(false);
    setPos(null);
  }, []);
  useOverlay(open, close, false);

  const place = useCallback(() => {
    if (!btn.current || !menu.current) return;
    const r = btn.current.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) return close();
    const w = menu.current.offsetWidth;
    const h = menu.current.offsetHeight;
    let left = align === "end" ? r.right - w : r.left;
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    let top = r.bottom + 6;
    if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 6);
    setPos({ top, left });
  }, [align, close]);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!btn.current?.contains(t) && !menu.current?.contains(t)) close();
    };
    const onScroll = (e: Event) => {
      if (!menu.current?.contains(e.target as Node)) place();
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, close, place]);

  return (
    <>
      <button
        ref={btn}
        type="button"
        className={triggerClassName}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => (open ? close() : setOpen(true))}
      >
        {trigger}
      </button>
      {open &&
        createPortal(
          <div
            ref={menu}
            className="ly-menu"
            role="menu"
            aria-label={label}
            style={{ width: `min(${width}px, calc(100vw - 16px))`, top: pos?.top ?? 0, left: pos?.left ?? 0, visibility: pos ? "visible" : "hidden" }}
          >
            {items?.map((item) => (
              <div key={item.label}>
                {item.separatorBefore && <div className="ly-menu-sep" />}
                <button
                  type="button"
                  role="menuitem"
                  className={`ly-menu-item ${item.danger ? "is-danger" : ""}`}
                  onClick={() => {
                    close();
                    item.onSelect();
                  }}
                >
                  {item.icon && <Icon name={item.icon} size={16} />}
                  <span>{item.label}</span>
                </button>
              </div>
            ))}
            {children?.(close)}
          </div>,
          document.body,
        )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Tabs + MiniTabs                                                     */
/* ------------------------------------------------------------------ */
export interface TabDef<T extends string> {
  key: T;
  label: string;
  count?: number;
}

export function Tabs<T extends string>({ tabs, value, onChange, label }: { tabs: TabDef<T>[]; value: T; onChange: (key: T) => void; label: string }) {
  return (
    <div className="ly-tabs" role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button key={t.key} type="button" role="tab" aria-selected={value === t.key} className={`ly-tab ${value === t.key ? "is-active" : ""}`} onClick={() => onChange(t.key)}>
          {t.label}
          {t.count !== undefined && <span className="ly-tab-count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function MiniTabs<T extends string>({ tabs, value, onChange, label }: { tabs: TabDef<T>[]; value: T; onChange: (key: T) => void; label: string }) {
  return (
    <div className="ly-minitabs" role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button key={t.key} type="button" role="tab" aria-selected={value === t.key} className={`ly-minitab ${value === t.key ? "is-active" : ""}`} onClick={() => onChange(t.key)}>
          {t.label}
          {t.count !== undefined && <span className="ly-minitab-count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pagination                                                          */
/* ------------------------------------------------------------------ */
export function Pagination({ page, pageSize, total, onChange, noun }: { page: number; pageSize: number; total: number; onChange: (page: number) => void; noun: string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <nav className="ly-pagination" aria-label={`${noun} pagination`}>
      <span>
        Showing {from}–{to} of {total} {noun}
      </span>
      {pages > 1 && (
        <div className="flex items-center gap-1">
          <button type="button" className="ly-page-btn" disabled={page === 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
            <Icon name="arrowLeft" size={14} />
          </button>
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <button key={n} type="button" className={`ly-page-btn ${n === page ? "is-active" : ""}`} aria-current={n === page ? "page" : undefined} onClick={() => onChange(n)}>
              {n}
            </button>
          ))}
          <button type="button" className="ly-page-btn" disabled={page === pages} onClick={() => onChange(page + 1)} aria-label="Next page">
            <Icon name="arrowRight" size={14} />
          </button>
        </div>
      )}
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Small building blocks                                               */
/* ------------------------------------------------------------------ */
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className={`ly-toggle ${checked ? "is-on" : ""}`} onClick={() => onChange(!checked)}>
      <span />
    </button>
  );
}

const STATUS_MAP: Record<string, [string, string, boolean]> = {
  DRAFT: ["Draft", "ly-status-neutral", false],
  SUBMITTED: ["Submitted", "ly-status-pending", false],
  UNDER_REVIEW: ["Under review", "ly-status-pending", true],
  AWAITING_PROOF: ["Awaiting proof", "ly-status-warn", true],
  APPROVED: ["Approved", "ly-status-approved", false],
  REJECTED: ["Rejected", "ly-status-rejected", false],
  DISBURSED: ["Disbursed", "ly-status-disbursed", false],
  FAILED: ["Failed", "ly-status-failed", false],
  WITHDRAWN: ["Withdrawn", "ly-status-neutral", false],
  SETTLED: ["Settled", "ly-status-approved", false],
  REVERSED: ["Reversed", "ly-status-neutral", false],
  QUEUED: ["Queued", "ly-status-pending", true],
  VERIFIED: ["Verified", "ly-status-verified", false],
  PENDING: ["Pending", "ly-status-pending", true],
};

export function StatusChip({ status }: { status: string }) {
  const [label, cls, live] = STATUS_MAP[status] ?? [status, "ly-status-neutral", false];
  return (
    <span className={`ly-chip ly-status-chip ${cls}`}>
      {live && <span className="ly-pulse ly-pulse-warn" aria-hidden />}
      {label}
    </span>
  );
}

export function CategoryBadge({ category }: { category: RequestCategory }) {
  return (
    <span className="ly-cat-badge">
      <span className={`ly-cat-dot ly-cat-dot-${category}`} aria-hidden />
      {catLabel(category)}
    </span>
  );
}

export function EmptyState({ icon, title, children, action }: { icon: string; title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="ly-empty">
      <span className="ly-empty-icon">
        <Icon name={icon} size={22} />
      </span>
      <div className="font-display" style={{ fontSize: "1.1rem" }}>{title}</div>
      <p>{children}</p>
      {action}
    </div>
  );
}

export function StatCard({
  label, value, hint, icon, live, actionLabel, onAction,
}: {
  label: string;
  value: ReactNode;
  hint: ReactNode;
  icon: string;
  live?: boolean;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <article className="ly-card ly-stat hover-lift">
      <div className="ly-stat-top">
        <span className="ly-stat-label">{label}</span>
        <span className="ly-stat-icon">
          <Icon name={icon} size={18} />
          {live && <span className="ly-pulse ly-pulse-warn ly-stat-pulse" aria-hidden />}
        </span>
      </div>
      <div className="ly-stat-value font-display">{value}</div>
      <div className="ly-stat-hint">{hint}</div>
      <button type="button" className="ly-link-btn ly-stat-action" onClick={onAction}>
        {actionLabel} <Icon name="arrowRight" size={14} />
      </button>
    </article>
  );
}

export function ProgressBar({ value, label, tone = "brand" }: { value: number; label: string; tone?: "brand" | "success" | "warn" }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={`ly-progress ly-progress-${tone}`} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v)}>
      <span style={{ width: `${v}%` }} />
    </div>
  );
}

export function Alert({ tone, title, children, action }: { tone: "warning" | "info" | "success" | "danger"; title?: string; children: ReactNode; action?: ReactNode }) {
  const icon = tone === "success" ? "check" : tone === "info" ? "info" : "alert";
  return (
    <div className={`ly-alert ly-alert-${tone}`} role={tone === "danger" ? "alert" : "note"}>
      <span className="ly-alert-icon">
        <Icon name={icon} size={16} />
      </span>
      <div className="min-w-0 flex-1">
        {title && <div className="ly-alert-title">{title}</div>}
        <div className="ly-alert-body">{children}</div>
      </div>
      {action}
    </div>
  );
}

export function KV({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="ly-kv">
      <span>{k}</span>
      <strong>{children}</strong>
    </div>
  );
}

/** Masked identifier with an audit-logged reveal toggle (DPA 2019). */
export function Masked({ masked, full, label }: { masked: string; full: string; label: string }) {
  const [shown, setShown] = useState(false);
  return (
    <span className="ly-masked">
      <span className="font-mono">{shown ? full : masked}</span>
      <button type="button" className="ly-masked-btn" aria-label={`${shown ? "Hide" : "Reveal"} ${label}`} aria-pressed={shown} onClick={() => setShown((v) => !v)}>
        <Icon name={shown ? "eyeOff" : "eye"} size={14} />
      </button>
      {shown && <span className="ly-masked-note">Reveal logged to audit trail</span>}
    </span>
  );
}

export function WizardSteps({ steps, active }: { steps: string[]; active: number }) {
  return (
    <ol className="ly-wizard-steps" aria-label="Progress">
      {steps.map((s, i) => (
        <li key={s} className={i < active ? "is-done" : i === active ? "is-active" : ""} aria-current={i === active ? "step" : undefined}>
          <span className="num">{i < active ? <Icon name="check" size={12} strokeWidth={3} /> : i + 1}</span>
          <span className="lbl">{s}</span>
        </li>
      ))}
    </ol>
  );
}

/* ------------------------------------------------------------------ */
/* File upload (jpg / png / pdf · 10 MB · up to 5)                     */
/* ------------------------------------------------------------------ */
export interface UploadFile {
  name: string;
  sizeKb: number;
}

export function FileDrop({ files, onChange, max = 5, sampleName, inputId }: { files: UploadFile[]; onChange: (files: UploadFile[]) => void; max?: number; sampleName: string; inputId: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);

  const add = (list: FileList | null) => {
    if (!list) return;
    const next = [...files];
    let err = "";
    for (const f of Array.from(list)) {
      if (!/\.(pdf|jpe?g|png)$/i.test(f.name)) err = `${f.name}: only PDF, JPG or PNG files are accepted.`;
      else if (f.size > 10 * 1024 * 1024) err = `${f.name} is larger than 10 MB.`;
      else if (next.length >= max) err = `You can attach up to ${max} files.`;
      else next.push({ name: f.name, sizeKb: Math.max(1, Math.round(f.size / 1024)) });
    }
    setError(err);
    onChange(next);
  };

  return (
    <div>
      <div
        className={`ly-dropzone ${drag ? "is-drag" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          add(e.dataTransfer.files);
        }}
      >
        <Icon name="upload" size={22} />
        <div className="font-semibold">Drop files here or browse</div>
        <div className="ly-hint">PDF, JPG or PNG · max 10 MB each · up to {max} files</div>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <button type="button" className="ly-btn ly-btn-outline ly-btn-sm" onClick={() => input.current?.click()}>
            Browse files
          </button>
          <button
            type="button"
            className="ly-btn ly-btn-ghost ly-btn-sm"
            onClick={() => {
              if (files.length >= max) return setError(`You can attach up to ${max} files.`);
              const taken = files.some((f) => f.name === sampleName);
              setError("");
              onChange([...files, { name: taken ? sampleName.replace(/(\.\w+)$/, `_${files.length + 1}$1`) : sampleName, sizeKb: 312 }]);
            }}
          >
            Attach sample file
          </button>
        </div>
        <input
          id={inputId}
          ref={input}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          multiple
          hidden
          onChange={(e) => {
            add(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      {error && <div className="ly-error mt-2" role="alert">{error}</div>}
      {files.length > 0 && (
        <ul className="ly-file-list">
          {files.map((f) => (
            <li key={f.name} className="ly-file-row">
              <Icon name="file" size={16} />
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
              <span className="ly-hint">{f.sizeKb} KB</span>
              <button type="button" className="ly-masked-btn" aria-label={`Remove ${f.name}`} onClick={() => onChange(files.filter((x) => x.name !== f.name))}>
                <Icon name="x" size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bar chart (chart-draw) + one-shot confetti                          */
/* ------------------------------------------------------------------ */
const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k` : String(n));

export function BarChart({ data, height = 150, format }: { data: { label: string; total: number }[]; height?: number; format: (n: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.total));
  return (
    <div className="ly-chart chart-draw" role="img" aria-label={`Disbursed by month: ${data.map((d) => `${d.label} ${format(d.total)}`).join(", ")}`} style={{ height }}>
      {data.map((d, i) => (
        <div key={`${d.label}-${i}`} className="ly-chart-col" title={`${d.label}: ${format(d.total)}`}>
          <span className="ly-chart-val">{d.total ? compact(d.total) : ""}</span>
          <div className="ly-chart-track">
            <div className={`ly-chart-bar ${d.total === max ? "is-peak" : ""}`} style={{ height: `${d.total ? Math.max(6, (d.total / max) * 100) : 2}%` }} />
          </div>
          <span className="ly-chart-label">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function Confetti({ show }: { show: boolean }) {
  const reduced = useReducedMotion();
  const pieces = useMemo(
    () => Array.from({ length: 80 }, (_, i) => ({ left: (i * 37) % 100, delay: (i % 10) * 45, dx: ((i * 53) % 220) - 110, rot: (i * 47) % 360, gold: i % 2 === 0 })),
    [],
  );
  if (!show || reduced) return null;
  return (
    <div className="ly-confetti" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}ms`,
            background: p.gold ? "var(--brand-accent)" : "var(--brand-primary)",
            ["--dx" as string]: `${p.dx}px`,
            ["--rot" as string]: `${p.rot}deg`,
          }}
        />
      ))}
    </div>
  );
}
