import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import "../../styles/pages/auth-signup.css";
import { AuthShell } from "../../components/auth/AuthShell";
import { OTPInput } from "../../components/auth/OTPInput";
import { PasswordField } from "../../components/auth/PasswordField";
import { LearnlyLogo } from "../../components/marketing/LearnlyLogo";
import { LevelBadgeIcon } from "../../components/levels/LevelBadgeIcon";
import {
  ForgotDialog,
  LegalDialog,
  SpinnerIcon,
  type LegalKey,
} from "../../components/marketing/LandingDialogs";
import { CountUp, Stepper, useToast } from "../../components/ui/primitives";
import { navigate } from "../../lib/navigation";
import { createSignupSchema, type SignupValues } from "../../lib/signup-schema";
import { loadAccountPreview, saveAccountPreview, type AccountPreview } from "../../lib/auth-preview";
import {
  configuredBootstrapToken,
  DEMO_BOOTSTRAP_TOKEN,
  OTP_PREVIEW_CODE,
  OTP_RESEND_COOLDOWN_MS,
  OTP_TTL_MS,
  ROLE_OPTIONS,
  type SignupFormValues,
  type SignupRole,
} from "../../data/auth";
import { EDU_LEVELS, PLATFORM_STATS, type EduLevelKey } from "../../data/students";

type SignupStep = "form" | "verify" | "success";

const selectedLevelLabel = EDU_LEVELS.find((level) => level.key === new URLSearchParams(window.location.search).get("level"))?.label;

const DEFAULT_VALUES: SignupFormValues = {
  fullName: "",
  nationalId: "",
  phone: "",
  email: "",
  password: "",
  confirmPassword: "",
  terms: false,
  dpa: false,
  bootstrapToken: "",
};

const BRAND_PATHWAY: { key: EduLevelKey; badge: string; title: string; meta: string }[] = [
  { key: "preprimary", badge: "PP1", title: "A strong start", meta: "Early childhood · ECDE" },
  { key: "primary", badge: "Grade 6", title: "Growing potential", meta: "Primary · CBC" },
  { key: "junior", badge: "Grade 9", title: "Finding their path", meta: "Junior School · CBC" },
  { key: "university", badge: "PhD", title: "Limitless futures", meta: "University · Postgraduate" },
];

