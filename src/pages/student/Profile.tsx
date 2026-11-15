import { useEffect, useState, type ReactNode } from "react";
import "../../styles/pages/student-profile.css";
import { StudentShell } from "../../components/shell/StudentShell";
import { useStudent } from "../../components/student/StudentStore";
import {
  ChangeHistoryDialog, ConsentLogDialog, DisabilityWizard, EditProfileWizard, FieldEditDialog, GpsDialog, GuardianDrawer,
  GuardianRemoveDialog, GuardianWizard, HomeWizard, IdentifierDialog, LanguagesDialog, MapDialog, PhotoDialog, PrimaryConfirmDialog,
  SchoolWizard, TeacherDrawer, VitalCorrectionWizard, VitalLockDialog,
} from "../../components/student/ProfileFlows";
import { useToast, CountUp } from "../../components/ui/primitives";
import { Dropdown, EmptyState, KV, Masked, Tabs, type MenuItem } from "../../components/ui/overlays";
import { Icon } from "../../components/ui/Icon";
import {
  BLOOD_GROUPS, CONSENT_LOG, CONSENT_PURPOSES, IDENTIFIERS, MARITAL, NATIONALITIES, RELIGIONS, TEACHERS, VERIFICATION_LABEL,
  ageOn, incomeBucket, nationalIdDue, type Guardian, type Identifier, type Verification,
} from "../../data/profile";
import { CURRENT_STUDENT, EDU_LEVELS, PLATFORM_STATS, eduLevelLabel, fmtDate, maskPhone, relativeTime } from "../../data/students";
import { downloadText } from "../../lib/download";

/** PAGE S-2 — /student/profile. Owns the shared S-shell frame, so it is created with CREATE_SHELL=false. */
export default function StudentProfile() {
  return (
    <StudentShell pageClass="page-student-profile">
      <ProfileBody />
    </StudentShell>
  );
}

/* ------------------------------------------------------------------ */
/* Dialog routing                                                      */
/* ------------------------------------------------------------------ */
type Active =
  | { kind: "editProfile" }
  | { kind: "field"; key: "preferredName" | "bloodGroup" | "religion" | "maritalStatus" | "nationality" }
  | { kind: "languages" }
  | { kind: "lock"; field: string; value: string }
  | { kind: "correction"; field?: string }
  | { kind: "photo" }
  | { kind: "history" }
  | { kind: "consentLog" }
  | { kind: "guardian"; id: string }
  | { kind: "guardianNew" }
  | { kind: "guardianEdit"; id: string }
  | { kind: "guardianRemove"; id: string }
  | { kind: "primary"; id: string; flag: "primary" | "nextOfKin" }
  | { kind: "home" }
  | { kind: "gps" }
  | { kind: "map" }
  | { kind: "school" }
  | { kind: "teacher"; id: string }
  | { kind: "identifier"; key: string }
  | { kind: "disability" };

const FIELDS: Record<"preferredName" | "bloodGroup" | "religion" | "maritalStatus" | "nationality", { label: string; hint: string; options?: string[] }> = {
  preferredName: { label: "Preferred name", hint: "What teachers and your sponsor should call you." },
  bloodGroup: { label: "Blood group", options: BLOOD_GROUPS, hint: "Used only for emergencies at school." },
  religion: { label: "Religion", options: RELIGIONS, hint: "Optional. Used for assembly and boarding meals." },
  maritalStatus: { label: "Marital status", options: MARITAL, hint: "Recorded as Single for learners under 18." },
  nationality: { label: "Nationality", options: NATIONALITIES, hint: "Your country of citizenship." },
};

/* ------------------------------------------------------------------ */
/* Sections & scrollspy                                                */
/* ------------------------------------------------------------------ */
type TabKey = "personal" | "family" | "home" | "school" | "teacher" | "identity" | "disability" | "consent";
const TABS: { key: TabKey; label: string; id: string }[] = [
  { key: "personal", label: "Personal", id: "s-personal" },
  { key: "family", label: "Family", id: "s-family" },
  { key: "home", label: "Home", id: "s-home" },
  { key: "school", label: "School", id: "s-school" },
  { key: "teacher", label: "Class teacher", id: "s-teacher" },
  { key: "identity", label: "Identity", id: "s-identity" },
  { key: "disability", label: "Disability", id: "s-disability" },
  { key: "consent", label: "Consent", id: "s-consent" },
];
const RAIL: { id: string; label: string; icon: string; tab: TabKey }[] = [
  { id: "s-personal", label: "Personal details", icon: "user", tab: "personal" },
  { id: "s-family", label: "Family & guardians", icon: "users", tab: "family" },
  { id: "s-home", label: "Home & residence", icon: "pin", tab: "home" },
  { id: "s-school", label: "School & teachers", icon: "book", tab: "school" },
  { id: "s-identity", label: "Identity & consent", icon: "shield", tab: "identity" },
];
const railOf = (t: TabKey): string => (t === "teacher" ? "s-school" : t === "disability" || t === "consent" ? "s-identity" : `s-${t}`);
const jumpTo = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  window.history.replaceState(null, "", `/student/profile#${id.replace("s-", "")}`);
};

