import { Dialog } from "../ui/primitives";
import { catLabel, eduLevelLabel, kes } from "../../data/students";
import type { RequestStatus, SampleRequest } from "../../data/requests";

interface Props {
  request: SampleRequest | null;
  onClose: () => void;
  onStartOnboarding: () => void;
}

const STATUS_CLASS: Record<RequestStatus, string> = {
  DRAFT: "ly-status-pending",
  SUBMITTED: "ly-status-pending",
  AWAITING_PROOF: "ly-status-pending",
  UNDER_REVIEW: "ly-status-pending",
  APPROVED: "ly-status-approved",
  DISBURSED: "ly-status-disbursed",
  REJECTED: "ly-status-rejected",
  FAILED: "ly-status-failed",
};

const STATUS_LABEL: Record<RequestStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  AWAITING_PROOF: "Awaiting proof",
  UNDER_REVIEW: "Under review",
  APPROVED: "Approved",
  DISBURSED: "Disbursed",
  REJECTED: "Rejected",
  FAILED: "Failed",
};

export function RequestTraceDialog({ request, onClose, onStartOnboarding }: Props) {
  const adjusted = request ? request.approvedKes !== request.requestedKes : false;

  return (
    <Dialog
      open={!!request}
      onClose={onClose}
      eyebrow={request ? `${request.id} · ${request.term}` : undefined}
      title={request ? `${request.studentName} — ${catLabel(request.category)}` : ""}
      maxWidth={640}
      footer={
        <>
          <button className="ly-btn ly-btn-ghost" onClick={onClose}>
            Close
          </button>
          <button className="ly-btn ly-btn-primary" onClick={onStartOnboarding}>
            Apply as student →
          </button>
        </>
      }
    >
      {request && (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`ly-edu-badge ly-edu-badge-${request.level}`}>{eduLevelLabel(request.level)}</span>
            <span className={`ly-chip ${STATUS_CLASS[request.status]}`} style={{ padding: "0.25rem 0.7rem", fontSize: "var(--fs-label)" }}>
              {STATUS_LABEL[request.status]}
            </span>
            <span className="ly-chip" style={{ padding: "0.25rem 0.7rem", fontSize: "var(--fs-label)" }}>
              <span className={`ly-cat-dot ly-cat-dot-${request.category}`} />
              {catLabel(request.category)}
            </span>
          </div>

          <div className="grid gap-3 rounded-xl p-4 sm:grid-cols-2" style={{ background: "var(--surface-2)" }}>
            <div>
              <div className="ly-hint">Institution &amp; county</div>
              <div className="font-semibold">{request.school}</div>
              <div style={{ color: "var(--text-secondary)", fontSize: "var(--fs-sm)" }}>{request.county} County</div>
            </div>
            <div>
              <div className="ly-hint">{adjusted ? "Requested → Approved" : "Amount"}</div>
              <div className="font-display" style={{ fontSize: "1.25rem", color: "var(--brand-ink)" }}>
                {adjusted ? (
                  <>
                    <span style={{ textDecoration: "line-through", opacity: 0.55, marginRight: 8 }}>{kes(request.requestedKes)}</span>
                    {kes(request.approvedKes)}
                  </>
                ) : (
                  kes(request.approvedKes)
                )}
              </div>
              {request.processorRef && (
                <div className="font-mono" style={{ fontSize: "var(--fs-label)", color: "var(--text-tertiary)" }}>
                  Processor ref: {request.processorRef}
                </div>
              )}
            </div>
            <div className="sm:col-span-2" style={{ borderTop: "1px dashed var(--border-subtle)", paddingTop: "var(--space-2)" }}>
              <div className="ly-hint">Channel &amp; masked destination</div>
              <div className="font-semibold" style={{ fontSize: "var(--fs-sm)" }}>{request.channel}</div>
              <div className="font-mono" style={{ fontSize: "var(--fs-sm)", color: "var(--text-secondary)" }}>
                {request.destination}
              </div>
            </div>
          </div>

          {request.adjustmentReason && (
            <div className="rounded-xl p-3 text-sm" style={{ background: "color-mix(in srgb, var(--brand-warning) 12%, var(--surface-1))", border: "1px solid color-mix(in srgb, var(--brand-warning) 35%, transparent)" }}>
              <strong>Cap adjustment reason (&gt;10% delta):</strong> {request.adjustmentReason}
            </div>
          )}

          <div>
            <div className="ly-eyebrow mb-2">Proof documents attached</div>
            {request.proofs.length ? (
              <div className="flex flex-wrap gap-2">
                {request.proofs.map((doc) => (
                  <span key={doc} className="ly-chip font-mono" style={{ fontSize: "var(--fs-label)", padding: "0.35rem 0.7rem" }}>
                    📄 {doc}
                  </span>
                ))}
              </div>
            ) : (
              <p className="ly-hint" style={{ margin: 0 }}>
                No proof required for {catLabel(request.category).toLowerCase()} — governed by sponsor cap and frequency limits.
              </p>
            )}
          </div>

          <div>
            <div className="ly-eyebrow mb-3">Approval &amp; payout timeline</div>
            <div className="trace-timeline">
              {request.timeline.map((event) => (
                <div key={`${event.state}-${event.at}`} className="rounded-lg p-3" style={{ background: "var(--surface-2)" }}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong style={{ fontSize: "var(--fs-sm)" }}>{event.state}</strong>
                    <span className="font-mono" style={{ fontSize: "var(--fs-label)", color: "var(--text-tertiary)" }}>
                      {event.at}
                    </span>
                  </div>
                  <div style={{ fontSize: "var(--fs-label)", color: "var(--brand-ink)", fontWeight: 600 }}>{event.actor}</div>
                  <p className="mt-1 mb-0" style={{ fontSize: "var(--fs-sm)", color: "var(--text-secondary)" }}>
                    {event.note}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}