/** PAGE A-1 — /auth/signup. First A-group page owns AuthShell. */
export default function Signup() {
  const { toast } = useToast();
  const [role, setRole] = useState<SignupRole>(() => new URLSearchParams(window.location.search).get("role") === "admin" ? "admin" : "student");
  const [step, setStep] = useState<SignupStep>("form");
  const [pending, setPending] = useState<SignupFormValues | null>(null);
  const [account, setAccount] = useState<AccountPreview | null>(() => loadAccountPreview());
  const [persisted, setPersisted] = useState(true);
  const [showToken, setShowToken] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpBusy, setOtpBusy] = useState(false);
  const [expiresAt, setExpiresAt] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [resendCount, setResendCount] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [forgot, setForgot] = useState(false);
  const [legal, setLegal] = useState<LegalKey | null>(null);
  const [reviewDetails, setReviewDetails] = useState(false);
  const successHeading = useRef<HTMLHeadingElement>(null);
  const verifyTimer = useRef<number | undefined>(undefined);

  const schema = useMemo(() => createSignupSchema(role), [role]);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    clearErrors,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (step !== "verify") return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [step]);

  useEffect(() => {
    if (step === "success") successHeading.current?.focus();
  }, [step]);

  useEffect(() => () => window.clearTimeout(verifyTimer.current), []);

  const bootstrapTokenValue = watch("bootstrapToken");
  const otpExpired = now >= expiresAt;
  const cooldownSeconds = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
  const ttlSeconds = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  const bootstrapConfigured = !!configuredBootstrapToken();

  const onValid = (values: SignupValues) => {
    setPending({ ...values });
    setOtp("");
    setOtpError("");
    setResendCount(0);
    setCooldownUntil(0);
    setNow(Date.now());
    setExpiresAt(Date.now() + OTP_TTL_MS);
    setStep("verify");
  };

  const verifyOtp = () => {
    if (!pending || otpBusy) return;
    if (otpExpired) {
      setOtpError("This code has expired. Request a new preview code below.");
      return;
    }
    if (otp.length !== 6) {
      setOtpError("Enter all six digits of your verification code.");
      return;
    }
    if (otp !== OTP_PREVIEW_CODE) {
      setOtpError("That code doesn't match. Use the preview code 123456.");
      return;
    }

    setOtpBusy(true);
    setOtpError("");
    verifyTimer.current = window.setTimeout(() => {
      const preview: AccountPreview = {
        fullName: pending.fullName.trim(),
        role,
        phoneLast4: pending.phone.slice(-4),
        identityLast4: pending.nationalId.slice(-4),
        email: pending.email.trim() || undefined,
        createdAt: new Date().toISOString(),
        consentAt: new Date().toISOString(),
        activation: role === "admin" ? "pending-admin" : "self-service",
      };
      setPersisted(saveAccountPreview(preview));
      setAccount(preview);
      setPending(null);
      setOtp("");
      setOtpBusy(false);
      setValue("password", "");
      setValue("confirmPassword", "");
      reset();
      setStep("success");
      toast("OTP verified — your account preview is ready.");
    }, 800);
  };

  const resendOtp = () => {
    if (cooldownSeconds > 0 || resendCount >= 5) return;
    setExpiresAt(Date.now() + OTP_TTL_MS);
    setCooldownUntil(Date.now() + OTP_RESEND_COOLDOWN_MS);
    setNow(Date.now());
    setResendCount((count) => count + 1);
    setOtp("");
    setOtpError("");
  };

  const backToForm = () => {
    setStep("form");
    setPending(null);
    setOtp("");
    setOtpError("");
    setSubmitAttempted(false);
  };

  const editAccount = () => {
    backToForm();
    setValue("password", "");
    setValue("confirmPassword", "");
    window.setTimeout(() => document.getElementById("fullName")?.focus(), 50);
  };

  return (
    <AuthShell className="page-auth-signup" onLegal={setLegal}>
      <div className="signup-page-grid">
        {/* ===================== S1 — SPLIT LAYOUT / BRAND PANEL ===================== */}
        <aside className="signup-brand-panel" aria-label="Learnly academic sponsorship">
          <div className="signup-brand-content">
            <div className="signup-brand-top">
              <LearnlyLogo light size={34} />
              <span>FOR EVERY KENYAN LEARNER</span>
            </div>

            <div className="signup-brand-heading">
              <div className="ly-eyebrow mb-3" style={{ color: "var(--brand-accent)" }}>
                Academic sponsorship, made simple
              </div>
              <h1>Join <span>Learnly.</span></h1>
              <p>Sponsorship from PP1 to PhD.</p>
              <p className="signup-brand-description">
                One learner record. Every academic level.<br />
                Fees, upkeep and pocket money — with proof,
                approvals and payouts built in.
              </p>
            </div>

            <div className="signup-pathway" aria-label="From early childhood to postgraduate education">
              {BRAND_PATHWAY.map((item) => (
                <div key={item.key} className="signup-pathway-card" style={{ ["--ribbon" as string]: `var(--edu-${item.key})` }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="signup-pathway-icon"><LevelBadgeIcon level={item.key} size={21} /></span>
                    <span className="signup-pathway-badge">{item.badge}</span>
                  </div>
                  <div className="signup-pathway-title">{item.title}</div>
                  <div className="signup-pathway-meta">{item.meta}</div>
                </div>
              ))}
            </div>

            <div className="signup-brand-stats">
              <div>
                <div className="signup-brand-stat-number"><CountUp value={PLATFORM_STATS.studentsSponsored} suffix="+" /></div>
                <div>learners supported</div>
              </div>
              <div>
                <div className="signup-brand-stat-number"><CountUp value={PLATFORM_STATS.counties} /></div>
                <div>counties connected</div>
              </div>
              <span className="signup-brand-ke" aria-label="Kenya">🇰🇪</span>
            </div>

            <div className="signup-brand-quote">
              <blockquote>
                “Knowing that school fees have reached the school gives us peace of mind. Now we can focus on the learner's next term.”
              </blockquote>
              <cite>Parent of a Junior School learner · Nairobi</cite>
            </div>
            <div className="signup-brand-footer">Built for Kenyan families. Backed by proof.</div>
          </div>
        </aside>

        {/* ===================== S2 + S3 — ROLE SELECTOR & SIGNUP FORM ===================== */}
        <div className="signup-form-side">
          {step === "form" && (
            <div className="signup-form-container">
              <nav className="signup-breadcrumb mb-5 flex items-center gap-2" aria-label="Breadcrumb">
                <a href="/" onClick={(e) => { e.preventDefault(); navigate("/"); }}>Home</a>
                <span>/</span>
                <span>Create account</span>
              </nav>
              <div className="ly-eyebrow mb-2">Your next chapter starts here</div>
              <h2 className="signup-form-heading">Create your account</h2>
              <p className="signup-form-sub mb-0">A few details today. A brighter tomorrow.</p>

              {account && (
                <div className="signup-existing-preview mt-4">
                  <span>A preview account is saved in this browser.</span>
                  <button type="button" onClick={() => { setReviewDetails(false); setStep("success"); }}>Review it →</button>
                </div>
              )}

              {selectedLevelLabel && <div className="signup-existing-preview mt-4"><span>Selected level: <strong>{selectedLevelLabel}</strong>. You'll confirm this in the School step.</span></div>}

              <form noValidate onSubmit={handleSubmit(onValid, () => setSubmitAttempted(true))}>
                <fieldset className="signup-role-fieldset">
                  <legend className="ly-label">I am a…</legend>
                  <div className="signup-role-grid">
                    {ROLE_OPTIONS.map((option) => (
                      <label key={option.id} className={`signup-role-card ${role === option.id ? "is-selected" : ""}`}>
                        <input
                          type="radio"
                          name="accountRole"
                          value={option.id}
                          checked={role === option.id}
                          onChange={() => {
                            setRole(option.id);
                            clearErrors(["bootstrapToken", "email"]);
                          }}
                          aria-label={option.title}
                        />
                        <span className="signup-role-icon"><RoleIcon role={option.id} /></span>
                        <span className="signup-role-title">{option.title}</span>
                        <span className="signup-role-description">{option.description}</span>
                        <span className="signup-role-check" aria-hidden>{role === option.id ? <CheckIcon /> : null}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                {submitAttempted && Object.keys(errors).length > 0 && (
                  <div className="signup-error-summary" role="alert">Please check the highlighted fields below.</div>
                )}

                <div className="signup-form-grid">
                  <div className="ly-field">
                    <label className="ly-label" htmlFor="fullName">Full name</label>
                    <input
                      {...register("fullName")}
                      id="fullName"
                      className={`ly-input ${errors.fullName ? "is-invalid" : ""}`}
                      placeholder="e.g. Amani Wanjiku Kamau"
                      autoComplete="name"
                      aria-invalid={!!errors.fullName}
                      aria-describedby={errors.fullName ? "fullName-error" : undefined}
                    />
                    {errors.fullName && <span id="fullName-error" className="ly-error" role="alert">{errors.fullName.message}</span>}
                  </div>

                  <div className="ly-field">
                    <label className="ly-label" htmlFor="nationalId">National ID or birth certificate number</label>
                    <input
                      {...register("nationalId")}
                      id="nationalId"
                      className={`ly-input ${errors.nationalId ? "is-invalid" : ""}`}
                      placeholder="Enter your ID or birth certificate number"
                      autoComplete="off"
                      aria-invalid={!!errors.nationalId}
                      aria-describedby={errors.nationalId ? "nationalId-error" : "nationalId-hint"}
                    />
                    {errors.nationalId ? (
                      <span id="nationalId-error" className="ly-error" role="alert">{errors.nationalId.message}</span>
                    ) : (
                      <span id="nationalId-hint" className="ly-hint">8-digit National ID, birth certificate, or K-prefixed certificate.</span>
                    )}
                  </div>

                  <div className="ly-field">
                    <label className="ly-label" htmlFor="phone">Mobile number</label>
                    <div className="ly-phone-input signup-phone-input">
                      <span className="prefix">🇰🇪 +254</span>
                      <input
                        {...register("phone")}
                        id="phone"
                        type="tel"
                        inputMode="numeric"
                        placeholder="712 345 678"
                        autoComplete="tel-national"
                        maxLength={9}
                        onChange={(e) => {
                          setValue("phone", `+254${e.target.value.replace(/\D/g, "").slice(0, 9)}`, {
                            shouldValidate: true,
                            shouldDirty: true,
                          });
                        }}
                        aria-invalid={!!errors.phone}
                        aria-describedby={errors.phone ? "phone-error" : "phone-hint"}
                      />
                    </div>
                    {errors.phone ? (
                      <span id="phone-error" className="ly-error" role="alert">{errors.phone.message}</span>
                    ) : (
                      <span id="phone-hint" className="ly-hint">Use your Kenyan mobile number without the leading 0.</span>
                    )}
                  </div>

                  <div className="ly-field">
                    <label className="ly-label" htmlFor="email">Email address <span className="optional-label">{role === "student" ? "(optional)" : "(required for admins)"}</span></label>
                    <input
                      {...register("email")}
                      id="email"
                      type="email"
                      className={`ly-input ${errors.email ? "is-invalid" : ""}`}
                      placeholder="you@example.com"
                      autoComplete="email"
                      aria-invalid={!!errors.email}
                      aria-describedby={errors.email ? "email-error" : undefined}
                    />
                    {errors.email && <span id="email-error" className="ly-error" role="alert">{errors.email.message}</span>}
                  </div>

                  {role === "admin" && (
                    <div className="signup-admin-token-field">
                      <div className="ly-field">
                        <label className="ly-label" htmlFor="bootstrapToken">One-time admin bootstrap token</label>
                        <div className="signup-token-input-shell">
                          <input
                            {...register("bootstrapToken")}
                            id="bootstrapToken"
                            value={bootstrapTokenValue}
                            onChange={(e) => setValue("bootstrapToken", e.target.value, { shouldDirty: true })}
                            type={showToken ? "text" : "password"}
                            className={`ly-input ${errors.bootstrapToken ? "is-invalid" : ""}`}
                            placeholder="Enter your deployment bootstrap token"
                            autoComplete="off"
                            aria-invalid={!!errors.bootstrapToken}
                            aria-describedby="bootstrapToken-hint"
                          />
                          <button type="button" onClick={() => setShowToken((v) => !v)}>{showToken ? "Hide" : "Show"}</button>
                        </div>
                        {errors.bootstrapToken && <span className="ly-error" role="alert">{errors.bootstrapToken.message}</span>}
                        <span id="bootstrapToken-hint" className="ly-hint">
                          {bootstrapConfigured
                            ? "Use the one-time token issued by your deployment administrator."
                            : <>Preview token: <span className="font-mono">{DEMO_BOOTSTRAP_TOKEN}</span></>}
                        </span>
                      </div>
                      {!bootstrapConfigured && (
                        <button type="button" className="ly-btn ly-btn-outline ly-btn-sm" onClick={() => {
                          setValue("bootstrapToken", DEMO_BOOTSTRAP_TOKEN, { shouldValidate: true });
                          setShowToken(true);
                        }}>
                          Use demo token
                        </button>
                      )}
                      <div className="signup-admin-note">The first admin becomes Super Admin. Production role and data-scope activation must be verified server-side.</div>
                    </div>
                  )}

                  <div className="signup-password-grid">
                    <PasswordField field="password" label="Password" register={register} control={control} error={errors.password?.message} />
                    <PasswordField field="confirmPassword" label="Confirm password" register={register} control={control} error={errors.confirmPassword?.message} />
                  </div>
                </div>

                <div className="signup-consent-grid">
                  <div>
                    <label className="consent-row" htmlFor="terms">
                      <input {...register("terms")} id="terms" type="checkbox" aria-invalid={!!errors.terms} />
                      <span>I agree to the <button type="button" onClick={(e) => { e.preventDefault(); setLegal("terms"); }}>Terms of Service</button>.</span>
                    </label>
                    {errors.terms && <span className="ly-error" role="alert">{errors.terms.message}</span>}
                  </div>
                  <div>
                    <label className="consent-row" htmlFor="dpa">
                      <input {...register("dpa")} id="dpa" type="checkbox" aria-invalid={!!errors.dpa} />
                      <span>I consent to processing my personal data under the <button type="button" onClick={(e) => { e.preventDefault(); setLegal("dpa"); }}>Data Protection Act 2019</button>.</span>
                    </label>
                    {errors.dpa && <span className="ly-error" role="alert">{errors.dpa.message}</span>}
                  </div>
                </div>

                <button type="submit" className="ly-btn ly-btn-primary signup-submit-btn" disabled={isSubmitting}>
                  {isSubmitting ? <><SpinnerIcon /> Creating account…</> : <>Create account <span aria-hidden>→</span></>}
                </button>
              </form>

              <div className="signup-account-links">
                Already have an account?{" "}
                <a
                  href="/auth/signin"
                  style={{ color: "var(--brand-ink)", fontWeight: 600, textDecoration: "none" }}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("/auth/signin");
                  }}
                >
                  Sign in
                </a>
                <span className="mx-2">·</span>
                <button type="button" onClick={() => setForgot(true)}>Forgot password?</button>
              </div>
              <div className="signup-secure-note"><LockIcon /> Preview only · no SMS sent · password never stored</div>
              <p className="signup-preview-note">By continuing, you'll verify your phone with a 6-digit preview OTP.</p>
            </div>
          )}

          {/* ===================== S4 — OTP PREVIEW BANNER ===================== */}
          {step === "verify" && pending && (
            <div className="signup-verify-card">
              <nav className="signup-breadcrumb mb-5 flex items-center gap-2" aria-label="Breadcrumb">
                <a href="/auth/signup" onClick={(e) => { e.preventDefault(); backToForm(); }}>Create account</a><span>/</span><span>Verify phone</span>
              </nav>
              <Stepper steps={["Account", "Verify phone", "Ready"]} active={1} />
              <div className="signup-verify-icon mt-6"><PhoneIcon /></div>
              <div className="ly-eyebrow mt-4 mb-2">One quick security check</div>
              <h2 className="signup-form-heading" style={{ fontSize: "2rem" }}>Verify your phone</h2>
              <p className="signup-form-sub mb-0">Enter the 6-digit verification code for <strong className="font-display" style={{ fontSize: "1.05rem", color: "var(--brand-ink)" }}>+254 {pending.phone}</strong>.</p>

              <div className="signup-otp-preview mt-5">
                <MessageIcon />
                <div>
                  <div className="font-semibold">We're sending a 6-digit OTP via SMS</div>
                  <p>In production, a code is sent to your phone. Standard SMS rates may apply. This interactive preview uses <span className="font-mono">123456</span> — no SMS is sent.</p>
                  <button type="button" onClick={() => { setOtp(OTP_PREVIEW_CODE); setOtpError(""); }}>Use preview code 123456 →</button>
                </div>
              </div>

              <form noValidate onSubmit={(e) => { e.preventDefault(); verifyOtp(); }}>
                <label className="ly-label mb-2" htmlFor="signup-otp-0">Verification code</label>
                <OTPInput value={otp} onChange={(value) => { setOtp(value); setOtpError(""); }} disabled={otpBusy || otpExpired} invalid={!!otpError} />
                <div className="signup-otp-meta">
                  <span className={otpExpired ? "ly-error" : "ly-hint"}>{otpExpired ? "Code expired — request a new one." : `Code expires in ${Math.floor(ttlSeconds / 60)}:${String(ttlSeconds % 60).padStart(2, "0")}`}</span>
                  <span className="ly-hint">Kenya / East-Africa data residency</span>
                </div>
                {otpError && <div className="ly-error mt-3" role="alert">{otpError}</div>}
                <div className="signup-verify-actions">
                  <button type="submit" className="ly-btn ly-btn-primary" disabled={otpBusy || otp.length !== 6 || otpExpired}>
                    {otpBusy ? <><SpinnerIcon /> Verifying…</> : <>Verify & create account →</>}
                  </button>
                  <button type="button" className="ly-btn ly-btn-ghost" onClick={backToForm} disabled={otpBusy}>← Edit account details</button>
                </div>
              </form>

              <div className="signup-resend-row">
                Didn't get a code?{" "}
                <button type="button" onClick={resendOtp} disabled={otpBusy || cooldownSeconds > 0 || resendCount >= 5}>
                  {cooldownSeconds > 0 ? `Resend in 0:${String(cooldownSeconds).padStart(2, "0")}` : resendCount >= 5 ? "Resend limit reached" : "Resend code"}
                </button>
              </div>
              <div className="signup-secure-note"><LockIcon /> Preview code only. No real account is authenticated.</div>
            </div>
          )}

          {/* ===================== SUCCESS / MINIMAL ACCOUNT PREVIEW ===================== */}
          {step === "success" && account && (
            <div className="signup-success-card">
              <nav className="signup-breadcrumb mb-5 flex items-center gap-2" aria-label="Breadcrumb">
                <a href="/" onClick={(e) => { e.preventDefault(); navigate("/"); }}>Home</a><span>/</span><span>Account preview</span>
              </nav>
              <Stepper steps={["Account", "Verify phone", "Ready"]} active={2} />
              <div className="signup-verify-icon mt-6"><CheckIcon size={30} /></div>
              <div className="ly-eyebrow mt-4 mb-2">Phone verification complete</div>
              <h2 ref={successHeading} tabIndex={-1} className="signup-form-heading" style={{ fontSize: "2rem" }}>You're all set, {account.fullName.split(" ")[0]}.</h2>
              <p className="signup-form-sub mb-0">Your account preview is ready. Here's the minimal record saved in this browser.</p>

              <div className="signup-success-account mt-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-display m-0" style={{ fontSize: "1.25rem" }}>{account.fullName}</h3>
                  <span className="ly-chip ly-status-approved" style={{ padding: "0.25rem 0.65rem", fontSize: "var(--fs-label)" }}>OTP verified</span>
                </div>
                <div className="signup-account-row"><span>Account type</span><strong>{account.role === "student" ? "Student / Parent" : "Admin / Sponsor"}</strong></div>
                <div className="signup-account-row"><span>Mobile number</span><strong className="font-display">+254 ••• ••• {account.phoneLast4}</strong></div>
                <div className="signup-account-row"><span>Identity number</span><strong className="font-display">•••••• {account.identityLast4}</strong></div>
                {reviewDetails && (
                  <>
                    {account.email && <div className="signup-account-row"><span>Email</span><strong>{account.email}</strong></div>}
                    <div className="signup-account-row"><span>Created</span><strong>{new Date(account.createdAt).toLocaleString("en-KE")}</strong></div>
                    <div className="signup-account-row"><span>DPA consent captured</span><strong>{new Date(account.consentAt).toLocaleString("en-KE")}</strong></div>
                  </>
                )}
                <button type="button" className="ly-btn ly-btn-outline ly-btn-sm mt-4" aria-expanded={reviewDetails} onClick={() => setReviewDetails((v) => !v)}>
                  {reviewDetails ? "Hide account details" : "Review account details →"}
                </button>
              </div>

              <div className="signup-next-step mt-4">
                <strong>{account.role === "student" ? "Next: your 7-step learner profile" : "Admin access requires activation"}</strong>
                <p>{account.role === "student"
                  ? "Account → Personal → Family → Home → School → Documents → Review. Your onboarding draft will save as you go."
                  : "Your admin preview is pending activation. A Super Admin must verify your role and school / sponsor data scope before any approvals or payouts."}</p>
              </div>

              <div className="signup-success-actions">
                <a href="/" className="ly-btn ly-btn-primary" onClick={(e) => { e.preventDefault(); navigate("/"); }}>Explore Learnly →</a>
                <a href="/levels" className="ly-btn ly-btn-outline" onClick={(e) => { e.preventDefault(); navigate("/levels"); }}>See education levels</a>
                <button type="button" className="ly-btn ly-btn-ghost" onClick={editAccount}>Create another account</button>
              </div>
              <div className="signup-secure-note"><LockIcon /> {persisted ? "Only name, role and masked identifiers are saved. No password or OTP." : "Browser storage unavailable — this preview is kept for this session only."}</div>
              <p className="signup-preview-note">This is a frontend preview, not an authenticated session. Production requires server-side signup, OTP and bootstrap-token verification.</p>
            </div>
          )}
        </div>
      </div>

      {/* ===================== S5 — FOOTER / RECOVERY DIALOGS ===================== */}
      <ForgotDialog open={forgot} onClose={() => setForgot(false)} />
      <LegalDialog which={legal} onClose={() => setLegal(null)} />
    </AuthShell>
  );
}

function RoleIcon({ role }: { role: SignupRole }) {
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {role === "student" ? <><path d="m2 9 10-5 10 5-10 5Z" /><path d="M6 11v6c3 3 9 3 12 0v-6M22 9v7" /></> : <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 2h6v4H9zM9 12h6M9 16h4" /></>}
    </svg>
  );
}
function CheckIcon({ size = 12 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m5 12 4 4L19 6" /></svg>;
}
function LockIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3" /></svg>;
}
function PhoneIcon() {
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="6" y="2" width="12" height="20" rx="3" /><path d="M10 5h4M11 18h2" /></svg>;
}
function MessageIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 15a3 3 0 0 1-3 3H8l-5 4V5a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3Z" /><path d="M7 8h10M7 12h6" /></svg>;
}
