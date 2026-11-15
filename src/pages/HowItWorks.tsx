import { useEffect, useMemo, useState } from "react";
import "../styles/pages/how-it-works.css";
import { MarketingNav } from "../components/marketing/MarketingNav";
import { MarketingFooter } from "../components/marketing/MarketingFooter";
import { CountUp, Reveal, useToast } from "../components/ui/primitives";
import { LifecycleFlowchart, StepSvgIcon } from "../components/how-it-works/LifecycleFlowchart";
import { RequestTraceDialog } from "../components/how-it-works/RequestTraceDialog";
import {
  LegalDialog,
  type LegalKey,
  type SignupMode,
} from "../components/marketing/LandingDialogs";
import { navigate, scrollToHash } from "../lib/navigation";
import { kes, type RequestCategory } from "../data/students";
import {
  HOW_IT_WORKS_FAQS,
  LIFECYCLE_STEPS,
  ONBOARDING_FLOWS,
  PAYOUT_MATRIX,
  SAMPLE_REQUESTS,
  getSampleRequest,
  type LifecycleStepKey,
  type SampleRequest,
} from "../data/requests";

type MatrixFilter = "all" | "proof" | "no-proof" | "per-term" | "per-request";

const MATRIX_FILTERS: { key: MatrixFilter; label: string }[] = [
  { key: "all", label: "All categories (7)" },
  { key: "proof", label: "Proof required (5)" },
  { key: "no-proof", label: "No proof needed (2)" },
  { key: "per-term", label: "Per term" },
  { key: "per-request", label: "Per request" },
];