function ProfileBody() {
  const s = useStudent();
  const { toast } = useToast();
  const p = s.profile;
  const [active, setActive] = useState<Active | null>(null);
  const [spy, setSpy] = useState<TabKey>("personal");
  const close = () => setActive(null);

  useEffect(() => {
    const els = TABS.map((t) => document.getElementById(t.id)).filter((el): el is HTMLElement => !!el);
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const hit = TABS.find((t) => t.id === e.target.id);
            if (hit) setSpy(hit.key);
          }
        }
      },
      { rootMargin: "-28% 0px -62% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const verified = IDENTIFIERS.filter((i) => i.verification === "VERIFIED").length;
  const applicable = IDENTIFIERS.filter((i) => i.verification !== "NOT_APPLICABLE").length;
  const pendingCorrections = p.corrections.filter((c) => c.status === "PENDING").length;
  const pendingTransfers = p.transfers.filter((t) => t.status === "PENDING").length;

  const headerMenu: MenuItem[] = [
    { label: "Change history", icon: "clock", onSelect: () => setActive({ kind: "history" }) },
    { label: "Consent log", icon: "shield", onSelect: () => setActive({ kind: "consentLog" }) },
    { label: "Download profile (JSON)", icon: "download", onSelect: () => downloadText("learnly-profile.json", JSON.stringify({
      exportedAt: new Date().toISOString(),
      personal: { ...p.personal, dob: p.personal.dob },
      home: { ...p.home, lat: "masked", lng: "masked" },
      school: p.school,
      guardians: p.guardians.map((g) => ({ ...g, phone: maskPhone(g.phone), altPhone: g.altPhone ? maskPhone(g.altPhone) : undefined, incomeBand: incomeBucket(g.incomeBand) })),
      identifiers: IDENTIFIERS.map((i) => ({ ...i, value: i.value ? `•••• ${i.value.slice(-4)}` : "" })),
      audit: p.audit,
    }, null, 2), "application/json") },
    { label: "Open privacy settings", icon: "settings", separatorBefore: true, onSelect: () => s.open("settings", "privacy") },
  ];

  const fullName = [p.personal.firstName, p.personal.middleName, p.personal.lastName].filter(Boolean).join(" ");

  return (
    <>
      {/* ===================== HEADER ===================== */}
      <header className="ly-card pf-head" aria-label="Profile header">
        <button type="button" className={`pf-photo ${p.photoUploaded ? "is-set" : ""}`} aria-label={p.photoUploaded ? "Change profile photo" : "Upload profile photo"} onClick={() => setActive({ kind: "photo" })}>
          {p.photoUploaded ? (
            <>
              <span className="pf-photo-initials">{p.personal.firstName.slice(0, 1)}{p.personal.lastName.slice(0, 1)}</span>
              <span className="pf-photo-chip">v{p.photoVersion}</span>
            </>
          ) : (
            <>
              <svg className="pf-silhouette" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeLinecap="round" aria-hidden>
                <circle cx="32" cy="24" r="11" pathLength={1} className="icon-draw" />
                <path d="M10 56c2-11 10-17 22-17s20 6 22 17" pathLength={1} className="icon-draw" style={{ animationDelay: "200ms" }} />
              </svg>
              <span className="pf-photo-chip">Add</span>
            </>
          )}
        </button>

        <div className="min-w-0">
          <div className="ly-eyebrow">S-2 · My profile</div>
          <h1 className="pf-name">{fullName}</h1>
          <p className="pf-meta">{p.school.grade} · {EDU_LEVELS.find((l) => l.key === CURRENT_STUDENT.eduLevel)?.label ?? eduLevelLabel(CURRENT_STUDENT.eduLevel)} · {p.school.pathway} · {p.school.name}</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`ly-edu-badge ly-edu-badge-${CURRENT_STUDENT.eduLevel}`}>{eduLevelLabel(CURRENT_STUDENT.eduLevel)}</span>
            <span className="ly-chip ly-status-chip ly-status-neutral">Profile {s.completeness}% complete</span>
            <span className="ly-chip ly-status-chip ly-status-verified">{verified} of {applicable} identifiers verified</span>
            {pendingCorrections > 0 && <button type="button" className="ly-chip ly-status-chip ly-status-warn" onClick={() => jumpTo("s-identity")}>{pendingCorrections} correction pending</button>}
          </div>
        </div>

        <div className="pf-head-actions">
          <button type="button" className="ly-btn ly-btn-primary" onClick={() => setActive({ kind: "editProfile" })}><Icon name="edit" size={16} /> Edit profile</button>
          <button type="button" className="ly-btn ly-btn-outline" onClick={() => setActive({ kind: "photo" })}><Icon name="upload" size={16} /> Upload photo</button>
          <Dropdown label="More profile actions" trigger={<Icon name="more" size={16} />} items={headerMenu} />
        </div>
      </header>

      {/* ===================== TAB INDEX ===================== */}
      <div className="pf-tabs-wrap">
        <Tabs label="Profile sections" value={spy} onChange={(k) => jumpTo(TABS.find((t) => t.key === k)?.id ?? "s-personal")} tabs={TABS.map((t) => ({ key: t.key, label: t.label }))} />
      </div>

      <div className="pf-layout">
        <div className="pf-main">
          {/* ===================== S1 PERSONAL ===================== */}
          <section id="s-personal" className="pf-section pf-anchor" aria-labelledby="pf-personal-title">
            <div className="pf-section-head">
              <div>
                <h2 id="pf-personal-title" className="pf-section-title"><span className="pf-section-no">1</span>Personal details</h2>
                <p className="pf-section-sub">Click any field to change it. Name, date of birth and sex are verified, so they change only through a correction request.</p>
              </div>
              <button type="button" className="ly-btn ly-btn-ghost ly-btn-sm" onClick={() => setActive({ kind: "history" })}><Icon name="clock" size={15} /> Change history</button>
            </div>

            <div className="pf-dl">
              <LockedField label="Full name" value={fullName} onOpen={() => setActive({ kind: "lock", field: "Full name", value: fullName })} />
              <EditableField label="Preferred name" value={p.personal.preferredName} onOpen={() => setActive({ kind: "field", key: "preferredName" })} />
              <LockedField label="Date of birth" value={`${fmtDate(p.personal.dob)} · ${ageOn(p.personal.dob)} years old`} onOpen={() => setActive({ kind: "lock", field: "Date of birth", value: fmtDate(p.personal.dob) })} />
              <LockedField label="Sex" value={p.personal.sex} onOpen={() => setActive({ kind: "lock", field: "Sex", value: p.personal.sex })} />
              <EditableField label="Blood group" value={p.personal.bloodGroup} onOpen={() => setActive({ kind: "field", key: "bloodGroup" })} />
              <EditableField label="Nationality" value={p.personal.nationality} onOpen={() => setActive({ kind: "field", key: "nationality" })} />
              <EditableField label="Religion" value={p.personal.religion} onOpen={() => setActive({ kind: "field", key: "religion" })} />
              <EditableField label="Marital status" value={p.personal.maritalStatus} sub="Recorded as Single for learners under 18" onOpen={() => setActive({ kind: "field", key: "maritalStatus" })} />
              <button type="button" className="pf-field" onClick={() => setActive({ kind: "languages" })} aria-label="Edit languages spoken">
                <span className="pf-field-label">Languages spoken</span>
                <span className="pf-field-badge"><Icon name="edit" size={13} /> Edit</span>
                <span className="pf-field-value"><span className="pf-chip-row">{p.personal.languages.map((l) => <span key={l} className="pf-tag">{l}</span>)}</span></span>
              </button>
              <EditableField label="Disability status" value={p.personal.disability ? p.personal.disability.type : "None recorded"} sub="Special-category data — edit with the disability wizard" onOpen={() => setActive({ kind: "disability" })} />
            </div>
            <p className="ly-hint pf-note">Profile photo: {p.photoUploaded ? `version ${p.photoVersion} on file` : "none yet"}. Changes to photos are logged like any other field.</p>
          </section>

          {/* ===================== S2 FAMILY ===================== */}
          <section id="s-family" className="pf-section pf-anchor" aria-labelledby="pf-family-title">
            <div className="pf-section-head">
              <div>
                <h2 id="pf-family-title" className="pf-section-title"><span className="pf-section-no">2</span>Family, guardians &amp; next of kin</h2>
                <p className="pf-section-sub">Up to four guardians. Phone numbers stay masked until you reveal them, and every reveal is logged.</p>
              </div>
              <button type="button" className="ly-btn ly-btn-primary ly-btn-sm" disabled={p.guardians.length >= 4} onClick={() => setActive({ kind: "guardianNew" })}>
                <Icon name="plus" size={15} /> Add guardian {p.guardians.length >= 4 && <span className="ly-hint">(max 4)</span>}
              </button>
            </div>

            <div className="pf-guardians">
              {p.guardians.map((g) => (
                <GuardianCard key={g.id} g={g}
                  onOpen={() => setActive({ kind: "guardian", id: g.id })}
                  onEdit={() => setActive({ kind: "guardianEdit", id: g.id })}
                  onRemove={() => setActive({ kind: "guardianRemove", id: g.id })}
                />
              ))}
              {p.guardians.length < 4 && (
                <button type="button" className="pf-add-card" onClick={() => setActive({ kind: "guardianNew" })}>
                  <Icon name="plus" size={22} />
                  <span className="font-semibold">Add another guardian</span>
                  <span className="ly-hint">{4 - p.guardians.length} slot{4 - p.guardians.length === 1 ? "" : "s"} left</span>
                </button>
              )}
            </div>

            <div className="pf-household" aria-label="Household composition">
              <div className="pf-stat">
                <div className="pf-stat-value"><CountUp value={3} /></div>
                <div className="pf-stat-label">Household dependents</div>
              </div>
              <div className="pf-stat">
                <div className="pf-stat-value"><CountUp value={1} /></div>
                <div className="pf-stat-label">Siblings in school</div>
              </div>
              <div className="pf-stat">
                <div className="pf-stat-value"><CountUp value={1} /></div>
                <div className="pf-stat-label">Siblings on Learnly</div>
                <button type="button" className="ly-link-btn mt-2" onClick={() => s.open("relatedUser", "ru-05")}>Link Brian Mwangi Kamau <Icon name="arrowRight" size={14} /></button>
              </div>
            </div>
          </section>

          {/* ===================== S3 HOME ===================== */}
          <section id="s-home" className="pf-section pf-anchor" aria-labelledby="pf-home-title">
            <div className="pf-section-head">
              <div>
                <h2 id="pf-home-title" className="pf-section-title"><span className="pf-section-no">3</span>Home &amp; residence</h2>
                <p className="pf-section-sub">Your postal-style address, building and travel. The pin on the map helps verifiers find the home.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="ly-btn ly-btn-outline ly-btn-sm" onClick={() => setActive({ kind: "home" })}><Icon name="edit" size={15} /> Edit address</button>
                <button type="button" className="ly-btn ly-btn-ghost ly-btn-sm" onClick={() => setActive({ kind: "gps" })}><Icon name="pin" size={15} /> Capture GPS</button>
              </div>
            </div>
            <div className="pf-home-grid">
              <AddressBlock />
              <MapPreview onOpen={() => setActive({ kind: "map" })} />
            </div>
          </section>

          {/* ===================== S4 SCHOOL ===================== */}
          <section id="s-school" className="pf-section pf-anchor" aria-labelledby="pf-school-title">
            <div className="pf-section-head">
              <div>
                <h2 id="pf-school-title" className="pf-section-title"><span className="pf-section-no">4</span>Current school &amp; academic context</h2>
                <p className="pf-section-sub">Changing school is a request. On approval a new academic record starts and your origin school stays flagged.</p>
              </div>
              <button type="button" className="ly-btn ly-btn-outline ly-btn-sm" onClick={() => setActive({ kind: "school" })}><Icon name="book" size={15} /> Change school</button>
            </div>

            <SchoolCard />

            {p.transfers.length > 0 && (
              <div className="mt-4 grid gap-2" aria-label="School transfers">
                <h3 className="ly-section-title">School transfers</h3>
                {p.transfers.map((t) => (
                  <div key={t.id} className="pf-transfer">
                    <div className="min-w-0">
                      <div className="font-semibold">{p.school.name} → {t.toSchool}</div>
                      <div className="ly-hint">{t.id} · effective {fmtDate(t.effective)} · {t.reason}</div>
                    </div>
                    <span className="ly-chip ly-status-chip ly-status-warn">Pending admin approval</span>
                  </div>
                ))}
              </div>
            )}

            <div id="s-teacher" className="pf-sub mt-6">
              <div className="pf-section-head" style={{ marginBottom: 12 }}>
                <div>
                  <h3 className="ly-section-title" style={{ margin: 0 }}>Class teacher &amp; academic contacts</h3>
                  <p className="pf-section-sub">Tap a contact for their profile, or send a message.</p>
                </div>
              </div>
              <div className="pf-teachers">
                {TEACHERS.map((t) => (
                  <article key={t.id} className="pf-teacher hover-lift">
                    <div className="pf-teacher-top">
                      <span className="ly-avatar ly-avatar-soft">{t.initials}</span>
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{t.title} {t.name}</div>
                        <div className="ly-hint truncate">{t.role}</div>
                      </div>
                    </div>
                    <div className="pf-chip-row">{t.subjects.length ? t.subjects.map((x) => <span key={x} className="pf-tag">{x}</span>) : <span className="ly-hint">Welfare &amp; boarding</span>}</div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="ly-btn ly-btn-ghost ly-btn-sm" onClick={() => setActive({ kind: "teacher", id: t.id })}>View profile</button>
                      <button type="button" className="ly-btn ly-btn-outline ly-btn-sm" onClick={() => s.open("messages", `to:${t.id}`)}><Icon name="chat" size={14} /> Message</button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          {/* ===================== S5 IDENTITY, DISABILITY, CONSENT ===================== */}
          <section id="s-identity" className="pf-section pf-anchor" aria-labelledby="pf-identity-title">
            <div className="pf-section-head">
              <div>
                <h2 id="pf-identity-title" className="pf-section-title"><span className="pf-section-no">5</span>Identity, disability &amp; consent</h2>
                <p className="pf-section-sub">Identifiers are protected once verified. Disability and consent are special-category data and are shown only to you and your verifier.</p>
              </div>
            </div>

            <Collapsible id="s-identity-list" title="Identity documents & indices" summary={`${verified} verified · ${IDENTIFIERS.filter((i) => i.verification === "PENDING").length} pending · ${IDENTIFIERS.filter((i) => i.verification === "NOT_APPLICABLE").length} not applicable`} defaultOpen>
              <div>
                {IDENTIFIERS.map((i) => (
                  <IdentifierRow key={i.key} i={i} onOpen={() => setActive({ kind: "identifier", key: i.key })} />
                ))}
              </div>
              <div className="mt-4 grid gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="ly-section-title" style={{ margin: 0, fontSize: "1rem" }}>Correction requests</h4>
                  <button type="button" className="ly-btn ly-btn-outline ly-btn-sm" onClick={() => setActive({ kind: "correction" })}><Icon name="edit" size={15} /> Request a correction</button>
                </div>
                {p.corrections.length === 0 ? (
                  <EmptyState icon="shield" title="No correction requests">Locked fields and identifiers can be corrected here with evidence.</EmptyState>
                ) : (
                  p.corrections.map((c) => (
                    <div key={c.id} className="pf-correction">
                      <span className="pf-id-kind"><Icon name="clock" size={16} /></span>
                      <div className="min-w-0">
                        <div className="font-semibold" style={{ fontSize: "var(--fs-sm)" }}>{c.field} → <span className="diff-new">{c.requested}</span></div>
                        <div className="ly-hint">{c.id} · {relativeTime(c.at)} · evidence: {c.evidence}</div>
                      </div>
                      {c.status === "PENDING" ? (
                        <button type="button" className="ly-btn ly-btn-ghost ly-btn-sm" onClick={() => s.withdrawCorrection(c.id)}>Withdraw</button>
                      ) : (
                        <span className="ly-chip ly-status-chip ly-status-neutral">{c.status}</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </Collapsible>

            <div id="s-disability" className="pf-sub">
              <Collapsible id="s-disability-body" title="Disability" summary={p.personal.disability ? `${p.personal.disability.type} · card on file` : "None recorded"} defaultOpen>
                {p.personal.disability ? (
                  <div className="grid gap-3">
                    <div className="ly-panel">
                      <KV k="Type">{p.personal.disability.type}</KV>
                      <KV k="Disability card"><Masked masked={`•••• ${p.personal.disability.cardNo.slice(-4)}`} full={p.personal.disability.cardNo} label="disability card number" /></KV>
                      <KV k="Supporting document">{p.personal.disability.docName || "Not attached"}</KV>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="ly-btn ly-btn-outline ly-btn-sm" onClick={() => setActive({ kind: "disability" })}><Icon name="edit" size={15} /> Update</button>
                      <button type="button" className="ly-btn ly-btn-ghost ly-btn-sm" onClick={() => setActive({ kind: "disability" })}>Withdraw status</button>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    <p className="ly-hint m-0">No disability is recorded. You can add one if it helps us support you; it is optional and can be removed at any time.</p>
                    <button type="button" className="ly-btn ly-btn-outline ly-btn-sm justify-self-start" onClick={() => setActive({ kind: "disability" })}><Icon name="plus" size={15} /> Record disability status</button>
                  </div>
                )}
              </Collapsible>
            </div>

            <div id="s-consent" className="pf-sub">
              <Collapsible id="s-consent-body" title="Consent" summary="Five purposes · renewed every 12 months" defaultOpen>
                <div>
                  {CONSENT_PURPOSES.map((c) => {
                    const granted = !!s.settings.consents[c.settingsKey];
                    const last = [...CONSENT_LOG].sort((a, b) => b.at.localeCompare(a.at)).find((x) => x.purposeKey === c.key);
                    return (
                      <div key={c.key} className="pf-consent-row">
                        <div className="min-w-0">
                          <div className="font-semibold" style={{ fontSize: "var(--fs-sm)" }}>{c.label}</div>
                          <div className="ly-hint">Last updated {last ? fmtDate(last.at) : "—"}{last ? ` · ${last.channel}` : ""}</div>
                        </div>
                        <span className={`ly-chip ly-status-chip ${granted ? "ly-status-verified" : "ly-status-neutral"}`}>{granted ? "Granted" : "Withdrawn"}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" className="ly-btn ly-btn-outline ly-btn-sm" onClick={() => setActive({ kind: "consentLog" })}><Icon name="file" size={15} /> View full consent log</button>
                  <button type="button" className="ly-btn ly-btn-ghost ly-btn-sm" onClick={() => s.open("settings", "privacy")}><Icon name="settings" size={15} /> Change consent in Settings</button>
                </div>
              </Collapsible>
            </div>
          </section>
        </div>

        {/* ===================== RIGHT-RAIL INDEX (scrollspy) ===================== */}
        <aside className="pf-rail" aria-label="Profile section index">
          <div className="ly-eyebrow pf-rail-title">On this page</div>
          {RAIL.map((r) => {
            const isActive = railOf(spy) === r.id;
            return (
              <button key={r.id} type="button" className={`pf-rail-item ${isActive ? "is-active" : ""}`} aria-current={isActive ? "true" : undefined} onClick={() => jumpTo(r.id)}>
                <Icon name={r.icon} size={17} />
                <span className="min-w-0">
                  <span className="pf-rail-label block truncate">{r.label}</span>
                  <span className="pf-rail-sub">{railSub(r.id, p.guardians.length, verified, applicable, pendingTransfers, pendingCorrections)}</span>
                </span>
              </button>
            );
          })}
          <div className="ly-hint mt-2" style={{ fontSize: 11 }}>Live: {PLATFORM_STATS.counties} counties · {CURRENT_STUDENT.nemisUpi ? "NEMIS linked" : "NEMIS pending"}</div>
        </aside>
      </div>

      {/* ===================== OVERLAY HOST (local to this page) ===================== */}
      {active?.kind === "editProfile" && <EditProfileWizard onClose={close} />}
      {active?.kind === "field" && (
        <FieldEditDialog
          label={FIELDS[active.key].label}
          current={p.personal[active.key] as string}
          options={FIELDS[active.key].options}
          hint={FIELDS[active.key].hint}
          onClose={close}
          onSave={(value) => {
            s.saveSection(
              [{ field: FIELDS[active.key].label, before: p.personal[active.key] as string, after: value }],
              { personal: { ...p.personal, [active.key]: value } },
            );
            toast("Profile saved — 1 change written to the audit trail.");
            close();
          }}
        />
      )}
      {active?.kind === "languages" && (
        <LanguagesDialog current={p.personal.languages} onClose={close} onSave={(langs) => {
          s.saveSection([{ field: "Languages spoken", before: p.personal.languages.join(" · "), after: langs.join(" · ") }], { personal: { ...p.personal, languages: langs } });
          toast("Profile saved — 1 change written to the audit trail.");
          close();
        }} />
      )}
      {active?.kind === "lock" && (
        <VitalLockDialog field={active.field} value={active.value} onClose={close} onRequest={() => setActive({ kind: "correction", field: active.field })} />
      )}
      {active?.kind === "correction" && <VitalCorrectionWizard initialField={active.field} onClose={close} />}
      {active?.kind === "photo" && <PhotoDialog onClose={close} />}
      {active?.kind === "history" && <ChangeHistoryDialog onClose={close} />}
      {active?.kind === "consentLog" && <ConsentLogDialog onClose={close} />}
      {active?.kind === "guardian" && (
        <GuardianDrawer
          id={active.id}
          onClose={close}
          onEdit={() => setActive({ kind: "guardianEdit", id: active.id })}
          onRemove={() => setActive({ kind: "guardianRemove", id: active.id })}
          onFlag={(flag) => setActive({ kind: "primary", id: active.id, flag })}
        />
      )}
      {active?.kind === "guardianNew" && <GuardianWizard onClose={close} />}
      {active?.kind === "guardianEdit" && (() => {
        const g = p.guardians.find((x) => x.id === active.id);
        return g ? <GuardianWizard editing={g} onClose={close} /> : null;
      })()}
      {active?.kind === "guardianRemove" && <GuardianRemoveDialog id={active.id} onClose={close} />}
      {active?.kind === "primary" && <PrimaryConfirmDialog id={active.id} flag={active.flag} onClose={close} />}
      {active?.kind === "home" && <HomeWizard onClose={close} />}
      {active?.kind === "gps" && <GpsDialog onClose={close} />}
      {active?.kind === "map" && <MapDialog onClose={close} />}
      {active?.kind === "school" && <SchoolWizard onClose={close} />}
      {active?.kind === "teacher" && (() => {
        const t = TEACHERS.find((x) => x.id === active.id);
        return t ? <TeacherDrawer teacher={t} onClose={close} onMessage={() => { close(); s.open("messages", `to:${t.id}`); }} /> : null;
      })()}
      {active?.kind === "identifier" && (() => {
        const i = IDENTIFIERS.find((x) => x.key === active.key);
        return i ? <IdentifierDialog identifier={i} onClose={close} onCorrect={() => setActive({ kind: "correction", field: i.key })} /> : null;
      })()}
      {active?.kind === "disability" && <DisabilityWizard current={p.personal.disability} onClose={close} />}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */

function railSub(id: string, guardians: number, verified: number, applicable: number, transfers: number, corrections: number): string {
  if (id === "s-personal") return corrections ? `${corrections} correction pending` : "2 locked · 6 editable";
  if (id === "s-family") return `${guardians} of 4 guardians`;
  if (id === "s-home") return "GPS on file";
  if (id === "s-school") return transfers ? `${transfers} transfer pending` : "Kenya High School";
  return `${verified} of ${applicable} verified`;
}

function LockedField({ label, value, onOpen }: { label: string; value: string; onOpen: () => void }) {
  return (
    <button type="button" className="pf-field is-locked" onClick={onOpen} aria-label={`Locked: ${label}. Request a correction.`}>
      <span className="pf-field-label">{label}</span>
      <span className="pf-field-badge"><Icon name="lock" size={13} /> Verified</span>
      <span className="pf-field-value">{value}</span>
    </button>
  );
}

function EditableField({ label, value, sub, onOpen }: { label: string; value: string; sub?: string; onOpen: () => void }) {
  return (
    <button type="button" className="pf-field" onClick={onOpen} aria-label={`Edit ${label}`}>
      <span className="pf-field-label">{label}</span>
      <span className="pf-field-badge"><Icon name="edit" size={13} /> Edit</span>
      <span className="pf-field-value">{value}{sub && <span className="pf-field-sub">{sub}</span>}</span>
    </button>
  );
}

function GuardianCard({ g, onOpen, onEdit, onRemove }: { g: Guardian; onOpen: () => void; onEdit: () => void; onRemove: () => void }) {
  return (
    <article className={`pf-guardian ${g.primary ? "is-primary" : ""}`} aria-label={`${g.relationship}: ${g.name}`}>
      <div className="pf-guardian-top">
        <span className="ly-chip ly-status-chip ly-status-neutral">{g.relationship}</span>
        <span className="flex gap-1">
          {g.primary && <span className="ly-chip ly-status-chip ly-status-warn" title="Primary contact"><Icon name="star" size={12} /> Primary</span>}
          {g.nextOfKin && <span className="ly-chip ly-status-chip ly-status-disbursed" title="Next of kin"><Icon name="shield" size={12} /> Next of kin</span>}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="ly-avatar ly-avatar-soft">{g.initials}</span>
        <h3 className="pf-guardian-name min-w-0 truncate">{g.name}</h3>
      </div>
      <div className="pf-guardian-lines">
        <span><Masked masked={maskPhone(g.phone)} full={g.phone} label={`${g.name}'s phone`} /></span>
        {g.email && <span className="truncate">{g.email}</span>}
        <span>{g.occupation}{g.employer && g.employer !== "—" ? ` · ${g.employer}` : ""}</span>
        <span><span className="ly-chip ly-status-chip ly-status-neutral">Income: {incomeBucket(g.incomeBand)}</span></span>
      </div>
      <div className="pf-guardian-actions">
        <button type="button" className="ly-btn ly-btn-ghost ly-btn-sm" onClick={onOpen}>Details</button>
        <button type="button" className="ly-btn ly-btn-outline ly-btn-sm" onClick={onEdit}><Icon name="edit" size={14} /> Edit</button>
        <button type="button" className="ly-btn ly-btn-ghost ly-btn-sm" onClick={onRemove} aria-label={`Remove ${g.name}`}><Icon name="trash" size={14} /></button>
      </div>
    </article>
  );
}

function IdentifierRow({ i, onOpen }: { i: Identifier; onOpen: () => void }) {
  const cls = i.verification === "VERIFIED" ? "is-verified" : i.verification === "PENDING" ? "is-pending" : i.verification === "UNVERIFIED" ? "is-unverified" : "is-na";
  return (
    <button type="button" className="pf-id-row" onClick={onOpen} aria-label={`${i.label}: ${VERIFICATION_LABEL[i.verification as Verification]}`}>
      <span className="pf-id-kind"><Icon name={i.kind === "INDEX" ? "book" : "shield"} size={16} /></span>
      <span className="min-w-0">
        <span className="pf-id-label block truncate">{i.label}</span>
        <span className="pf-id-note truncate">{i.key === "National ID" ? `Required from ${nationalIdDue(CURRENT_STUDENT.dob)}` : i.note}</span>
      </span>
      <span className={`pf-verify ${cls}`}>{VERIFICATION_LABEL[i.verification]}</span>
      <span className="pf-id-chev"><Icon name="chevronRight" size={16} /></span>
    </button>
  );
}

function Collapsible({ id, title, summary, defaultOpen, children }: { id: string; title: string; summary: string; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className={`pf-collapse ${open ? "is-open" : ""}`} id={id}>
      <button type="button" className="pf-collapse-btn" aria-expanded={open} aria-controls={`${id}-panel`} onClick={() => setOpen((v) => !v)}>
        <span className="min-w-0">
          <span className="pf-collapse-title block">{title}</span>
          <span className="pf-collapse-sum">{summary}</span>
        </span>
        <span className="ly-hint">{open ? "Hide" : "Show"}</span>
        <span className="pf-chevron"><Icon name="chevronDown" size={18} /></span>
      </button>
      {open && <div id={`${id}-panel`} className="pf-collapse-body">{children}</div>}
    </div>
  );
}

function AddressBlock() {
  const s = useStudent();
  const h = s.profile.home;
  return (
    <div className="grid gap-4 content-start">
      <dl className="pf-address ly-panel m-0">
        <KVRow k="County" v={h.county} />
        <KVRow k="Sub-county" v={h.subCounty} />
        <KVRow k="Ward" v={h.ward} />
        <KVRow k="Constituency" v={h.constituency} />
        <KVRow k="Town" v={h.town} />
        <KVRow k="Estate / village" v={h.estate} />
        <KVRow k="Street / plot" v={h.street} />
        <KVRow k="Landmark" v={h.landmark} />
      </dl>
      <div className="flex flex-wrap gap-2">
        <span className="ly-chip ly-status-chip ly-status-neutral">{h.buildingType}</span>
        <span className="ly-chip ly-status-chip ly-status-neutral">{h.ownership}{h.ownership === "Rented" ? ` · KES ${h.rentKes.toLocaleString("en-KE")}/mo` : ""}</span>
        <span className="ly-chip ly-status-chip ly-status-neutral"><Icon name="pin" size={13} /> {h.distanceKm} km · {h.travelMode}</span>
      </div>
    </div>
  );
}

function KVRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="ly-kv">
      <dt style={{ margin: 0 }}><span>{k}</span></dt>
      <dd style={{ margin: 0 }}><strong>{v}</strong></dd>
    </div>
  );
}

function MapPreview({ onOpen }: { onOpen: () => void }) {
  const s = useStudent();
  const h = s.profile.home;
  const W = 600;
  const H = 320;
  const SPAN = 0.02;
  const x = ((h.lng - (h.lng - SPAN / 2)) / SPAN) * W;
  const y = (((h.lat + SPAN / 2) - h.lat) / SPAN) * H;
  return (
    <div className="pf-map-card">
      <button type="button" className="pf-map-btn" onClick={onOpen} aria-label="Open the map editor to adjust your pin">
        <svg className="pf-map" viewBox={`0 0 ${W} ${H}`} aria-hidden>
          <rect width={W} height={H} className="pf-map-bg" />
          <path d={`M0 ${H * 0.5} H${W}`} className="pf-map-road" />
          <path d={`M${W * 0.5} 0 V${H}`} className="pf-map-road" />
          <path d="M90 0 L240 320" className="pf-map-road is-minor" />
          <path d="M430 0 L560 320" className="pf-map-road is-minor" />
          <text x={18} y={H - 16} className="pf-map-label">Ragati Road</text>
          <text x={W - 150} y={28} className="pf-map-label">Karatina Market</text>
          <circle cx={x} cy={y} r={16} className="pf-map-accuracy" />
          <circle cx={x} cy={y} r={9} className="pf-map-pin" />
          <circle cx={x} cy={y} r={3.5} className="pf-map-pin-core" />
        </svg>
      </button>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="pf-coords">{h.lat.toFixed(5)}, {h.lng.toFixed(5)}</span>
        <span className="ly-hint">{h.accuracyM ? `±${h.accuracyM} m` : "Placed by hand"}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="ly-btn ly-btn-outline ly-btn-sm" onClick={onOpen}><Icon name="pin" size={14} /> Adjust pin</button>
        <a className="ly-btn ly-btn-ghost ly-btn-sm" href={`https://www.openstreetmap.org/?mlat=${h.lat}&mlon=${h.lng}#map=16/${h.lat}/${h.lng}`} target="_blank" rel="noopener noreferrer">
          Open in OpenStreetMap <Icon name="arrowRight" size={13} />
        </a>
      </div>
    </div>
  );
}

function SchoolCard() {
  const s = useStudent();
  const sc = s.profile.school;
  const rows: [string, string][] = [
    ["MOE code", sc.moeCode],
    ["School type", sc.schoolType],
    ["County", sc.county],
    ["Boarding status", sc.boarding],
    ["Class", `${sc.grade} · ${sc.stream}`],
    ["Pathway", sc.pathway],
    ["Admission number", sc.admissionNo],
    ["Enrolled", fmtDate(sc.enrolmentDate)],
    ["Expected completion", fmtDate(sc.expectedCompletion)],
  ];
  return (
    <div className="pf-school">
      <span className="pf-crest" aria-label={`${sc.name} crest`}>{sc.crest}</span>
      <div className="min-w-0">
        <div className="font-display" style={{ fontSize: "1.2rem", fontWeight: 600 }}>{sc.name}</div>
        <div className="ly-hint mb-3">Admin-managed crest · AD-6 school registry</div>
        <dl className="m-0 grid gap-0 sm:grid-cols-2" style={{ columnGap: 24 }}>
          {rows.map(([k, v]) => (
            <div key={k} className="ly-kv"><dt style={{ margin: 0 }}><span>{k}</span></dt><dd style={{ margin: 0 }}><strong>{v}</strong></dd></div>
          ))}
        </dl>
      </div>
    </div>
  );
}
