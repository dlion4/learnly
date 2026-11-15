import { useEffect, useMemo, useState } from "react";
import "../styles/pages/levels.css";
import { MarketingNav } from "../components/marketing/MarketingNav";
import { MarketingFooter } from "../components/marketing/MarketingFooter";
import { CountUp, Reveal } from "../components/ui/primitives";
import { EducationPathway } from "../components/levels/EducationPathway";
import { LevelBadgeIcon } from "../components/levels/LevelBadgeIcon";
import {
  LegalDialog,
  type LegalKey,
  type SignupMode,
} from "../components/marketing/LandingDialogs";
import { navigate, scrollToHash } from "../lib/navigation";
import {
  EDU_LEVELS,
  PLATFORM_STATS,
  catLabel,
  eduLevelColor,
  type EduLevelKey,
  type LevelTrack,
} from "../data/students";

type TrackFilter = "all" | LevelTrack;

const filters: { key: TrackFilter; label: string }[] = [
  { key: "all", label: "All levels" },
  { key: "cbc", label: "CBC & 8-4-4" },
  { key: "tertiary", label: "Tertiary" },
  { key: "other", label: "SNE & international" },
];

export default function Levels() {
  const [query, setQuery] = useState("");
  const [track, setTrack] = useState<TrackFilter>("all");
  const [openLevels, setOpenLevels] = useState<Set<EduLevelKey>>(() => new Set(["primary"]));
  const openSignup = (mode: SignupMode | null = null, level?: EduLevelKey | null) => {
    const params = new URLSearchParams();
    if (mode) params.set("role", mode);
    if (level) params.set("level", level);
    navigate(`/auth/signup${params.size ? `?${params.toString()}` : ""}`);
  };
  const [legal, setLegal] = useState<LegalKey | null>(null);

  const visibleLevels = useMemo(() => {
    const q = query.trim().toLowerCase();
    return EDU_LEVELS.filter((level) => {
      if (track !== "all" && level.track !== track) return false;
      if (!q) return true;
      const searchable = [
        level.label,
        level.short,
        level.grades,
        level.ageRange,
        level.exam,
        ...level.gradeList,
        ...level.examPoints,
        ...level.sampleSchools,
        ...level.categories.map((item) => item.label ?? catLabel(item.category)),
      ]
        .join(" ")
        .toLowerCase();
      return searchable.includes(q);
    });
  }, [query, track]);

  const openLevel = (key: EduLevelKey) => {
    setTrack("all");
    setQuery("");
    setOpenLevels(new Set([key]));
    window.history.replaceState({}, "", `/levels#level-${key}`);
    window.setTimeout(() => scrollToHash(`#level-${key}`), 60);
  };

  const toggleLevel = (key: EduLevelKey) => {
    setOpenLevels((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const startOnboarding = (level: EduLevelKey | null = null) => {
    openSignup("student", level);
  };

  useEffect(() => {
    const applyDeepLink = () => {
      const match = window.location.hash.match(/^#level-(.+)$/);
      const key = match?.[1] as EduLevelKey | undefined;
      if (key && EDU_LEVELS.some((level) => level.key === key)) {
        setOpenLevels(new Set([key]));
        window.setTimeout(() => scrollToHash(`#level-${key}`), 100);
      }
    };
    applyDeepLink();
    window.addEventListener("popstate", applyDeepLink);
    return () => window.removeEventListener("popstate", applyDeepLink);
  }, []);

  const resetFilters = () => {
    setQuery("");
    setTrack("all");
  };

  const footerNav = (destination: string) => {
    if (destination.startsWith("/")) navigate(destination);
    else if (destination === "#get-started") scrollToHash(destination);
    else navigate(`/${destination}`);
  };

  return (
    <div className="page-levels" id="top">
      <MarketingNav />

      {/* ===================== S1 — HEADER ===================== */}
      <header className="levels-hero">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-12">
          <div className="stagger is-entered lg:col-span-7" style={{ ["--stagger-step" as string]: "80ms" }}>
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
              <span style={{ color: "var(--text-primary)", fontSize: "var(--fs-sm)" }}>Education levels</span>
            </nav>
            <div style={{ ["--idx" as string]: 1 }} className="ly-eyebrow mb-3">
              Kenya's academic map · canonical reference
            </div>
            <h1 style={{ ["--idx" as string]: 2 }} className="levels-title">
              Every Kenyan academic level, <em>supported.</em>
            </h1>
            <p style={{ ["--idx" as string]: 3 }} className="levels-subtitle">
              From Play Group to PhD — one platform, one student record.
            </p>
            <p style={{ ["--idx" as string]: 4 }} className="levels-intro mb-6">
              Kenya's Competency-Based Curriculum runs from Pre-Primary through Primary, Junior and Senior School, while Learnly still supports legacy 8-4-4 records from Standard 1 to Form 4. The same student record continues into TVET, professional colleges and universities, with Special Needs Education and international curricula covered alongside them.
            </p>
            <div style={{ ["--idx" as string]: 5 }} className="flex flex-wrap gap-3">
              <button className="ly-btn ly-btn-primary ly-btn-lg" onClick={() => scrollToHash("#level-grid")}>
                Find my level ↓
              </button>
              <button className="ly-btn ly-btn-outline ly-btn-lg" onClick={() => startOnboarding()}>
                Start onboarding →
              </button>
            </div>
          </div>

          <div className="hidden lg:col-span-5 lg:block">
            <Reveal delay={180}>
              <div className="record-card">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <div className="ly-eyebrow mb-1">One learner record</div>
                    <div className="font-display" style={{ fontSize: "1.35rem" }}>
                      Every transition stays attached
                    </div>
                  </div>
                  <span className="ly-chip" style={{ padding: "0.35rem 0.65rem" }}>
                    <span className="ly-pulse" /> NEMIS
                  </span>
                </div>
                {([
                  ["preprimary", "PP1 → PP2", "Birth cert + NEMIS UPI"],
                  ["primary", "Grade 6", "KPSEA result slip"],
                  ["junior", "Grade 9", "KJSEA index linked"],
                  ["senior", "Grade 12", "KSSEA + pathway record"],
                  ["university", "Degree / TVET", "One continuing history"],
                ] as [EduLevelKey, string, string][]).map(([key, stage, detail]) => (
                  <div className="record-line" key={key}>
                    <span className="level-icon" style={{ ["--level-color" as string]: eduLevelColor(key), width: 34, height: 34 }}>
                      <LevelBadgeIcon level={key} size={19} />
                    </span>
                    <span className="font-semibold">{stage}</span>
                    <span className="text-right" style={{ color: "var(--text-tertiary)", fontSize: "var(--fs-sm)" }}>
                      {detail}
                    </span>
                  </div>
                ))}
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span style={{ color: "var(--text-secondary)", fontSize: "var(--fs-sm)" }}>Levels supported</span>
                  <span className="font-display" style={{ color: "var(--brand-primary)", fontSize: "var(--fs-kpi)" }}>
                    <CountUp value={EDU_LEVELS.length} />
                  </span>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </header>

      <main>
        {/* Finder */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal className="level-finder">
            <div className="flex flex-wrap items-center gap-3">
              <div className="search-wrap">
                <SearchIcon />
                <input
                  className="ly-input"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search Grade 8, KPSEA, KMTC, PhD, uniform…"
                  aria-label="Search education levels, grades, exams and institutions"
                />
              </div>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Filter levels by curriculum">
                {filters.map((filter) => (
                  <button
                    key={filter.key}
                    className={`filter-chip ${track === filter.key ? "is-active" : ""}`}
                    aria-pressed={track === filter.key}
                    onClick={() => setTrack(filter.key)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3" style={{ color: "var(--text-tertiary)", fontSize: "var(--fs-sm)" }}>
              <span aria-live="polite">
                Showing {visibleLevels.length} of {EDU_LEVELS.length} levels
              </span>
              {(query || track !== "all") && (
                <button className="text-action" onClick={resetFilters} style={{ fontSize: "var(--fs-sm)" }}>
                  Clear filters
                </button>
              )}
            </div>
          </Reveal>
        </div>

        {/* ===================== S2 — LEVEL CARDS GRID ===================== */}
        <section id="level-grid" className="py-12 scroll-mt-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <Reveal className="mb-7 max-w-2xl">
              <div className="ly-eyebrow mb-2">Nine top-level categories</div>
              <h2 className="ly-h-section mb-2">Choose the level the learner is in now</h2>
              <p className="ly-lead">Not sure? Search a class, assessment or institution above. Each card shows the typical age and the next national assessment.</p>
            </Reveal>

            {visibleLevels.length ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {visibleLevels.map((level, index) => (
                  <Reveal key={level.key} delay={(index % 3) * 60}>
                    <article className="level-card hover-lift" style={{ ["--level-color" as string]: eduLevelColor(level.key) }}>
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <span className="level-icon">
                          <LevelBadgeIcon level={level.key} />
                        </span>
                        <span className={`ly-edu-badge ly-edu-badge-${level.key}`}>{level.short}</span>
                      </div>
                      <h3 className="level-name mb-4">{level.label}</h3>
                      <div className="grid gap-3">
                        <div className="level-meta">
                          <AgeIcon />
                          <span>
                            <strong style={{ color: "var(--text-primary)" }}>{level.ageRange}</strong>
                            <br />
                            {level.grades}
                          </span>
                        </div>
                        <div className="level-meta">
                          <ExamIcon />
                          <span>{level.exam}</span>
                        </div>
                      </div>
                      <div className="mt-5">
                        <div className="ly-eyebrow mb-2" style={{ color: "var(--text-tertiary)" }}>
                          Sample institutions
                        </div>
                        <div className="institution-list">
                          {level.sampleSchools.slice(0, 3).map((school) => (
                            <span className="institution-pill" key={school}>
                              {school}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="mt-auto flex items-end justify-between gap-3 pt-5">
                        <div>
                          <div className="ly-hint">Typical fees</div>
                          <div className="font-display" style={{ color: "var(--brand-primary)", fontSize: "0.95rem" }}>
                            {level.feesRange}
                          </div>
                        </div>
                        <button className="text-action whitespace-nowrap" onClick={() => openLevel(level.key)}>
                          View breakdown →
                        </button>
                      </div>
                    </article>
                  </Reveal>
                ))}
              </div>
            ) : (
              <div className="ly-card p-8 text-center">
                <div className="level-icon mx-auto mb-4" style={{ ["--level-color" as string]: "var(--brand-primary)" }}>
                  <SearchIcon />
                </div>
                <h3 className="font-display mb-2" style={{ fontSize: "var(--fs-h3)" }}>
                  No level matches “{query}”
                </h3>
                <p className="ly-lead mb-5" style={{ fontSize: "1rem" }}>
                  Try a grade such as “Grade 8”, an exam such as “KCSE”, or clear the filters to see all nine levels.
                </p>
                <button className="ly-btn ly-btn-primary" onClick={resetFilters}>
                  Show all 9 levels
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ===================== S3 — ACCORDION ===================== */}
        <section id="level-details" className="pb-16 pt-4 scroll-mt-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <Reveal className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-2xl">
                <div className="ly-eyebrow mb-2">Full breakdown</div>
                <h2 className="ly-h-section mb-2">Grades, exams and sponsorship categories</h2>
                <p className="ly-lead">These defaults configure the onboarding form and the financial-assistance request drawer for each learner.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="ly-btn ly-btn-outline ly-btn-sm"
                  onClick={() => setOpenLevels(new Set(visibleLevels.map((level) => level.key)))}
                  disabled={!visibleLevels.length}
                >
                  Expand visible
                </button>
                <button className="ly-btn ly-btn-ghost ly-btn-sm" onClick={() => setOpenLevels(new Set())} disabled={!openLevels.size}>
                  Collapse all
                </button>
              </div>
            </Reveal>

            <div className="level-accordion accordion accordion-flush">
              {EDU_LEVELS.map((level, index) => {
                const isOpen = openLevels.has(level.key);
                return (
                  <Reveal key={level.key} delay={Math.min(index, 8) * 60}>
                    <article
                      id={`level-${level.key}`}
                      className={`accordion-item ${isOpen ? "is-open" : ""}`}
                      style={{ ["--level-color" as string]: eduLevelColor(level.key) }}
                    >
                      <h3 style={{ margin: 0 }}>
                        <button
                          id={`level-trigger-${level.key}`}
                          className="accordion-trigger"
                          aria-expanded={isOpen}
                          aria-controls={`level-panel-${level.key}`}
                          onClick={() => toggleLevel(level.key)}
                        >
                          <span className="accordion-swatch" aria-hidden />
                          <span className="min-w-0">
                            <span className="block truncate font-semibold">{level.label}</span>
                            <span className="block truncate" style={{ color: "var(--text-tertiary)", fontSize: "var(--fs-sm)" }}>
                              {level.grades}
                            </span>
                          </span>
                          <span className="accordion-age whitespace-nowrap" style={{ color: "var(--text-secondary)", fontSize: "var(--fs-sm)" }}>
                            {level.ageRange}
                          </span>
                          <ChevronIcon />
                        </button>
                      </h3>
                      <div
                        id={`level-panel-${level.key}`}
                        className="accordion-panel"
                        role="region"
                        aria-labelledby={`level-trigger-${level.key}`}
                        aria-hidden={!isOpen}
                      >
                        <div className="accordion-panel-inner">
                          <div className="accordion-body">
                            <div className="grid gap-4 lg:grid-cols-3">
                              <div className="detail-block">
                                <div className="ly-eyebrow mb-3">Grades / years</div>
                                <ul className="detail-list">
                                  {level.gradeList.map((grade) => (
                                    <li key={grade}>{grade}</li>
                                  ))}
                                </ul>
                              </div>
                              <div className="detail-block">
                                <div className="ly-eyebrow mb-3">Exam touch-points</div>
                                <ul className="detail-list">
                                  {level.examPoints.map((exam) => (
                                    <li key={exam}>{exam}</li>
                                  ))}
                                </ul>
                                <div className="mt-4 pt-3" style={{ borderTop: "1px dashed var(--border-subtle)" }}>
                                  <div className="ly-hint mb-1">Age range</div>
                                  <div className="font-semibold">{level.ageRange}</div>
                                </div>
                              </div>
                              <div className="detail-block">
                                <div className="ly-eyebrow mb-3">Sample institutions</div>
                                <ul className="detail-list">
                                  {level.sampleSchools.map((school) => (
                                    <li key={school}>{school}</li>
                                  ))}
                                </ul>
                                <div className="mt-4 pt-3" style={{ borderTop: "1px dashed var(--border-subtle)" }}>
                                  <div className="ly-hint mb-1">Identifiers</div>
                                  <div style={{ color: "var(--text-secondary)", fontSize: "var(--fs-sm)" }}>{level.ids}</div>
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 flex flex-wrap items-end justify-between gap-4 rounded-xl p-4" style={{ background: "var(--surface-2)" }}>
                              <div>
                                <div className="ly-eyebrow mb-3">Default request categories enabled</div>
                                <div className="flex flex-wrap gap-2">
                                  {level.categories.map((item) => (
                                    <span className="request-chip" key={`${item.category}-${item.label ?? "default"}`}>
                                      <span className={`ly-cat-dot ly-cat-dot-${item.category}`} />
                                      {item.label ?? catLabel(item.category)}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <button
                                className="ly-btn ly-btn-primary ly-btn-sm"
                                tabIndex={isOpen ? 0 : -1}
                                onClick={() => startOnboarding(level.key)}
                              >
                                Start as {level.short.split(" · ")[0]} →
                              </button>
                            </div>
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

        {/* ===================== S4 — PATHWAY DIAGRAM ===================== */}
        <section id="pathway" className="py-16 scroll-mt-20" style={{ background: "var(--surface-2)", borderBlock: "1px solid var(--border-subtle)" }}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <Reveal className="mx-auto mb-8 max-w-2xl text-center">
              <div className="ly-eyebrow mb-2">The CBC journey</div>
              <h2 className="ly-h-section mb-3">One pathway, two routes after Senior School</h2>
              <p className="ly-lead">
                Learnly keeps each KPSEA, KJSEA and KSSEA milestone on the same record, then follows the learner into university or a technical and vocational route.
              </p>
            </Reveal>
            <EducationPathway onSelect={openLevel} />
            <Reveal className="mt-5 text-center" delay={100}>
              <p className="ly-hint">
                Legacy 8-4-4 records follow Standard 1–8 (KCPE) and Form 1–4 (KCSE); SNE and international curricula use their adapted assessment routes.
              </p>
            </Reveal>
          </div>
        </section>

        {/* ===================== S5 — CTA ===================== */}
        <section id="get-started" className="py-16 scroll-mt-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <Reveal>
              <div className="levels-cta">
                <div className="relative z-10 mx-auto max-w-2xl text-center">
                  <div className="ly-eyebrow mb-2" style={{ color: "var(--brand-accent)" }}>
                    Your next step
                  </div>
                  <h2 className="font-display mb-3" style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)", lineHeight: 1.12 }}>
                    Find your level — start onboarding
                  </h2>
                  <p className="mx-auto mb-6 max-w-xl" style={{ color: "var(--text-on-brand)", opacity: 0.8, fontSize: "1.05rem", lineHeight: 1.7 }}>
                    Choose the learner's current class or programme. Learnly will ask for the right identifiers, school details and documents for that level.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button className="ly-btn ly-btn-gold ly-btn-lg" onClick={() => startOnboarding()}>
                      🎓 Start student onboarding →
                    </button>
                    <button className="ly-btn ly-btn-lg" style={{ color: "var(--text-on-brand)", borderColor: "color-mix(in srgb, var(--text-on-brand) 40%, transparent)" }} onClick={() => scrollToHash("#level-grid")}>
                      Compare levels again
                    </button>
                  </div>
                  <div className="mt-5" style={{ color: "var(--text-on-brand)", opacity: 0.65, fontSize: "var(--fs-sm)" }}>
                    {EDU_LEVELS.length} levels · {PLATFORM_STATS.counties} counties · draft saved at every step
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <MarketingFooter onLegal={setLegal} onNav={footerNav} />

      <LegalDialog which={legal} onClose={() => setLegal(null)} />
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  );
}
function AgeIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}
function ExamIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 3h12v18H6zM9 7h6M9 11h6M9 15h3" />
    </svg>
  );
}
function ChevronIcon() {
  return (
    <svg className="accordion-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