export default function HowItWorks() {
  const { toast } = useToast();
  const [activeStep, setActiveStep] = useState<LifecycleStepKey>("request");
  const [matrixFilter, setMatrixFilter] = useState<MatrixFilter>("all");
  const [matrixQuery, setMatrixQuery] = useState("");
  const [simCategory, setSimCategory] = useState<RequestCategory>("fees");
  const [simAmount, setSimAmount] = useState<string>("53400");
  const [openFaqs, setOpenFaqs] = useState<Set<string>>(() => new Set(["fees"]));
  const [traceRequest, setTraceRequest] = useState<SampleRequest | null>(null);
  const openSignup = (mode: SignupMode | null = null) => {
    navigate(`/auth/signup${mode ? `?role=${mode}` : ""}`);
  };
  const [legal, setLegal] = useState<LegalKey | null>(null);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setEntered(true), 40);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const applyDeepLink = () => {
      const match = window.location.hash.match(/^#faq-(.+)$/);
      const id = match?.[1];
      if (id && HOW_IT_WORKS_FAQS.some((f) => f.id === id)) {
        setOpenFaqs(new Set([id]));
        window.setTimeout(() => scrollToHash(`#faq-${id}`), 100);
      }
    };
    applyDeepLink();
    window.addEventListener("popstate", applyDeepLink);
    return () => window.removeEventListener("popstate", applyDeepLink);
  }, []);

  const currentStep = useMemo(
    () => LIFECYCLE_STEPS.find((s) => s.key === activeStep) ?? LIFECYCLE_STEPS[0],
    [activeStep],
  );

  const visibleMatrix = useMemo(() => {
    const q = matrixQuery.trim().toLowerCase();
    return PAYOUT_MATRIX.filter((row) => {
      if (matrixFilter === "proof" && !row.proofRequired) return false;
      if (matrixFilter === "no-proof" && row.proofRequired) return false;
      if (matrixFilter === "per-term" && row.frequency !== "Per term") return false;
      if (matrixFilter === "per-request" && row.frequency !== "Per request") return false;
      if (!q) return true;
      return [
        row.label,
        row.primaryChannelSummary,
        row.proofDocs,
        row.frequency,
        row.typicalRangeKes,
        ...row.channels,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [matrixFilter, matrixQuery]);

  const simRule = useMemo(
    () => PAYOUT_MATRIX.find((r) => r.category === simCategory) ?? PAYOUT_MATRIX[0],
    [simCategory],
  );
  const parsedSimAmount = Math.max(0, Number(simAmount.replace(/[^\d]/g, "")) || 0);
  const exceedsCap = parsedSimAmount > simRule.defaultCapKes;
  const maxApproved = Math.min(parsedSimAmount, simRule.defaultCapKes);

  const heroReceipt = SAMPLE_REQUESTS[0];

  const toggleFaq = (id: string) => {
    setOpenFaqs((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const jumpFaq = (id: string) => {
    setOpenFaqs(new Set([id]));
    window.history.replaceState({}, "", `/how-it-works#faq-${id}`);
    window.setTimeout(() => scrollToHash(`#faq-${id}`), 50);
  };

  const toggleThemeLive = () => {
    const current = document.documentElement.getAttribute("data-bs-theme") === "dark" ? "dark" : "light";
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-bs-theme", next);
    localStorage.setItem("ly-theme", next);
    toast(`Switched to ${next} mode — preference saved to localStorage.`);
  };

  const footerNav = (destination: string) => {
    if (destination === "/how-it-works") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (destination.startsWith("/")) {
      navigate(destination);
    } else if (destination === "#get-started") {
      scrollToHash(destination);
    } else {
      navigate(`/${destination}`);
    }
  };

  return (
    <div className="page-how-it-works" id="top">
      <MarketingNav />

      {/* ===================== S1 — HERO SUBHEAD ===================== */}
      <header className="hiw-hero">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-12">
          <div
            className={`stagger lg:col-span-7 ${entered ? "is-entered" : ""}`}
            style={{ ["--stagger-step" as string]: "70ms" }}
          >
            <nav style={{ ["--idx" as string]: 0 }} className="mb-5 flex items-center gap-2" aria-label="Breadcrumb">
              <a
                href="/"
                className="breadcrumb-link"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/");
                }}
              >
                Home
              </a>
              <span style={{ color: "var(--text-tertiary)" }}>/</span>
              <span style={{ color: "var(--text-primary)", fontSize: "var(--fs-sm)" }}>How it works</span>
            </nav>

            <div style={{ ["--idx" as string]: 1 }} className="ly-eyebrow mb-3">
              Sponsorship lifecycle · Kenya payment rails
            </div>

            <h1 style={{ ["--idx" as string]: 2 }} className="hiw-title">
              From onboarding to <em>settled receipt</em> — every shilling accounted for.
            </h1>

            <p style={{ ["--idx" as string]: 3 }} className="hiw-subhead mb-5">
              See how Learnly runs the full academic-sponsorship lifecycle: onboarding a learner once, submitting proof-gated requests, running RBAC-scoped approvals, disbursing via Kenyan payment rails, and keeping an immutable audit record.
            </p>

            <div style={{ ["--idx" as string]: 4 }} className="lifecycle-pill-row mb-6">
              {["1. Onboard", "2. Request", "3. Proof", "4. Approve", "5. Disburse", "6. Reconcile"].map((step) => (
                <span key={step} className="lifecycle-pill">
                  {step}
                </span>
              ))}
            </div>

            <div style={{ ["--idx" as string]: 5 }} className="flex flex-wrap gap-3">
              <button className="ly-btn ly-btn-primary ly-btn-lg" onClick={() => openSignup("student")}>
                🎓 Start onboarding →
              </button>
              <button className="ly-btn ly-btn-outline ly-btn-lg" onClick={() => scrollToHash("#payout-matrix")}>
                View payout matrix ↓
              </button>
              <a
                href="/levels"
                className="ly-btn ly-btn-ghost ly-btn-lg"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/levels");
                }}
              >
                Education levels →
              </a>
            </div>
          </div>

          {/* Live settled receipt card */}
          <div className="lg:col-span-5">
            <Reveal delay={160}>
              <div className="receipt-preview">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <div className="ly-eyebrow mb-1">Example settled payout</div>
                    <div className="font-display" style={{ fontSize: "1.3rem" }}>
                      {heroReceipt.id}
                    </div>
                  </div>
                  <span className="ly-chip ly-status-disbursed" style={{ padding: "0.3rem 0.7rem", fontSize: "var(--fs-label)" }}>
                    <span className="ly-pulse" aria-hidden /> Settled
                  </span>
                </div>

                <div className="receipt-row">
                  <span style={{ color: "var(--text-tertiary)" }}>Learner</span>
                  <span className="font-semibold text-right">{heroReceipt.studentName}</span>
                </div>
                <div className="receipt-row">
                  <span style={{ color: "var(--text-tertiary)" }}>Institution</span>
                  <span className="text-right">{heroReceipt.school}</span>
                </div>
                <div className="receipt-row">
                  <span style={{ color: "var(--text-tertiary)" }}>Category &amp; term</span>
                  <span className="flex items-center gap-2">
                    <span className="ly-cat-dot ly-cat-dot-fees" />
                    School fees · Term 2
                  </span>
                </div>
                <div className="receipt-row">
                  <span style={{ color: "var(--text-tertiary)" }}>Amount disbursed</span>
                  <span className="font-display" style={{ fontSize: "1.2rem", color: "var(--brand-ink)" }}>
                    <CountUp value={heroReceipt.approvedKes} format={(n) => kes(n)} />
                  </span>
                </div>
                <div className="receipt-row">
                  <span style={{ color: "var(--text-tertiary)" }}>Channel</span>
                  <span className="font-mono text-right" style={{ fontSize: "var(--fs-label)" }}>
                    Equity 247247 · {heroReceipt.processorRef}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 pt-2">
                  <span className="ly-hint">Proof verified · PDF receipt + audit log</span>
                  <button
                    className="ly-btn ly-btn-outline ly-btn-sm"
                    onClick={() => setTraceRequest(heroReceipt)}
                  >
                    Inspect full trace →
                  </button>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </header>

      <main>
        {/* ===================== S2 — ONBOARDING FLOW (SIDE-BY-SIDE) ===================== */}
        <section id="onboarding-flow" className="py-16 scroll-mt-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <Reveal className="mb-10 max-w-2xl">
              <div className="ly-eyebrow mb-2">Step 1 · Onboarding flow</div>
              <h2 className="ly-h-section mb-3">Self-onboard vs Admin-onboard, side by side</h2>
              <p className="ly-lead">
                Whether a family applies from a phone or a sponsor imports an entire school cohort, both workflows build the exact same verified <code className="font-mono">StudentProfile</code> record.
              </p>
            </Reveal>

            <div className="grid gap-6 lg:grid-cols-2">
              {ONBOARDING_FLOWS.map((flow, index) => (
                <Reveal key={flow.id} delay={index * 90}>
                  <article
                    className="onboard-card hover-lift"
                    style={{
                      ["--path-accent" as string]:
                        flow.id === "student" ? "var(--brand-primary)" : "var(--brand-accent)",
                    }}
                  >
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <span
                        className="ly-chip"
                        style={{
                          padding: "0.3rem 0.75rem",
                          fontSize: "var(--fs-label)",
                          background: "var(--brand-primary-soft)",
                          borderColor: "transparent",
                          color: "var(--brand-ink)",
                        }}
                      >
                        {flow.id === "student" ? "🎓" : "📋"} {flow.badge}
                      </span>
                      <span className="font-mono" style={{ fontSize: "var(--fs-label)", color: "var(--text-tertiary)" }}>
                        {flow.routeCode}
                      </span>
                    </div>

                    <h3 className="font-display mb-2" style={{ fontSize: "var(--fs-h3)" }}>
                      {flow.title}
                    </h3>
                    <p className="mb-4" style={{ color: "var(--text-secondary)", fontSize: "var(--fs-sm)" }}>
                      {flow.subtitle}
                    </p>

                    <div className="onboard-meta-grid mb-5">
                      <div className="onboard-meta-item">
                        <span className="ly-eyebrow" style={{ color: "var(--text-tertiary)" }}>Who initiates</span>
                        <span className="text-right font-medium">{flow.who}</span>
                      </div>
                      <div className="onboard-meta-item">
                        <span className="ly-eyebrow" style={{ color: "var(--text-tertiary)" }}>Verification gate</span>
                        <span className="text-right font-medium">{flow.otpRule}</span>
                      </div>
                      <div className="onboard-meta-item">
                        <span className="ly-eyebrow" style={{ color: "var(--text-tertiary)" }}>Activation</span>
                        <span className="text-right font-medium">{flow.activationRule}</span>
                      </div>
                      <div className="onboard-meta-item">
                        <span className="ly-eyebrow" style={{ color: "var(--text-tertiary)" }}>Budget allocation</span>
                        <span className="text-right font-medium">{flow.budgetRule}</span>
                      </div>
                    </div>

                    <div className="ly-eyebrow mb-3">
                      {flow.steps.length}-step intake sequence
                    </div>
                    <ol className="onboard-step-list mb-5">
                      {flow.steps.map((step) => (
                        <li key={step.num} className="onboard-step-item">
                          <span className="onboard-step-num">{step.num}</span>
                          <div>
                            <div className="font-semibold" style={{ fontSize: "var(--fs-sm)" }}>
                              {step.label}
                            </div>
                            <div style={{ color: "var(--text-secondary)", fontSize: "var(--fs-sm)" }}>
                              {step.detail}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ol>

                    <div className="mt-auto pt-3">
                      <button
                        className={`ly-btn w-full ${flow.id === "student" ? "ly-btn-primary" : "ly-btn-outline"}`}
                        onClick={() => openSignup(null)}
                      >
                        {flow.ctaLabel}
                      </button>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>

            <Reveal delay={160} className="mt-6">
              <div className="shared-record-banner">
                <div>
                  <div className="ly-eyebrow mb-1">Unified origin-to-graduation record</div>
                  <div className="font-semibold">
                    Both onboarding paths lock in the learner's origin school node, NEMIS UPI / ID stack, and 5-purpose DPA 2019 consent hash.
                  </div>
                </div>
                <button className="ly-btn ly-btn-outline ly-btn-sm" onClick={() => setLegal("dpa")}>
                  Read DPA 2019 Notice →
                </button>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ===================== S3 — REQUEST LIFECYCLE DIAGRAM (5 STEPS) ===================== */}
        <section id="request-lifecycle" className="lifecycle-section py-16 scroll-mt-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <Reveal className="mx-auto mb-9 max-w-2xl text-center">
              <div className="ly-eyebrow mb-2">Step 2 · Request lifecycle diagram</div>
              <h2 className="ly-h-section mb-3">Five audited stages from request to reconciled receipt</h2>
              <p className="ly-lead">
                Every shilling passes through strict state transitions — with proof gating, downward-only cap adjustments, automatic retries and nightly bank/M-Pesa reconciliation.
              </p>
            </Reveal>

            {/* Draw-in Flowchart SVG */}
            <LifecycleFlowchart activeStep={activeStep} onSelect={setActiveStep} />

            {/* 5 Interactive Step Cards with Icons */}
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {LIFECYCLE_STEPS.map((step, idx) => {
                const isActive = step.key === activeStep;
                return (
                  <Reveal key={step.key} delay={idx * 60}>
                    <button
                      type="button"
                      className={`step-card ${isActive ? "is-active" : ""}`}
                      aria-pressed={isActive}
                      onClick={() => setActiveStep(step.key)}
                    >
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <span className="step-icon-badge">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <StepSvgIcon step={step.key} />
                          </svg>
                        </span>
                        <span className="font-mono" style={{ fontSize: "var(--fs-label)", color: "var(--text-tertiary)", fontWeight: 700 }}>
                          {step.index}
                        </span>
                      </div>
                      <div className="font-display mb-1" style={{ fontSize: "1.1rem", fontWeight: 600 }}>
                        {step.short}
                      </div>
                      <div className="font-mono mb-2" style={{ fontSize: "var(--fs-label)", color: "var(--brand-ink)" }}>
                        {step.metricValue}
                      </div>
                      <div className="mt-auto" style={{ fontSize: "var(--fs-sm)", color: "var(--text-secondary)" }}>
                        {step.actor}
                      </div>
                    </button>
                  </Reveal>
                );
              })}
            </div>

            {/* Active Step Deep-Dive Panel */}
            <Reveal delay={120} className="mt-5">
              <div className="step-detail-panel" role="region" aria-live="polite" aria-label={`Details for ${currentStep.title}`}>
                <div className="grid gap-6 lg:grid-cols-12">
                  <div className="lg:col-span-7">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="ly-eyebrow">Stage {currentStep.index} · {currentStep.actor}</span>
                      <span className="ly-chip font-mono" style={{ padding: "0.2rem 0.65rem", fontSize: "var(--fs-label)" }}>
                        {currentStep.states}
                      </span>
                    </div>
                    <h3 className="font-display mb-2" style={{ fontSize: "var(--fs-h3)" }}>
                      {currentStep.title}
                    </h3>
                    <p className="mb-4" style={{ color: "var(--text-secondary)" }}>
                      {currentStep.summary}
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <button
                        className="ly-btn ly-btn-primary ly-btn-sm"
                        onClick={() => setTraceRequest(getSampleRequest(currentStep.sampleRequestId))}
                      >
                        Trace sample {currentStep.sampleRequestId} →
                      </button>
                      <button
                        className="ly-btn ly-btn-outline ly-btn-sm"
                        onClick={() => {
                          const currentIdx = LIFECYCLE_STEPS.findIndex((s) => s.key === activeStep);
                          const next = LIFECYCLE_STEPS[(currentIdx + 1) % LIFECYCLE_STEPS.length];
                          setActiveStep(next.key);
                        }}
                      >
                        Next stage →
                      </button>
                    </div>
                  </div>

                  <div className="lg:col-span-5">
                    <div className="rounded-xl p-4" style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)" }}>
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <span className="ly-eyebrow">Engine guarantees</span>
                        <span className="font-mono" style={{ fontSize: "var(--fs-label)", color: "var(--text-tertiary)" }}>
                          {currentStep.metricLabel}
                        </span>
                      </div>
                      <ul className="grid gap-2.5" style={{ listStyle: "none", padding: 0, margin: 0 }}>
                        {currentStep.engineRules.map((rule) => (
                          <li key={rule} className="rule-bullet">
                            <span style={{ color: "var(--brand-success)", fontWeight: 700 }}>✓</span>
                            <span>{rule}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ===================== S4 — PAYOUT CHANNELING MATRIX ===================== */}
        <section id="payout-matrix" className="py-16 scroll-mt-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-2xl">
                <div className="ly-eyebrow mb-2">Step 3 · Payout channeling matrix</div>
                <h2 className="ly-h-section mb-2">Every category routes only to permitted channels</h2>
                <p className="ly-lead">
                  In the request drawer, Learnly automatically filters payout destinations by category so school fees never divert to personal mobile wallets.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="ly-chip" style={{ padding: "0.35rem 0.75rem" }}>
                  <span className="font-display" style={{ color: "var(--brand-ink)" }}>7</span> categories
                </span>
                <span className="ly-chip" style={{ padding: "0.35rem 0.75rem" }}>
                  <span className="font-display" style={{ color: "var(--brand-ink)" }}>5</span> Kenyan rails
                </span>
              </div>
            </Reveal>

            {/* Matrix filter bar */}
            <Reveal className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2" role="group" aria-label="Filter payout matrix">
                {MATRIX_FILTERS.map((f) => (
                  <button
                    key={f.key}
                    className={`filter-chip ${matrixFilter === f.key ? "is-active" : ""}`}
                    aria-pressed={matrixFilter === f.key}
                    onClick={() => setMatrixFilter(f.key)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div style={{ minWidth: "min(100%, 260px)" }}>
                <input
                  type="search"
                  className="ly-input"
                  value={matrixQuery}
                  onChange={(e) => setMatrixQuery(e.target.value)}
                  placeholder="Filter by M-Pesa, Paybill, KNEC, card…"
                  aria-label="Search payout channeling matrix"
                />
              </div>
            </Reveal>

            {/* Responsive table -> stacked cards < md */}
            <Reveal>
              {visibleMatrix.length ? (
                <div className="ly-table-wrap is-card-stack">
                  <table className="ly-table responsive-table">
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>Allowed payout channels</th>
                        <th>Proof required</th>
                        <th>Frequency &amp; typical KES</th>
                        <th>Trace</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleMatrix.map((row) => (
                        <tr key={row.category}>
                          <td data-label="Category">
                            <div className="flex items-start gap-2.5">
                              <span className={`ly-cat-dot ly-cat-dot-${row.category} mt-1.5 flex-shrink-0`} />
                              <div className="text-left">
                                <div className="font-semibold">{row.label}</div>
                                <div className="ly-hint mt-0.5">{row.destinationHint}</div>
                              </div>
                            </div>
                          </td>
                          <td data-label="Allowed channels">
                            <div className="flex flex-wrap justify-end gap-1.5 md:justify-start">
                              {row.channels.map((ch) => (
                                <span key={ch} className="channel-tag">
                                  {ch}
                                </span>
                              ))}
                            </div>
                            <div className="ly-hint mt-1.5">{row.primaryChannelSummary}</div>
                          </td>
                          <td data-label="Proof required">
                            <div className="flex flex-col items-end gap-1 md:items-start">
                              <span
                                className={`ly-chip ${row.proofRequired ? "ly-status-pending" : "ly-status-approved"}`}
                                style={{ padding: "0.2rem 0.65rem", fontSize: "var(--fs-label)" }}
                              >
                                {row.proofRequired ? "Proof gated" : "No proof needed"}
                              </span>
                              <span style={{ color: "var(--text-secondary)", fontSize: "var(--fs-sm)" }}>
                                {row.proofDocs}
                              </span>
                            </div>
                          </td>
                          <td data-label="Frequency & KES">
                            <div className="font-display" style={{ color: "var(--brand-ink)", fontSize: "0.98rem" }}>
                              {row.typicalRangeKes}
                            </div>
                            <div className="ly-hint mt-0.5">
                              {row.frequency} · Default cap {kes(row.defaultCapKes)}
                            </div>
                          </td>
                          <td data-label="Sample">
                            <button
                              className="ly-btn ly-btn-outline ly-btn-sm"
                              onClick={() => setTraceRequest(getSampleRequest(row.sampleRequestId))}
                            >
                              {row.sampleRequestId} →
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="ly-card p-8 text-center">
                  <h3 className="font-display mb-2" style={{ fontSize: "var(--fs-h3)" }}>
                    No category matches “{matrixQuery}”
                  </h3>
                  <p className="ly-lead mb-4" style={{ fontSize: "1rem" }}>
                    Clear your filter to compare all 7 Kenyan sponsorship categories and their payout rails.
                  </p>
                  <button
                    className="ly-btn ly-btn-primary"
                    onClick={() => {
                      setMatrixFilter("all");
                      setMatrixQuery("");
                    }}
                  >
                    Reset matrix filters
                  </button>
                </div>
              )}
            </Reveal>

            {/* Interactive Payout & Proof-Gate Simulator */}
            <Reveal delay={120} className="mt-8">
              <div className="simulator-card">
                <div className="grid items-start gap-6 lg:grid-cols-12">
                  <div className="lg:col-span-5">
                    <div className="ly-eyebrow mb-1">Try the engine rules</div>
                    <h3 className="font-display mb-2" style={{ fontSize: "var(--fs-h3)" }}>
                      Check channel lock &amp; proof gate
                    </h3>
                    <p className="mb-4" style={{ color: "var(--text-secondary)", fontSize: "var(--fs-sm)" }}>
                      Pick any category and KES amount to see which payout rails unlock and what documents Learnly requires before submission.
                    </p>
                    <div className="grid gap-3">
                      <div className="ly-field">
                        <label className="ly-label" htmlFor="sim-cat">
                          Request category
                        </label>
                        <select
                          id="sim-cat"
                          className="ly-select"
                          value={simCategory}
                          onChange={(e) => {
                            const next = e.target.value as RequestCategory;
                            setSimCategory(next);
                            const matched = PAYOUT_MATRIX.find((r) => r.category === next);
                            if (matched) setSimAmount(String(Math.round(matched.defaultCapKes * 0.6)));
                          }}
                        >
                          {PAYOUT_MATRIX.map((r) => (
                            <option key={r.category} value={r.category}>
                              {r.label} ({r.frequency})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="ly-field">
                        <label className="ly-label" htmlFor="sim-amount">
                          Requested amount (KES)
                        </label>
                        <input
                          id="sim-amount"
                          inputMode="numeric"
                          className={`ly-input ${exceedsCap ? "is-invalid" : ""}`}
                          value={simAmount}
                          onChange={(e) => setSimAmount(e.target.value.replace(/[^\d]/g, ""))}
                          placeholder="53400"
                        />
                        <span className="ly-hint">
                          Default category cap: <strong className="font-display">{kes(simRule.defaultCapKes)}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-7">
                    <div className="simulator-result grid gap-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="flex items-center gap-2 font-semibold">
                          <span className={`ly-cat-dot ly-cat-dot-${simRule.category}`} />
                          {simRule.label}
                        </span>
                        <span
                          className={`ly-chip ${exceedsCap ? "ly-status-rejected" : "ly-status-approved"}`}
                          style={{ padding: "0.2rem 0.7rem", fontSize: "var(--fs-label)" }}
                        >
                          {exceedsCap
                            ? `Exceeds cap by ${kes(parsedSimAmount - simRule.defaultCapKes)}`
                            : `Within cap (${kes(maxApproved)})`}
                        </span>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-lg p-3" style={{ background: "var(--surface-1)", border: "1px solid var(--border-subtle)" }}>
                          <div className="ly-eyebrow mb-1" style={{ color: "var(--text-tertiary)" }}>Unlocked destinations</div>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {simRule.channels.map((ch) => (
                              <span key={ch} className="channel-tag">{ch}</span>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-lg p-3" style={{ background: "var(--surface-1)", border: "1px solid var(--border-subtle)" }}>
                          <div className="ly-eyebrow mb-1" style={{ color: "var(--text-tertiary)" }}>Proof gate</div>
                          <div className="font-semibold" style={{ fontSize: "var(--fs-sm)" }}>
                            {simRule.proofRequired ? "Blocked without upload" : "Instant submit (no upload)"}
                          </div>
                          <div className="ly-hint mt-1">{simRule.proofDocs}</div>
                        </div>
                      </div>

                      <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
                        <strong>OCR &amp; approval note:</strong> {simRule.ocrNote}{" "}
                        {exceedsCap
                          ? `An admin cannot approve above ${kes(simRule.defaultCapKes)} without a cap override — requesting ${kes(parsedSimAmount)} will flag the binding cap immediately.`
                          : "Approvers can approve in full or adjust downward (a written reason is mandatory if adjusted by more than 10%)."}
                      </div>

                      <div className="flex flex-wrap justify-end gap-2 pt-1">
                        <button
                          className="ly-btn ly-btn-outline ly-btn-sm"
                          onClick={() => setTraceRequest(getSampleRequest(simRule.sampleRequestId))}
                        >
                          Inspect {simRule.sampleRequestId} →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ===================== S5 — FAQ ACCORDION (8 Q&As) ===================== */}
        <section id="faq" className="py-16 scroll-mt-20" style={{ background: "var(--surface-2)", borderTop: "1px solid var(--border-subtle)" }}>
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <Reveal className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-2xl">
                <div className="ly-eyebrow mb-2">Frequently asked questions</div>
                <h2 className="ly-h-section mb-2">Everything sponsors, parents &amp; learners ask</h2>
                <p className="ly-lead">
                  Eight straight answers covering fees, proof, M-Pesa, NEMIS, dark mode, DPA data export, deletions and language.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="ly-btn ly-btn-outline ly-btn-sm"
                  onClick={() => setOpenFaqs(new Set(HOW_IT_WORKS_FAQS.map((f) => f.id)))}
                >
                  Expand all 8
                </button>
                <button
                  className="ly-btn ly-btn-ghost ly-btn-sm"
                  onClick={() => setOpenFaqs(new Set())}
                  disabled={openFaqs.size === 0}
                >
                  Collapse all
                </button>
              </div>
            </Reveal>

            {/* Quick topic jump chips */}
            <Reveal className="mb-6 flex flex-wrap gap-2">
              {HOW_IT_WORKS_FAQS.map((faq) => (
                <button
                  key={faq.id}
                  className={`filter-chip ${openFaqs.has(faq.id) ? "is-active" : ""}`}
                  onClick={() => jumpFaq(faq.id)}
                >
                  {faq.topic}
                </button>
              ))}
            </Reveal>

            {/* Bootstrap-style accordion-flush */}
            <div className="faq-accordion accordion accordion-flush">
              {HOW_IT_WORKS_FAQS.map((faq, idx) => {
                const isOpen = openFaqs.has(faq.id);
                return (
                  <Reveal key={faq.id} delay={idx * 50}>
                    <article id={`faq-${faq.id}`} className={`faq-item ${isOpen ? "is-open" : ""}`}>
                      <h3 style={{ margin: 0 }}>
                        <button
                          id={`faq-trigger-${faq.id}`}
                          className="faq-trigger"
                          aria-expanded={isOpen}
                          aria-controls={`faq-panel-${faq.id}`}
                          onClick={() => toggleFaq(faq.id)}
                        >
                          <span className="faq-topic-pill">{faq.topic}</span>
                          <span className="font-semibold">{faq.question}</span>
                          <ChevronIcon />
                        </button>
                      </h3>
                      <div
                        id={`faq-panel-${faq.id}`}
                        className="faq-panel"
                        role="region"
                        aria-labelledby={`faq-trigger-${faq.id}`}
                        aria-hidden={!isOpen}
                      >
                        <div className="faq-panel-inner">
                          <div className="faq-body">
                            <p style={{ margin: 0 }}>{faq.answer}</p>
                            <div className="faq-note">{faq.detail}</div>

                            {faq.interactiveAction === "toggle-theme" && (
                              <div className="mt-3">
                                <button
                                  className="ly-btn ly-btn-outline ly-btn-sm"
                                  tabIndex={isOpen ? 0 : -1}
                                  onClick={toggleThemeLive}
                                >
                                  Toggle light / dark mode right now
                                </button>
                              </div>
                            )}

                            {faq.interactiveAction === "open-dpa" && (
                              <div className="mt-3">
                                <button
                                  className="ly-btn ly-btn-outline ly-btn-sm"
                                  tabIndex={isOpen ? 0 : -1}
                                  onClick={() => setLegal("dpa")}
                                >
                                  Read full DPA 2019 Notice →
                                </button>
                              </div>
                            )}

                            {faq.interactiveAction === "go-levels" && (
                              <div className="mt-3">
                                <a
                                  href="/levels"
                                  className="ly-btn ly-btn-outline ly-btn-sm"
                                  tabIndex={isOpen ? 0 : -1}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    navigate("/levels");
                                  }}
                                >
                                  See IDs required per education level →
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* ===================== CLOSING CTA ===================== */}
        <section id="get-started" className="py-16 scroll-mt-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <Reveal>
              <div className="hiw-cta">
                <div className="relative z-10 mx-auto max-w-2xl text-center">
                  <div className="ly-eyebrow mb-2" style={{ color: "var(--brand-accent)" }}>
                    Ready to start
                  </div>
                  <h2 className="font-display mb-3" style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)", lineHeight: 1.12 }}>
                    Sponsor or apply with proof, approvals &amp; payouts built in
                  </h2>
                  <p className="mx-auto mb-6 max-w-xl" style={{ color: "var(--text-on-brand)", opacity: 0.82, fontSize: "1.05rem", lineHeight: 1.7 }}>
                    Start a learner profile in 7 saved steps or set up your sponsor admin console for direct school bank, M-Pesa B2C and Airtel Money disbursements.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button className="ly-btn ly-btn-gold ly-btn-lg" onClick={() => openSignup("student")}>
                      🎓 Apply as Student →
                    </button>
                    <button
                      className="ly-btn ly-btn-lg"
                      style={{
                        color: "var(--text-on-brand)",
                        borderColor: "color-mix(in srgb, var(--text-on-brand) 40%, transparent)",
                      }}
                      onClick={() => openSignup("admin")}
                    >
                      📋 Admin Console →
                    </button>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <MarketingFooter onLegal={setLegal} onNav={footerNav} />

      {/* ===================== DIALOGS ===================== */}
      <RequestTraceDialog
        request={traceRequest}
        onClose={() => setTraceRequest(null)}
        onStartOnboarding={() => {
          setTraceRequest(null);
          openSignup("student");
        }}
      />
      <LegalDialog which={legal} onClose={() => setLegal(null)} />
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg className="faq-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
