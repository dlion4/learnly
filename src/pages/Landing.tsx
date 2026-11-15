import { useCallback, useEffect, useState } from "react";
import { navigate } from "../lib/navigation";
import "../styles/pages/landing.css";
import { MarketingNav } from "../components/marketing/MarketingNav";
import { MarketingFooter } from "../components/marketing/MarketingFooter";
import { CountUp, Reveal } from "../components/ui/primitives";
import {
  FeatureDialog,
  LegalDialog,
  LevelDialog,
  type FeatureKey,
  type LegalKey,
  type SignupMode,
} from "../components/marketing/LandingDialogs";
import { EDU_LEVELS, HERO_PATHWAY, PLATFORM_STATS, kes, type EduLevel } from "../data/students";
import { PARTNER_SCHOOLS } from "../data/schools";

const EDU_VAR: Record<string, string> = {
  preprimary: "var(--edu-preprimary)",
  primary: "var(--edu-primary)",
  junior: "var(--edu-junior)",
  senior: "var(--edu-senior)",
  tvet: "var(--edu-tvet)",
  college: "var(--edu-college)",
  university: "var(--edu-university)",
  special: "var(--edu-special)",
  international: "var(--edu-international)",
};

export default function Landing() {
  const openSignup = useCallback((mode: SignupMode | null = null) => {
    navigate(`/auth/signup${mode ? `?role=${mode}` : ""}`);
  }, []);
  const [feature, setFeature] = useState<FeatureKey | null>(null);
  const [level, setLevel] = useState<EduLevel | null>(null);
  const [legal, setLegal] = useState<LegalKey | null>(null);
  const [heroEntered, setHeroEntered] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setHeroEntered(true), 40);
    return () => window.clearTimeout(t);
  }, []);

  const scrollTo = useCallback((destination: string) => {
    if (destination.startsWith("/")) navigate(destination);
    else document.querySelector(destination)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div className="page-landing" id="top">
      <MarketingNav />

      {/* ===================== S1 — HERO ===================== */}
      <section className="hero">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-12">
          <div className={`stagger lg:col-span-6 ${heroEntered ? "is-entered" : ""}`} style={{ ["--stagger-step" as string]: "80ms" }}>
            <div style={{ ["--idx" as string]: 0 }} className="mb-4 flex flex-wrap items-center gap-2">
              <span className="ly-chip">
                <span className="ly-pulse" aria-hidden /> Live in {PLATFORM_STATS.counties} counties
              </span>
              <span className="ly-chip" style={{ background: "var(--brand-primary-soft)", borderColor: "transparent", color: "var(--brand-primary)" }}>
                CBC · 8-4-4 · TVET · University
              </span>
            </div>
            <h1 style={{ ["--idx" as string]: 1 }} className="hero-title mb-5">
              Sponsor a learner. <br />
              From <span className="gold">PP1</span> to <em>PhD</em>.
            </h1>
            <p style={{ ["--idx" as string]: 2 }} className="hero-sub mb-7">
              Manage school fees, upkeep, pocket money &amp; fare for every Kenyan academic level — with proof, approvals &amp; payouts.
            </p>
            <div style={{ ["--idx" as string]: 3 }} className="flex flex-wrap items-center gap-3">
              <button className="ly-btn ly-btn-primary ly-btn-lg" onClick={() => openSignup("student")}>
                🎓 Apply as Student →
              </button>
              <button className="ly-btn ly-btn-outline ly-btn-lg" onClick={() => openSignup("admin")}>
                📋 Admin Console →
              </button>
            </div>
            <div style={{ ["--idx" as string]: 4 }} className="hero-proof mt-7">
              <div className="avatar-stack" aria-hidden>
                {["AW", "BO", "FC", "HH", "ZM"].map((i, n) => (
                  <span key={i} style={{ background: EDU_VAR[Object.keys(EDU_VAR)[n]] }}>
                    {i}
                  </span>
                ))}
              </div>
              <span>
                Trusted by sponsors, bursars and guardians in Nairobi, Kisumu, Nakuru, Eldoret &amp; Mombasa.
              </span>
            </div>
          </div>

          {/* Hero illustration — CBC pathway ribbon */}
          <div className="hero-art lg:col-span-6">
            <div className="float-chip tl">
              <span className="ly-cat-dot ly-cat-dot-fees" /> Fees → KCB 522522 · <strong>settled</strong>
            </div>
            <div className="pathway-card">
              <GraduationCap />
              <div className="ly-eyebrow mb-1">Live sponsorship pathway</div>
              <div className="font-display mb-4" style={{ fontSize: "1.25rem" }}>
                One platform, every level
              </div>
              {HERO_PATHWAY.map((r, i) => (
                <div key={r.badge}>
                  <div className="ribbon" style={{ ["--ribbon" as string]: EDU_VAR[r.level], ["--idx" as string]: i }}>
                    <div className="ribbon-badge">{r.badge}</div>
                    <div className="min-w-0">
                      <div className="ribbon-title truncate">{r.name}</div>
                      <div className="ribbon-meta truncate">{r.meta}</div>
                    </div>
                    <div className="ribbon-kes">{kes(r.kes)}</div>
                  </div>
                  {i < HERO_PATHWAY.length - 1 && <div className="ribbon-connector" />}
                </div>
              ))}
            </div>
            <div className="float-chip br">
              <span className="ly-pulse" aria-hidden /> M-Pesa B2C <span className="font-mono">RKX7H8KP2</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== S2 — TRUST BAR ===================== */}
      <section className="trust-bar" aria-label="Trust indicators">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-3 px-4 py-5 sm:px-6 lg:justify-between">
          <TrustPill icon={<MpesaIcon />} label="M-Pesa B2C" sub="Daraja API" />
          <TrustPill icon={<span style={{ color: "var(--brand-danger)", fontWeight: 800 }}>A</span>} label="Airtel Money" sub="B2C rails" />
          <TrustPill icon={<span>🪪</span>} label="NEMIS-linked" sub="UPI verified" />
          <TrustPill icon={<span>🛡️</span>} label="DPA 2019 Compliant" sub="ODPC registered" />
          <div className="ly-chip" style={{ padding: "0.6rem 1.1rem" }}>
            <span className="trust-stat">
              <CountUp value={PLATFORM_STATS.studentsSponsored} suffix="+" />
            </span>
            <span style={{ color: "var(--text-secondary)" }}>students sponsored</span>
          </div>
        </div>
      </section>

      {/* Partner schools marquee */}
      <section className="py-8" aria-label="Partner institutions">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="ly-eyebrow mb-4 text-center">Paying fees directly to</div>
          <div className="marquee">
            <div className="marquee-track">
              {[...PARTNER_SCHOOLS, ...PARTNER_SCHOOLS].map((s, i) => (
                <span key={`${s.id}-${i}`} className="marquee-item">
                  <span className="ly-cat-dot" style={{ background: EDU_VAR[s.level] }} />
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===================== S3 — FEATURE CARDS ===================== */}
      <section id="features" className="py-16 scroll-mt-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal className="mx-auto mb-10 max-w-2xl text-center">
            <div className="ly-eyebrow mb-2">Why Learnly</div>
            <h2 className="ly-h-section mb-3">Built for how sponsorship actually works in Kenya</h2>
            <p className="ly-lead">Not a generic wallet. A system that knows the difference between Term 2 fees at Alliance and a Grade 8 learner's weekly pocket money.</p>
          </Reveal>

          <div className="grid gap-5 sm:grid-cols-1 lg:grid-cols-3">
            <FeatureCard
              delay={0}
              accent="var(--brand-primary)"
              icon={<PayoutIcon />}
              title="Multi-channel payouts"
              desc="Fees → school bank or paybill, upkeep → M-Pesa, pocket money → school card. Every category routes to the right destination."
              onMore={() => setFeature("payouts")}
            >
              <div className="mt-4">
                {[
                  ["fees", "School fees", "KCB 522522 · Equity 247247"],
                  ["upkeep", "Upkeep", "M-Pesa B2C · Airtel"],
                  ["pocketmoney", "Pocket money", "Pocket card · Pesapal"],
                ].map(([k, c, d]) => (
                  <div key={k} className="channel-row">
                    <span className="flex items-center gap-2">
                      <span className={`ly-cat-dot ly-cat-dot-${k}`} /> {c}
                    </span>
                    <span style={{ color: "var(--text-tertiary)" }}>{d}</span>
                  </div>
                ))}
              </div>
            </FeatureCard>

            <FeatureCard
              delay={80}
              accent="var(--brand-success)"
              icon={<ShieldCheckIcon />}
              title="Proof-gated approvals"
              desc="Fees & upkeep require result-slip uploads. Equipment needs a proforma. Nothing is disbursed until proof is verified and approved."
              onMore={() => setFeature("approvals")}
            >
              <div className="mt-4 stepper-h" style={{ gap: 6 }}>
                <span className="step is-done" style={{ minWidth: 0, flex: 1 }}>✓ Proof</span>
                <span className="step is-done" style={{ minWidth: 0, flex: 1 }}>✓ Verify</span>
                <span className="step is-active" style={{ minWidth: 0, flex: 1 }}>
                  <span className="ly-pulse" style={{ background: "var(--text-on-brand)" }} /> Approve
                </span>
              </div>
            </FeatureCard>

            <FeatureCard
              delay={160}
              accent="var(--brand-purple)"
              icon={<MapIcon />}
              title="Full Kenyan education map"
              desc="Every level — PP1 to PhD — covered. CBC pathways, legacy 8-4-4, TVET levels, KMTC, national polytechnics and universities."
              onMore={() => setFeature("map")}
            >
              <div className="mt-4 flex flex-wrap gap-1.5">
                {EDU_LEVELS.slice(0, 7).map((l) => (
                  <span key={l.key} className={`ly-edu-badge ly-edu-badge-${l.key}`}>
                    {l.short.split(" ")[0]}
                  </span>
                ))}
              </div>
            </FeatureCard>
          </div>
        </div>
      </section>

      {/* ===================== S4 — HOW IT WORKS ===================== */}
      <section id="how-it-works" className="how py-16 scroll-mt-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal className="mx-auto mb-10 max-w-2xl text-center">
            <div className="ly-eyebrow mb-2">How it works</div>
            <h2 className="ly-h-section mb-3">Three steps from onboarding to disbursement</h2>
            <p className="ly-lead">A student or an admin starts the profile; from there every request follows the same auditable path.</p>
          </Reveal>

          <div className="grid gap-5 lg:grid-cols-3">
            {[
              {
                n: "01",
                icon: <UserPlusIcon />,
                title: "Onboard the profile",
                desc: "Student self-onboards in 7 steps or an admin does it for them — identity (birth cert / ID / NEMIS UPI), family, home, school, documents.",
                foot: "Draft saved automatically · DPA consent captured",
              },
              {
                n: "02",
                icon: <ClipboardIcon />,
                title: "Request → approve",
                desc: "Student requests fees, upkeep, pocket money, fare, equipment, medical or exam registration. Admin reviews with proof where the category requires it.",
                foot: "Ref LRQ-2025-00123 · caps enforced per term",
              },
              {
                n: "03",
                icon: <SendIcon />,
                title: "Disburse to the right place",
                desc: "The system pays the school bank/paybill, M-Pesa, Airtel or pocket card — with a receipt, SMS and nightly reconciliation.",
                foot: "Settled via Daraja · reversible within 24h",
              },
            ].map((s, i) => (
              <Reveal key={s.n} delay={i * 90} className="relative">
                <div className="ly-card hover-lift how-step h-full">
                  <div className="how-num" aria-hidden>
                    {s.n}
                  </div>
                  <div className="how-icon mb-4">{s.icon}</div>
                  <h3 className="font-display mb-2" style={{ fontSize: "var(--fs-h3)" }}>
                    {s.title}
                  </h3>
                  <p style={{ color: "var(--text-secondary)" }}>{s.desc}</p>
                  <div className="mt-4 ly-hint font-mono">{s.foot}</div>
                  {i < 2 && <div className="how-connector" aria-hidden />}
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-10 text-center">
            <blockquote className="ly-quote mx-auto max-w-2xl" style={{ margin: "0 auto" }}>
              "We used to chase bursars with M-Pesa screenshots every term. Now the fee structure is uploaded once, approved once, and the school confirms receipt the same day."
            </blockquote>
            <div className="mt-3 text-sm" style={{ color: "var(--text-tertiary)" }}>
              — Sponsor coordinator, Nakuru County cohort (42 learners)
            </div>
            <div className="mt-6">
              <a
                href="/how-it-works"
                className="ly-btn ly-btn-outline"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/how-it-works");
                }}
              >
                Explore full lifecycle &amp; payout matrix →
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===================== EDUCATION MAP ===================== */}
      <section id="education-map" className="py-16 scroll-mt-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-xl">
              <div className="ly-eyebrow mb-2">Education levels</div>
              <h2 className="ly-h-section mb-2">Every Kenyan level, one taxonomy</h2>
              <p className="ly-lead">Tap a level to see grades, KNEC touch-points, typical fees and the identifiers Learnly asks for.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="ly-chip" style={{ padding: "0.35rem 0.75rem" }}>
                <span className="font-display" style={{ color: "var(--brand-primary)" }}>
                  <CountUp value={PLATFORM_STATS.partnerSchools} suffix="+" />
                </span>
                institutions
              </span>
              <span className="ly-chip" style={{ padding: "0.35rem 0.75rem" }}>
                <span className="font-display" style={{ color: "var(--brand-primary)" }}>
                  <CountUp value={PLATFORM_STATS.disbursedKes / 1_000_000} format={(n) => `KES ${n.toFixed(1)}M`} />
                </span>
                disbursed
              </span>
            </div>
          </Reveal>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {EDU_LEVELS.map((l, i) => (
              <Reveal key={l.key} delay={(i % 3) * 60}>
                <button className="edu-tile hover-lift" style={{ ["--tile" as string]: EDU_VAR[l.key] }} onClick={() => setLevel(l)}>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className={`ly-edu-badge ly-edu-badge-${l.key}`}>{l.short}</span>
                    <span style={{ color: "var(--text-tertiary)" }}>→</span>
                  </div>
                  <div className="font-semibold">{l.label}</div>
                  <div className="ly-hint mt-1">{l.exam}</div>
                  <div className="font-display mt-2" style={{ color: "var(--brand-primary)" }}>
                    {l.feesRange}
                  </div>
                </button>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== S5 — CTA ===================== */}
      <section id="get-started" className="pb-16 pt-4 scroll-mt-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal>
            <div className="cta-banner">
              <div className="relative z-10 grid items-center gap-8 lg:grid-cols-12">
                <div className="lg:col-span-6">
                  <div className="ly-eyebrow mb-2" style={{ color: "var(--brand-accent)" }}>
                    Get started
                  </div>
                  <h2 className="cta-title mb-3">Ready to onboard a student?</h2>
                  <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "1.05rem", lineHeight: 1.7 }}>
                    Self-onboard as a learner or guardian, or let an administrator onboard a whole cohort — either way, the profile is ready for its first request in under ten minutes.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button className="ly-btn ly-btn-gold ly-btn-lg" onClick={() => openSignup(null)}>
                      Get Started →
                    </button>
                    <a
                      href="/auth/signin"
                      className="ly-btn ly-btn-lg"
                      style={{ color: "var(--text-on-brand)", borderColor: "rgba(255,255,255,0.35)" }}
                      onClick={(e) => {
                        e.preventDefault();
                        navigate("/auth/signin");
                      }}
                    >
                      I already have an account
                    </a>
                  </div>
                </div>
                <div className="grid gap-3 lg:col-span-6">
                  <button className="cta-option" onClick={() => openSignup("student")}>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">🎓 Self-onboard</span>
                      <span>→</span>
                    </div>
                    <div className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.75)" }}>
                      Student, parent or guardian. 7 steps, drafts saved, OTP-verified phone.
                    </div>
                  </button>
                  <button className="cta-option" onClick={() => openSignup("admin")}>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">📋 Admin-onboard</span>
                      <span>→</span>
                    </div>
                    <div className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.75)" }}>
                      Sponsor or school staff. Bulk CSV import, budget lines, RBAC-scoped approvals.
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <MarketingFooter onLegal={setLegal} onNav={scrollTo} />

      {/* ===================== DIALOGS ===================== */}
      <FeatureDialog
        feature={feature}
        onClose={() => setFeature(null)}
        onLevels={() => {
          setFeature(null);
          scrollTo("#education-map");
        }}
      />
      <LevelDialog
        level={level}
        onClose={() => setLevel(null)}
        onApply={() => {
          setLevel(null);
          openSignup("student");
        }}
      />
      <LegalDialog which={legal} onClose={() => setLegal(null)} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Local sub-components                                                */
/* ------------------------------------------------------------------ */
function TrustPill({ icon, label, sub }: { icon: React.ReactNode; label: string; sub: string }) {
  return (
    <div className="ly-chip" style={{ padding: "0.6rem 1.1rem" }}>
      <span style={{ width: 22, display: "inline-flex", justifyContent: "center" }} aria-hidden>
        {icon}
      </span>
      <span>
        {label}
        <span className="ml-2 font-normal" style={{ color: "var(--text-tertiary)", fontSize: "var(--fs-label)" }}>
          {sub}
        </span>
      </span>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
  accent,
  delay,
  onMore,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  accent: string;
  delay: number;
  onMore: () => void;
  children?: React.ReactNode;
}) {
  return (
    <Reveal delay={delay}>
      <article className="ly-card hover-lift flex h-full flex-col p-6">
        <div className="feature-icon mb-4" style={{ ["--accent" as string]: accent }}>
          {icon}
        </div>
        <h3 className="font-display mb-2" style={{ fontSize: "var(--fs-h3)" }}>
          {title}
        </h3>
        <p style={{ color: "var(--text-secondary)" }}>{desc}</p>
        {children}
        <div className="mt-auto pt-5">
          <button className="feature-link" onClick={onMore}>
            Learn more <span aria-hidden>→</span>
          </button>
        </div>
      </article>
    </Reveal>
  );
}

/* Hero graduation-cap SVG with icon-draw stroke animation */
function GraduationCap() {
  return (
    <svg className="cap-svg" viewBox="0 0 120 120" fill="none" aria-hidden>
      <circle cx="60" cy="60" r="56" fill="var(--brand-primary)" />
      <circle cx="60" cy="60" r="56" stroke="var(--brand-accent)" strokeWidth="3" pathLength={1} className="icon-draw" style={{ animationDelay: "200ms" }} />
      <path d="M22 54 60 36l38 18-38 18-38-18Z" stroke="var(--brand-accent)" strokeWidth="4" strokeLinejoin="round" pathLength={1} className="icon-draw" style={{ animationDelay: "500ms" }} />
      <path d="M38 61v16c7 8 37 8 44 0V61" stroke="var(--text-on-brand)" strokeWidth="4" strokeLinecap="round" pathLength={1} className="icon-draw" style={{ animationDelay: "900ms" }} />
      <path d="M98 54v22" stroke="var(--brand-accent)" strokeWidth="4" strokeLinecap="round" pathLength={1} className="icon-draw" style={{ animationDelay: "1200ms" }} />
      <circle cx="98" cy="80" r="4" fill="var(--brand-accent)" />
    </svg>
  );
}

const ico = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
function PayoutIcon() {
  return (
    <svg {...ico}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20M6 15h4" />
    </svg>
  );
}
function ShieldCheckIcon() {
  return (
    <svg {...ico}>
      <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
function MapIcon() {
  return (
    <svg {...ico}>
      <path d="M22 10 12 5 2 10l10 5 10-5Z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  );
}
function UserPlusIcon() {
  return (
    <svg {...ico}>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21a7 7 0 0 1 14 0M19 8v6M16 11h6" />
    </svg>
  );
}
function ClipboardIcon() {
  return (
    <svg {...ico}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 2h6v4H9zM9 12h6M9 16h4" />
    </svg>
  );
}
function SendIcon() {
  return (
    <svg {...ico}>
      <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" />
    </svg>
  );
}
function MpesaIcon() {
  return (
    <span
      style={{
        background: "var(--brand-success)",
        color: "var(--text-on-brand)",
        borderRadius: 4,
        fontSize: 9,
        fontWeight: 800,
        padding: "2px 4px",
        letterSpacing: "0.02em",
      }}
    >
      M
    </span>
  );
}
