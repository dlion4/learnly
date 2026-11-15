import { Reveal } from "../ui/primitives";
import { LIFECYCLE_STEPS, type LifecycleStepKey } from "../../data/requests";

interface Props {
  activeStep: LifecycleStepKey;
  onSelect: (step: LifecycleStepKey) => void;
}

const NODE_POSITIONS: Record<LifecycleStepKey, { x: number; accent: string }> = {
  request: { x: 20, accent: "var(--cat-fees)" },
  proof: { x: 214, accent: "var(--cat-equipment)" },
  approval: { x: 408, accent: "var(--brand-accent)" },
  disbursement: { x: 602, accent: "var(--brand-success)" },
  records: { x: 796, accent: "var(--brand-info)" },
};

const MAIN_CONNECTORS = [
  "M184 114H208",
  "M378 114H402",
  "M572 114H596",
  "M766 114H790",
];

export function LifecycleFlowchart({ activeStep, onSelect }: Props) {
  return (
    <Reveal className="flowchart-scene">
      <div className="flowchart-shell">
        <div className="flowchart-scroll">
          <svg
            className="flowchart-svg"
            viewBox="0 0 980 278"
            role="img"
            aria-labelledby="hiw-flow-title hiw-flow-desc"
          >
            <title id="hiw-flow-title">Learnly 5-step financial assistance request lifecycle</title>
            <desc id="hiw-flow-desc">
              Step 1 Request, Step 2 Proof and OCR, Step 3 RBAC Approval, Step 4 Multi-channel Disbursement, and Step 5 Record-keeping and nightly reconciliation. Includes proof feedback loop and payout retry safeguards.
            </desc>
            <defs>
              <marker
                id="hiw-arrow"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6.5"
                markerHeight="6.5"
                orient="auto-start-reverse"
              >
                <path d="M0 0 10 5 0 10Z" fill="var(--text-tertiary)" />
              </marker>
              <marker
                id="hiw-arrow-warn"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M0 0 10 5 0 10Z" fill="var(--brand-warning)" />
              </marker>
            </defs>

            {/* Primary forward arrows */}
            {MAIN_CONNECTORS.map((d, idx) => (
              <path
                key={d}
                d={d}
                pathLength={1}
                className="flowchart-line"
                style={{ ["--draw-delay" as string]: `${idx * 140}ms` }}
                fill="none"
                stroke="var(--text-tertiary)"
                strokeWidth={2.5}
                strokeLinecap="round"
                markerEnd="url(#hiw-arrow)"
              />
            ))}

            {/* Feedback loop: Approval -> Awaiting Proof -> Proof & OCR */}
            <path
              d="M490 176V224C490 236 480 244 468 244H318C306 244 296 236 296 224V184"
              pathLength={1}
              className="flowchart-line"
              style={{ ["--draw-delay" as string]: "620ms" }}
              fill="none"
              stroke="var(--brand-warning)"
              strokeWidth={2}
              strokeDasharray="6 4"
              strokeLinecap="round"
              markerEnd="url(#hiw-arrow-warn)"
            />
            <text
              x="393"
              y="262"
              textAnchor="middle"
              fill="var(--text-secondary)"
              style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600 }}
            >
              AWAITING_PROOF loop (re-upload without rejection)
            </text>

            {/* Retry loop under Disbursement */}
            <path
              d="M726 176V218C726 230 716 238 704 238H664C652 238 642 230 642 218V184"
              pathLength={1}
              className="flowchart-line"
              style={{ ["--draw-delay" as string]: "760ms" }}
              fill="none"
              stroke="var(--brand-success)"
              strokeWidth={2}
              strokeLinecap="round"
              markerEnd="url(#hiw-arrow)"
            />
            <text
              x="684"
              y="262"
              textAnchor="middle"
              fill="var(--text-secondary)"
              style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600 }}
            >
              Auto retry: 1m · 5m · 15m
            </text>

            {/* 5 Interactive Step Nodes */}
            {LIFECYCLE_STEPS.map((step) => {
              const pos = NODE_POSITIONS[step.key];
              const active = step.key === activeStep;
              return (
                <g
                  key={step.key}
                  className={`flowchart-node ${active ? "is-active" : ""}`}
                  role="button"
                  tabIndex={0}
                  aria-pressed={active}
                  aria-label={`Inspect step ${step.index}: ${step.short}`}
                  onClick={() => onSelect(step.key)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(step.key);
                    }
                  }}
                >
                  <rect
                    className="node-box"
                    x={pos.x}
                    y={46}
                    width={164}
                    height={128}
                    rx={14}
                    fill={active ? "var(--brand-primary-soft)" : "var(--surface-1)"}
                    stroke={active ? "var(--brand-primary)" : pos.accent}
                    strokeWidth={active ? 3 : 2}
                  />
                  {/* Top color accent bar */}
                  <rect x={pos.x + 1} y={47} width={162} height={7} rx={3.5} fill={pos.accent} />

                  {/* Step number pill */}
                  <rect x={pos.x + 14} y={66} width={32} height={22} rx={6} fill={pos.accent} opacity={0.18} />
                  <text
                    x={pos.x + 30}
                    y={81}
                    textAnchor="middle"
                    fill="var(--text-primary)"
                    style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700 }}
                  >
                    {step.index}
                  </text>

                  {/* Drawn inline icon */}
                  <g transform={`translate(${pos.x + 124}, 64)`} stroke={pos.accent} fill="none" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
                    <StepSvgIcon step={step.key} />
                  </g>

                  {/* Title & states */}
                  <text
                    x={pos.x + 14}
                    y={114}
                    fill="var(--text-primary)"
                    style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 600 }}
                  >
                    {step.short}
                  </text>
                  <text
                    x={pos.x + 14}
                    y={135}
                    fill="var(--text-secondary)"
                    style={{ fontFamily: "var(--font-sans)", fontSize: 11.5 }}
                  >
                    {step.actor}
                  </text>
                  <text
                    x={pos.x + 14}
                    y={157}
                    fill="var(--text-tertiary)"
                    style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600 }}
                  >
                    {step.metricValue}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div
          className="flex flex-wrap items-center justify-between gap-2 px-5 py-3"
          style={{
            borderTop: "1px solid var(--border-subtle)",
            color: "var(--text-secondary)",
            fontSize: "var(--fs-sm)",
          }}
        >
          <span>Select any step in the flowchart to inspect its engine rules and live request trace.</span>
          <span className="font-mono" style={{ fontSize: "var(--fs-label)", color: "var(--text-tertiary)" }}>
            State Machine §11 · Payouts §12
          </span>
        </div>
      </div>
    </Reveal>
  );
}

export function StepSvgIcon({ step }: { step: LifecycleStepKey }) {
  switch (step) {
    case "request":
      return (
        <>
          <path d="M4 3h11l5 5v13H4Z" pathLength={1} className="icon-draw" />
          <path d="M14 3v6h6M8 13h8M8 17h5" pathLength={1} className="icon-draw" />
        </>
      );
    case "proof":
      return (
        <>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" pathLength={1} className="icon-draw" />
          <path d="m9 15 2 2 4-4" pathLength={1} className="icon-draw" />
        </>
      );
    case "approval":
      return (
        <>
          <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Z" pathLength={1} className="icon-draw" />
          <path d="m9 12 2 2 4-4" pathLength={1} className="icon-draw" />
        </>
      );
    case "disbursement":
      return (
        <>
          <path d="M22 2 11 13" pathLength={1} className="icon-draw" />
          <path d="m22 2-7 20-4-9-9-4 20-7Z" pathLength={1} className="icon-draw" />
        </>
      );
    case "records":
      return (
        <>
          <path d="M4 4h16v16H4Z" pathLength={1} className="icon-draw" />
          <path d="M8 9h8M8 13h8M8 17h4" pathLength={1} className="icon-draw" />
        </>
      );
  }
}
