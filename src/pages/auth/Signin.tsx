import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import "../../styles/pages/auth-signin.css";
import { AuthShell } from "../../components/auth/AuthShell";
import { OTPInput } from "../../components/auth/OTPInput";
import { LearnlyLogo } from "../../components/marketing/LearnlyLogo";
import {
  ForgotDialog,
  LegalDialog,
  SpinnerIcon,
  type LegalKey,
} from "../../components/marketing/LandingDialogs";
import { Dialog, Reveal, useToast } from "../../components/ui/primitives";
import { navigate } from "../../lib/navigation";
import {
  otpRequestSchema,
  passwordSignInSchema,
  type OtpRequestValues,
  type PasswordSignInValues,
} from "../../lib/signin-schema";
import {
  clearSessionPreview,
  loadAccountPreview,
  loadSessionPreview,
  maskIdentifier,
  saveSessionPreview,
  type SessionPreview,
} from "../../lib/auth-preview";
import {
  normalizeKenyanPhone,
  OTP_PREVIEW_CODE,
  OTP_RESEND_COOLDOWN_MS,
  OTP_TTL_MS,
  SIGNIN_PREVIEW_ACCOUNTS,
  SIGNIN_QUICK_PRESETS,
  TOTP_PREVIEW_CODE,
  TOTP_RECOVERY_PREVIEW_CODE,
  TOTP_WINDOW_SECONDS,
  type SignInPreviewAccount,
} from "../../data/auth";
import { eduLevelLabel } from "../../data/students";

type AuthMode = "password" | "otp";
type SignInStage = "credentials" | "otp-verify" | "totp" | "redirect";

interface PendingChallenge {
  account: SignInPreviewAccount;
  identifierRaw: string;
  authMethod: AuthMode;
  remember30d: boolean;
}

function resolvePreviewAccount(identifier: string): SignInPreviewAccount {
  const trimmed = identifier.trim();
  const normalizedPhone = normalizeKenyanPhone(trimmed);
  const lower = trimmed.toLowerCase();

  const exact = SIGNIN_PREVIEW_ACCOUNTS.find(
    (acc) =>
      acc.email.toLowerCase() === lower ||
      (normalizedPhone !== null && acc.phone === normalizedPhone),
  );
  if (exact) return exact;

  // Check if it matches the preview account saved on A-1 (/auth/signup)
  const fromSignup = loadAccountPreview();
  if (fromSignup) {
    const emailMatches = fromSignup.email && fromSignup.email.toLowerCase() === lower;
    const phoneMatches = normalizedPhone !== null && normalizedPhone.endsWith(fromSignup.phoneLast4);
    if (emailMatches || phoneMatches) {
      return {
        id: "acc-signup-preview",
        fullName: fromSignup.fullName,
        role: fromSignup.role,
        phone: normalizedPhone ?? `+25470000${fromSignup.phoneLast4}`,
        email: fromSignup.email ?? "account@learnly.co.ke",
        totpEnabled: fromSignup.role === "admin",
        eduLevel: fromSignup.role === "student" ? "senior" : undefined,
        school: fromSignup.role === "student" ? "Onboarding profile in progress" : undefined,
        gradeLabel: fromSignup.role === "student" ? "Student account preview" : undefined,
        staffRole: fromSignup.role === "admin" ? "SUPER_ADMIN" : undefined,
        staffRoleLabel: fromSignup.role === "admin" ? "Super Admin (pending activation)" : undefined,
        dataScope: fromSignup.role === "admin" ? "ALL · Bootstrap preview" : undefined,
        permissionSummary: fromSignup.role === "admin" ? "Awaiting Super Admin verification & scope activation" : undefined,
        targetRoute: fromSignup.role === "admin" ? "/admin" : "/student",
        targetPageName: fromSignup.role === "admin" ? "AD-1 Admin Command Center" : "S-1 Student Overview",
      };
    }
  }

  // Infer role for any other valid Kenyan phone or admin/school email
  const looksAdmin = /admin|bursar|finance|audit|sponsor|liaison|verifier/i.test(lower);
  if (looksAdmin) {
    return {
      id: "acc-custom-admin",
      fullName: "Nairobi Sponsor Staff",
      role: "admin",
      phone: normalizedPhone ?? "+254720000000",
      email: trimmed.includes("@") ? trimmed : "staff@learnly.co.ke",
      totpEnabled: true,
      staffRole: "ADMIN",
      staffRoleLabel: "Admin",
      dataScope: "BY_COUNTY · Nairobi",
      permissionSummary: "Scoped student onboarding, academic verification & approvals",
      targetRoute: "/admin",
      targetPageName: "AD-1 Admin Command Center",
    };
  }

  return {
    id: "acc-custom-student",
    fullName: "Amani Wanjiku Kamau",
    role: "student",
    phone: normalizedPhone ?? "+254712345678",
    email: trimmed.includes("@") ? trimmed : "learner@student.learnly.co.ke",
    totpEnabled: false,
    eduLevel: "senior",
    school: "Kenya High School",
    gradeLabel: "Grade 11 · STEM pathway",
    targetRoute: "/student",
    targetPageName: "S-1 Student Overview",
  };
}

/** PAGE A-2 — /auth/signin. Reuses AuthShell + OTPInput (CREATE_SHELL=false). */
export default function Signin() {
  const { toast } = useToast();
  const [mode, setMode] = useState<AuthMode>("password");
  const [stage, setStage] = useState<SignInStage>("credentials");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState<PendingChallenge | null>(null);
  const [session, setSession] = useState<SessionPreview | null>(() => loadSessionPreview());
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // S3: Passwordless SMS OTP state
  const [smsOtp, setSmsOtp] = useState("");
  const [smsError, setSmsError] = useState("");
  const [smsExpiresAt, setSmsExpiresAt] = useState(0);
  const [smsCooldownUntil, setSmsCooldownUntil] = useState(0);
  const [smsResendCount, setSmsResendCount] = useState(0);

  // S4: Inline TOTP 2FA state (30s rolling window)
  const [totpCode, setTotpCode] = useState("");
  const [totpError, setTotpError] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [now, setNow] = useState(() => Date.now());

  // S5: Dialogs
  const [forgot, setForgot] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [legal, setLegal] = useState<LegalKey | null>(null);

  const actionTimer = useRef<number | undefined>(undefined);
  const redirectHeading = useRef<HTMLHeadingElement>(null);

  const passwordForm = useForm<PasswordSignInValues>({
    resolver: zodResolver(passwordSignInSchema),
    mode: "onTouched",
    defaultValues: { identifier: "", password: "", rememberMe: false },
  });

  const otpForm = useForm<OtpRequestValues>({
    resolver: zodResolver(otpRequestSchema),
    mode: "onTouched",
    defaultValues: { identifier: "", rememberMe: false },
  });

  const activeIdentifier =
    mode === "password" ? passwordForm.watch("identifier") : otpForm.watch("identifier");

  const detectedKind = useMemo(() => {
    const trimmed = activeIdentifier.trim();
    if (!trimmed) return null;
    if (trimmed.includes("@")) return "email" as const;
    if (normalizeKenyanPhone(trimmed)) return "phone" as const;
    return null;
  }, [activeIdentifier]);

  const matchedPreview = useMemo(() => {
    const trimmed = activeIdentifier.trim();
    if (!trimmed) return null;
    const normalizedPhone = normalizeKenyanPhone(trimmed);
    const lower = trimmed.toLowerCase();
    return (
      SIGNIN_PREVIEW_ACCOUNTS.find(
        (acc) =>
          acc.email.toLowerCase() === lower ||
          (normalizedPhone !== null && acc.phone === normalizedPhone),
      ) ?? null
    );
  }, [activeIdentifier]);

  // Tick every second during OTP or TOTP stages
  useEffect(() => {
    if (stage !== "otp-verify" && stage !== "totp") return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [stage]);

  useEffect(() => {
    if (stage === "redirect") redirectHeading.current?.focus();
  }, [stage]);

  useEffect(() => () => window.clearTimeout(actionTimer.current), []);

  const smsExpired = stage === "otp-verify" && now >= smsExpiresAt;
  const smsTtlSeconds = Math.max(0, Math.ceil((smsExpiresAt - now) / 1000));
  const smsCooldownSeconds = Math.max(0, Math.ceil((smsCooldownUntil - now) / 1000));

  // Rolling 30-second TOTP countdown window
  const totpRemaining =
    TOTP_WINDOW_SECONDS - (Math.floor(now / 1000) % TOTP_WINDOW_SECONDS);
  const totpPercent = Math.round((totpRemaining / TOTP_WINDOW_SECONDS) * 100);

  const finalizeSignIn = (challenge: PendingChallenge, verified2fa: boolean) => {
    const nextSession: SessionPreview = {
      fullName: challenge.account.fullName,
      role: challenge.account.role,
      identifierMasked: maskIdentifier(challenge.identifierRaw),
      authMethod: challenge.authMethod,
      verified2fa,
      remember30d: challenge.remember30d,
      targetRoute: challenge.account.targetRoute,
      targetPageName: challenge.account.targetPageName,
      eduLevel: challenge.account.eduLevel,
      school: challenge.account.school,
      gradeLabel: challenge.account.gradeLabel,
      staffRole: challenge.account.staffRole,
      staffRoleLabel: challenge.account.staffRoleLabel,
      dataScope: challenge.account.dataScope,
      permissionSummary: challenge.account.permissionSummary,
      signedInAt: new Date().toISOString(),
    };
    saveSessionPreview(nextSession);
    setSession(nextSession);
    setPending(null);
    setSmsOtp("");
    setTotpCode("");
    setRecoveryCode("");
    passwordForm.setValue("password", "");
    setStage("redirect");
    toast(
      `Signed in as ${nextSession.fullName} — routing to ${nextSession.targetPageName}.`,
    );
  };

  const switchMode = (nextMode: AuthMode) => {
    if (nextMode === mode) return;
    const currentId =
      mode === "password" ? passwordForm.getValues("identifier") : otpForm.getValues("identifier");
    const currentRemember =
      mode === "password" ? passwordForm.getValues("rememberMe") : otpForm.getValues("rememberMe");

    if (nextMode === "otp") {
      otpForm.setValue("identifier", currentId);
      otpForm.setValue("rememberMe", currentRemember);
    } else {
      passwordForm.setValue("identifier", currentId);
      passwordForm.setValue("rememberMe", currentRemember);
    }
    setMode(nextMode);
    setStage("credentials");
    setSmsOtp("");
    setSmsError("");
    setTotpCode("");
    setTotpError("");
  };

  const applyPresetAccount = (account: SignInPreviewAccount) => {
    const idValue = account.role === "admin" ? account.email : account.phone;
    passwordForm.setValue("identifier", idValue, { shouldValidate: true, shouldDirty: true });
    otpForm.setValue("identifier", idValue, { shouldValidate: true, shouldDirty: true });
    if (mode === "password" && !passwordForm.getValues("password")) {
      passwordForm.setValue("password", "LearnlyPreview!2025", { shouldValidate: true });
    }
    setStage("credentials");
    setPending(null);
    setTotpError("");
    setSmsError("");
    setDirectoryOpen(false);
  };

  // S2: Password submit
  const onPasswordSubmit = (values: PasswordSignInValues) => {
    setBusy(true);
    actionTimer.current = window.setTimeout(() => {
      setBusy(false);
      const account = resolvePreviewAccount(values.identifier);
      const challenge: PendingChallenge = {
        account,
        identifierRaw: values.identifier,
        authMethod: "password",
        remember30d: values.rememberMe,
      };
      if (account.totpEnabled) {
        setPending(challenge);
        setTotpCode("");
        setTotpError("");
        setUseRecovery(false);
        setRecoveryCode("");
        setNow(Date.now());
        setStage("totp");
      } else {
        finalizeSignIn(challenge, false);
      }
    }, 650);
  };

  // S3: Send passwordless SMS OTP
  const onOtpRequest = (values: OtpRequestValues) => {
    setBusy(true);
    actionTimer.current = window.setTimeout(() => {
      setBusy(false);
      const account = resolvePreviewAccount(values.identifier);
      setPending({
        account,
        identifierRaw: values.identifier,
        authMethod: "otp",
        remember30d: values.rememberMe,
      });
      setSmsOtp("");
      setSmsError("");
      setSmsResendCount(0);
      setSmsCooldownUntil(Date.now() + OTP_RESEND_COOLDOWN_MS);
      setSmsExpiresAt(Date.now() + OTP_TTL_MS);
      setNow(Date.now());
      setStage("otp-verify");
    }, 550);
  };

  const verifySmsOtp = () => {
    if (!pending || busy) return;
    if (smsExpired) {
      setSmsError("This OTP has expired. Request a new code below.");
      return;
    }
    if (smsOtp.length !== 6) {
      setSmsError("Enter all 6 digits of your SMS code.");
      return;
    }
    if (smsOtp !== OTP_PREVIEW_CODE) {
      setSmsError("Incorrect code. Use preview code 123456.");
      return;
    }

    setBusy(true);
    setSmsError("");
    actionTimer.current = window.setTimeout(() => {
      setBusy(false);
      if (pending.account.totpEnabled) {
        setTotpCode("");
        setTotpError("");
        setUseRecovery(false);
        setRecoveryCode("");
        setNow(Date.now());
        setStage("totp");
      } else {
        finalizeSignIn(pending, false);
      }
    }, 600);
  };

  const resendSmsOtp = () => {
    if (smsCooldownSeconds > 0 || smsResendCount >= 5) return;
    setSmsExpiresAt(Date.now() + OTP_TTL_MS);
    setSmsCooldownUntil(Date.now() + OTP_RESEND_COOLDOWN_MS);
    setSmsResendCount((c) => c + 1);
    setNow(Date.now());
    setSmsOtp("");
    setSmsError("");
  };

  // S4: Verify inline 2FA TOTP (or recovery code)
  const verifyTotp = () => {
    if (!pending || busy) return;
    if (useRecovery) {
      const cleaned = recoveryCode.trim().toUpperCase();
      if (cleaned !== TOTP_RECOVERY_PREVIEW_CODE) {
        setTotpError(`Invalid recovery code. Use preview code ${TOTP_RECOVERY_PREVIEW_CODE}.`);
        return;
      }
    } else {
      if (totpCode.length !== 6) {
        setTotpError("Enter all 6 digits from your authenticator app.");
        return;
      }
      if (totpCode !== TOTP_PREVIEW_CODE && totpCode !== OTP_PREVIEW_CODE) {
        setTotpError(`Code didn't match. Use preview authenticator code ${TOTP_PREVIEW_CODE}.`);
        return;
      }
    }

    setBusy(true);
    setTotpError("");
    actionTimer.current = window.setTimeout(() => {
      setBusy(false);
      finalizeSignIn(pending, true);
    }, 650);
  };

  const signOutPreview = () => {
    clearSessionPreview();
    setSession(null);
    setPending(null);
    setStage("credentials");
    setSmsOtp("");
    setTotpCode("");
    setRecoveryCode("");
    passwordForm.reset({ identifier: "", password: "", rememberMe: false });
    otpForm.reset({ identifier: "", rememberMe: false });
    toast("Signed out of preview session.");
  };

  const backToCredentials = () => {
    setPending(null);
    setStage("credentials");
    setSmsOtp("");
    setSmsError("");
    setTotpCode("");
    setTotpError("");
    setUseRecovery(false);
  };

  return (
    <AuthShell className="page-auth-signin" onLegal={setLegal}>
      <main className="signin-stage">
        <div className="signin-shell">
          <nav className="signin-breadcrumb" aria-label="Breadcrumb">
            <a href="/" onClick={(e) => { e.preventDefault(); navigate("/"); }}>Home</a>
            <span>/</span>
            <span style={{ color: "var(--text-primary)" }}>Sign in</span>
          </nav>

          <div className="signin-grid">
            {/* ===================== PRIMARY SIGN-IN CARD ===================== */}
            <section className="signin-card" aria-label="Sign in to Learnly">
              {/* S1 — BRAND HEADER */}
              <header className="signin-brand-header">
                <div className="signin-brand-top">
                  <LearnlyLogo light size={32} />
                  <span className="signin-residency-badge">🇰🇪 Kenya · DPA 2019</span>
                </div>
                <h1 className="signin-brand-title">
                  {stage === "totp"
                    ? <>Two-factor <em>verification</em></>
                    : stage === "redirect"
                      ? <>Ready for your <em>workspace</em></>
                      : <>Welcome back to <em>Learnly</em></>}
                </h1>
                <p className="signin-brand-sub">
                  {stage === "totp"
                    ? "Enter the 6-digit code from your authenticator app to finish signing in."
                    : stage === "redirect"
                      ? "Role verified. We've resolved your workspace destination."
                      : "Sign in as a student, guardian, or sponsor admin — we route you straight to your dashboard."}
                </p>
              </header>

              <div className="signin-card-body">
                {/* Saved session banner if returning */}
                {session && stage === "credentials" && (
                  <div className="signin-saved-banner">
                    <span>
                      Signed in as <strong>{session.fullName}</strong> ({session.role === "admin" ? session.staffRoleLabel : "Student"})
                    </span>
                    <div className="flex items-center gap-3">
                      <button type="button" className="signin-inline-link" onClick={() => setStage("redirect")}>
                        Open workspace summary →
                      </button>
                      <button type="button" className="signin-inline-link" onClick={signOutPreview}>
                        Sign out
                      </button>
                    </div>
                  </div>
                )}

                {/* S3 — PASSWORD vs OTP TOGGLE (shown during credentials & OTP step) */}
                {(stage === "credentials" || stage === "otp-verify") && (
                  <div className="signin-mode-toggle" role="tablist" aria-label="Sign-in method">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={mode === "password"}
                      className={`signin-mode-btn ${mode === "password" ? "is-active" : ""}`}
                      onClick={() => switchMode("password")}
                    >
                      <KeyIcon />
                      <span>Password</span>
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={mode === "otp"}
                      className={`signin-mode-btn ${mode === "otp" ? "is-active" : ""}`}
                      onClick={() => switchMode("otp")}
                    >
                      <SmsIcon />
                      <span>Sign in with OTP instead</span>
                    </button>
                  </div>
                )}

                {/* S2 — PASSWORD SIGN-IN FORM */}
                {stage === "credentials" && mode === "password" && (
                  <form
                    className="signin-form"
                    noValidate
                    onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
                  >
                    <div className="ly-field">
                      <div className="signin-identifier-head">
                        <label className="ly-label" htmlFor="signin-identifier">
                          Phone number or email
                        </label>
                        {detectedKind && (
                          <span className="signin-detected-pill">
                            {detectedKind === "phone" ? "🇰🇪 Kenyan mobile" : "✉️ Email"}
                          </span>
                        )}
                      </div>
                      <input
                        {...passwordForm.register("identifier")}
                        id="signin-identifier"
                        type="text"
                        className={`ly-input ${passwordForm.formState.errors.identifier ? "is-invalid" : ""}`}
                        placeholder="+254712345678, 0712345678 or you@school.ac.ke"
                        autoComplete="username"
                        aria-invalid={!!passwordForm.formState.errors.identifier}
                        aria-describedby={
                          passwordForm.formState.errors.identifier ? "signin-id-error" : "signin-id-hint"
                        }
                      />
                      {passwordForm.formState.errors.identifier ? (
                        <span id="signin-id-error" className="ly-error" role="alert">
                          {passwordForm.formState.errors.identifier.message}
                        </span>
                      ) : (
                        <span id="signin-id-hint" className="ly-hint">
                          Works with Safaricom/Airtel/Telkom numbers or your registered email.
                        </span>
                      )}
                      {matchedPreview && (
                        <div className="signin-match-hint">
                          <span>
                            Preview match: <strong style={{ color: "var(--text-primary)" }}>{matchedPreview.fullName}</strong> ·{" "}
                            {matchedPreview.role === "admin" ? matchedPreview.staffRoleLabel : matchedPreview.gradeLabel}
                          </span>
                          <span
                            className={`ly-chip ${matchedPreview.totpEnabled ? "ly-status-pending" : "ly-status-approved"}`}
                            style={{ padding: "0.15rem 0.5rem", fontSize: "var(--fs-label)" }}
                          >
                            {matchedPreview.totpEnabled ? "2FA TOTP enabled" : "Direct sign-in"}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="ly-field">
                      <div className="signin-identifier-head">
                        <label className="ly-label" htmlFor="signin-password">
                          Password
                        </label>
                        <button
                          type="button"
                          className="signin-inline-link"
                          onClick={() => setForgot(true)}
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div
                        className={`signin-password-shell ${passwordForm.formState.errors.password ? "is-invalid" : ""}`}
                      >
                        <input
                          {...passwordForm.register("password")}
                          id="signin-password"
                          type={showPassword ? "text" : "password"}
                          className="ly-input"
                          placeholder="Enter your password"
                          autoComplete="current-password"
                          aria-invalid={!!passwordForm.formState.errors.password}
                          aria-describedby={
                            passwordForm.formState.errors.password ? "signin-pw-error" : undefined
                          }
                        />
                        <button
                          type="button"
                          className="signin-password-toggle"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          aria-pressed={showPassword}
                          onClick={() => setShowPassword((v) => !v)}
                        >
                          <EyeIcon visible={showPassword} />
                        </button>
                      </div>
                      {passwordForm.formState.errors.password && (
                        <span id="signin-pw-error" className="ly-error" role="alert">
                          {passwordForm.formState.errors.password.message}
                        </span>
                      )}
                    </div>

                    <div className="signin-remember-row">
                      <label className="signin-checkbox-label" htmlFor="signin-remember">
                        <input
                          {...passwordForm.register("rememberMe")}
                          id="signin-remember"
                          type="checkbox"
                        />
                        <span>
                          <span className="block text-sm font-semibold">Remember me for 30 days</span>
                          <span className="ly-hint block">
                            Skip re-entering credentials on this personal device (avoid on shared computers).
                          </span>
                        </span>
                      </label>
                    </div>

                    <button type="submit" className="ly-btn ly-btn-primary signin-submit" disabled={busy}>
                      {busy ? (
                        <>
                          <SpinnerIcon /> Signing in…
                        </>
                      ) : (
                        <>
                          Sign in <span aria-hidden>→</span>
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* S3 — PASSWORDLESS OTP REQUEST FORM */}
                {stage === "credentials" && mode === "otp" && (
                  <form
                    className="signin-form"
                    noValidate
                    onSubmit={otpForm.handleSubmit(onOtpRequest)}
                  >
                    <div className="signin-otp-banner">
                      <div className="font-semibold text-sm">Passwordless SMS sign-in</div>
                      <p className="mt-1 mb-0 text-sm" style={{ color: "var(--text-secondary)" }}>
                        Enter your phone number or email. We'll send a one-time 6-digit SMS code via Africa's Talking — no password needed.
                      </p>
                    </div>

                    <div className="ly-field">
                      <div className="signin-identifier-head">
                        <label className="ly-label" htmlFor="signin-otp-identifier">
                          Phone number or registered email
                        </label>
                        {detectedKind && (
                          <span className="signin-detected-pill">
                            {detectedKind === "phone" ? "🇰🇪 Kenyan mobile" : "✉️ Email"}
                          </span>
                        )}
                      </div>
                      <input
                        {...otpForm.register("identifier")}
                        id="signin-otp-identifier"
                        type="text"
                        className={`ly-input ${otpForm.formState.errors.identifier ? "is-invalid" : ""}`}
                        placeholder="+254712345678, 0712345678 or you@school.ac.ke"
                        autoComplete="username"
                        aria-invalid={!!otpForm.formState.errors.identifier}
                      />
                      {otpForm.formState.errors.identifier ? (
                        <span className="ly-error" role="alert">
                          {otpForm.formState.errors.identifier.message}
                        </span>
                      ) : (
                        <span className="ly-hint">
                          Rate-limited to 1 SMS per 60 seconds (max 5 per hour). Standard SMS rates may apply.
                        </span>
                      )}
                      {matchedPreview && (
                        <div className="signin-match-hint">
                          <span>
                            Preview match: <strong style={{ color: "var(--text-primary)" }}>{matchedPreview.fullName}</strong>
                          </span>
                          <span className="font-mono">{maskIdentifier(matchedPreview.phone)}</span>
                        </div>
                      )}
                    </div>

                    <label className="signin-checkbox-label" htmlFor="signin-otp-remember">
                      <input {...otpForm.register("rememberMe")} id="signin-otp-remember" type="checkbox" />
                      <span>
                        <span className="block text-sm font-semibold">Remember me for 30 days</span>
                        <span className="ly-hint block">Keep this browser signed in after OTP verification.</span>
                      </span>
                    </label>

                    <button type="submit" className="ly-btn ly-btn-primary signin-submit" disabled={busy}>
                      {busy ? (
                        <>
                          <SpinnerIcon /> Sending OTP…
                        </>
                      ) : (
                        <>
                          Send 6-digit OTP <span aria-hidden>→</span>
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* S3 — PASSWORDLESS OTP VERIFICATION STEP */}
                {stage === "otp-verify" && pending && (
                  <form
                    className="signin-form"
                    noValidate
                    onSubmit={(e) => {
                      e.preventDefault();
                      verifySmsOtp();
                    }}
                  >
                    <div className="signin-otp-banner">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-sm">
                            Enter the 6-digit code sent to{" "}
                            <span className="font-mono">{maskIdentifier(pending.account.phone)}</span>
                          </div>
                          <p className="mt-1 mb-0 text-sm" style={{ color: "var(--text-secondary)" }}>
                            Preview mode: no SMS is sent. Use preview code <span className="font-mono font-semibold">{OTP_PREVIEW_CODE}</span>.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="signin-inline-link mt-2"
                        onClick={() => {
                          setSmsOtp(OTP_PREVIEW_CODE);
                          setSmsError("");
                        }}
                      >
                        Use preview code {OTP_PREVIEW_CODE} →
                      </button>
                    </div>

                    <div>
                      <label className="ly-label" htmlFor="signin-otp-0">
                        SMS verification code
                      </label>
                      <OTPInput
                        idPrefix="signin-otp"
                        ariaLabel="Six-digit SMS sign-in code"
                        value={smsOtp}
                        onChange={(v) => {
                          setSmsOtp(v);
                          setSmsError("");
                        }}
                        disabled={busy || smsExpired}
                        invalid={!!smsError}
                      />
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className={smsExpired ? "ly-error" : "ly-hint"}>
                          {smsExpired
                            ? "Code expired — request a new one."
                            : `Expires in ${Math.floor(smsTtlSeconds / 60)}:${String(smsTtlSeconds % 60).padStart(2, "0")}`}
                        </span>
                        <button
                          type="button"
                          className="signin-inline-link"
                          disabled={busy || smsCooldownSeconds > 0 || smsResendCount >= 5}
                          onClick={resendSmsOtp}
                          style={{
                            fontSize: "var(--fs-label)",
                            opacity: smsCooldownSeconds > 0 || smsResendCount >= 5 ? 0.55 : 1,
                          }}
                        >
                          {smsCooldownSeconds > 0
                            ? `Resend in 0:${String(smsCooldownSeconds).padStart(2, "0")}`
                            : smsResendCount >= 5
                              ? "Resend limit reached"
                              : "Resend OTP"}
                        </button>
                      </div>
                      {smsError && (
                        <div className="ly-error mt-2" role="alert">
                          {smsError}
                        </div>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <button
                        type="submit"
                        className="ly-btn ly-btn-primary signin-submit"
                        disabled={busy || smsOtp.length !== 6 || smsExpired}
                      >
                        {busy ? (
                          <>
                            <SpinnerIcon /> Verifying…
                          </>
                        ) : pending.account.totpEnabled ? (
                          "Verify SMS & continue to 2FA →"
                        ) : (
                          "Verify & sign in →"
                        )}
                      </button>
                      <button
                        type="button"
                        className="ly-btn ly-btn-ghost"
                        disabled={busy}
                        onClick={backToCredentials}
                      >
                        ← Use a different phone or email
                      </button>
                    </div>
                  </form>
                )}

                {/* S4 — INLINE 2FA CHALLENGE (TOTP, 6-digit auto-advance, 30s window) */}
                {stage === "totp" && pending && (
                  <form
                    className="signin-form"
                    noValidate
                    onSubmit={(e) => {
                      e.preventDefault();
                      verifyTotp();
                    }}
                  >
                    <div className="signin-totp-panel" role="region" aria-label="Two-factor authentication challenge">
                      <div className="signin-totp-header">
                        <div className="flex items-start gap-3">
                          <span className="signin-totp-icon" aria-hidden>
                            <ShieldKeyIcon />
                          </span>
                          <div>
                            <div className="ly-eyebrow">2FA TOTP challenge</div>
                            <h2 className="font-display m-0" style={{ fontSize: "1.25rem" }}>
                              {pending.account.fullName}
                            </h2>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <span
                                className="ly-chip"
                                style={{ padding: "0.15rem 0.6rem", fontSize: "var(--fs-label)" }}
                              >
                                {pending.account.role === "admin"
                                  ? pending.account.staffRoleLabel
                                  : "Student · 2FA enabled"}
                              </span>
                              <span className="ly-hint font-mono">
                                {maskIdentifier(pending.identifierRaw)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {!useRecovery ? (
                        <>
                          <p className="mb-2 mt-0 text-sm" style={{ color: "var(--text-secondary)" }}>
                            Open your authenticator app (Google Authenticator, Authy or 1Password) and enter the current 6-digit TOTP code.
                          </p>

                          <div className="totp-timer-wrap">
                            <div className="totp-timer-meta">
                              <span className="flex items-center gap-2">
                                <span className="ly-pulse" aria-hidden />
                                <span>30-second TOTP window</span>
                              </span>
                              <span className="font-mono font-semibold" aria-live="off">
                                Refreshes in {totpRemaining}s
                              </span>
                            </div>
                            <div
                              className="totp-progress-track"
                              role="progressbar"
                              aria-label="Seconds remaining in 30-second authenticator window"
                              aria-valuemin={0}
                              aria-valuemax={TOTP_WINDOW_SECONDS}
                              aria-valuenow={totpRemaining}
                            >
                              <div
                                className={`totp-progress-bar ${totpRemaining <= 7 ? "is-low" : ""}`}
                                style={{ width: `${totpPercent}%` }}
                              />
                            </div>
                          </div>

                          <label className="ly-label" htmlFor="signin-totp-0">
                            6-digit authenticator code
                          </label>
                          <OTPInput
                            idPrefix="signin-totp"
                            ariaLabel="Six-digit two-factor authenticator code"
                            value={totpCode}
                            onChange={(v) => {
                              setTotpCode(v);
                              setTotpError("");
                            }}
                            disabled={busy}
                            invalid={!!totpError}
                          />

                          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                            <button
                              type="button"
                              className="signin-inline-link"
                              onClick={() => {
                                setTotpCode(TOTP_PREVIEW_CODE);
                                setTotpError("");
                              }}
                            >
                              Use preview TOTP {TOTP_PREVIEW_CODE} →
                            </button>
                            <button
                              type="button"
                              className="signin-inline-link"
                              onClick={() => {
                                setUseRecovery(true);
                                setTotpError("");
                              }}
                            >
                              Use a recovery code instead
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="grid gap-3">
                          <div className="ly-field">
                            <label className="ly-label" htmlFor="signin-recovery">
                              One-time recovery code
                            </label>
                            <input
                              id="signin-recovery"
                              className={`ly-input font-mono ${totpError ? "is-invalid" : ""}`}
                              value={recoveryCode}
                              onChange={(e) => {
                                setRecoveryCode(e.target.value.toUpperCase());
                                setTotpError("");
                              }}
                              placeholder="LY-8492-K9"
                              autoComplete="one-time-code"
                              aria-invalid={!!totpError}
                            />
                            <span className="ly-hint">
                              Each recovery code works once. Preview code:{" "}
                              <button
                                type="button"
                                className="signin-inline-link font-mono"
                                style={{ fontSize: "var(--fs-label)" }}
                                onClick={() => {
                                  setRecoveryCode(TOTP_RECOVERY_PREVIEW_CODE);
                                  setTotpError("");
                                }}
                              >
                                {TOTP_RECOVERY_PREVIEW_CODE}
                              </button>
                            </span>
                          </div>
                          <div>
                            <button
                              type="button"
                              className="signin-inline-link"
                              onClick={() => {
                                setUseRecovery(false);
                                setTotpError("");
                              }}
                            >
                              ← Back to 6-digit authenticator code
                            </button>
                          </div>
                        </div>
                      )}

                      {totpError && (
                        <div className="ly-error mt-3" role="alert">
                          {totpError}
                        </div>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <button
                        type="submit"
                        className="ly-btn ly-btn-primary signin-submit"
                        disabled={busy || (!useRecovery && totpCode.length !== 6) || (useRecovery && !recoveryCode.trim())}
                      >
                        {busy ? (
                          <>
                            <SpinnerIcon /> Verifying 2FA…
                          </>
                        ) : (
                          "Verify 2FA & sign in →"
                        )}
                      </button>
                      <button
                        type="button"
                        className="ly-btn ly-btn-ghost"
                        disabled={busy}
                        onClick={backToCredentials}
                      >
                        ← Switch account
                      </button>
                    </div>
                  </form>
                )}

                {/* ROLE-AWARE REDIRECT READY STATE */}
                {stage === "redirect" && session && (
                  <div className="signin-redirect-box">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2
                        ref={redirectHeading}
                        tabIndex={-1}
                        className="font-display m-0"
                        style={{ fontSize: "1.5rem" }}
                      >
                        Signed in as {session.fullName}
                      </h2>
                      <div className="flex flex-wrap gap-1.5">
                        <span
                          className="ly-chip ly-status-approved"
                          style={{ padding: "0.2rem 0.65rem", fontSize: "var(--fs-label)" }}
                        >
                          {session.role === "admin" ? session.staffRoleLabel : "Student"}
                        </span>
                        {session.verified2fa && (
                          <span
                            className="ly-chip ly-status-disbursed"
                            style={{ padding: "0.2rem 0.65rem", fontSize: "var(--fs-label)" }}
                          >
                            2FA verified
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="signin-route-target">
                      <div className="ly-eyebrow mb-1">Role-aware redirect destination</div>
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <strong className="font-display" style={{ fontSize: "1.15rem" }}>
                          {session.targetPageName}
                        </strong>
                        <span className="font-mono text-sm" style={{ color: "var(--brand-ink)", fontWeight: 700 }}>
                          {session.targetRoute}
                        </span>
                      </div>
                      <p className="mt-2 mb-0 text-sm" style={{ color: "var(--text-secondary)" }}>
                        {session.role === "admin"
                          ? `Admin sessions route to AD-1 with RBAC scope enforced (${session.dataScope}). ${session.permissionSummary}.`
                          : `Student sessions route to S-1 showing profile completeness, active financial assistance requests, and recent payouts.`}
                      </p>
                    </div>

                    <div className="signin-session-summary">
                      <div className="signin-summary-row">
                        <span>Signed in via</span>
                        <strong>{session.authMethod === "otp" ? "Passwordless SMS OTP" : "Password"}{session.verified2fa ? " + TOTP 2FA" : ""}</strong>
                      </div>
                      <div className="signin-summary-row">
                        <span>Masked identifier</span>
                        <strong className="font-mono">{session.identifierMasked}</strong>
                      </div>
                      {session.role === "student" && session.eduLevel && (
                        <div className="signin-summary-row">
                          <span>Academic level</span>
                          <strong>
                            <span className={`ly-edu-badge ly-edu-badge-${session.eduLevel} mr-2`}>
                              {eduLevelLabel(session.eduLevel)}
                            </span>
                            {session.school}
                          </strong>
                        </div>
                      )}
                      {session.role === "admin" && session.dataScope && (
                        <div className="signin-summary-row">
                          <span>RBAC data scope</span>
                          <strong className="font-mono">{session.dataScope}</strong>
                        </div>
                      )}
                      <div className="signin-summary-row">
                        <span>Session duration</span>
                        <strong>{session.remember30d ? "Remembered for 30 days" : "Current browser session"}</strong>
                      </div>
                    </div>

                    <p className="ly-hint m-0">
                      {session.role === "student"
                        ? "Your Student Overview is ready. Only non-sensitive session details are kept on this device — never your password or OTP."
                        : "The Admin Command Center (AD-1) is the next workspace to ship. Only non-sensitive session details are kept on this device — never your password or OTP."}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {session.role === "student" ? (
                        <a
                          href="/student"
                          className="ly-btn ly-btn-primary"
                          onClick={(e) => { e.preventDefault(); navigate("/student"); }}
                        >
                          Open Student Overview →
                        </a>
                      ) : (
                        <a
                          href="/"
                          className="ly-btn ly-btn-primary"
                          onClick={(e) => { e.preventDefault(); navigate("/"); }}
                        >
                          Explore Learnly →
                        </a>
                      )}
                      <a
                        href="/levels"
                        className="ly-btn ly-btn-outline"
                        onClick={(e) => { e.preventDefault(); navigate("/levels"); }}
                      >
                        Education levels
                      </a>
                      <button type="button" className="ly-btn ly-btn-ghost" onClick={signOutPreview}>
                        Sign out / switch account
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* S5 — FOOTER LINKS (sign up, forgot password, help) */}
              <div className="signin-card-footer">
                <span>New to Learnly?</span>
                <div className="signin-footer-links">
                  <a
                    href="/auth/signup"
                    onClick={(e) => { e.preventDefault(); navigate("/auth/signup"); }}
                  >
                    Create account
                  </a>
                  <span aria-hidden style={{ color: "var(--text-tertiary)" }}>·</span>
                  <button type="button" onClick={() => setForgot(true)}>
                    Forgot password?
                  </button>
                  <span aria-hidden style={{ color: "var(--text-tertiary)" }}>·</span>
                  <button type="button" onClick={() => setHelpOpen(true)}>
                    Help
                  </button>
                </div>
              </div>
            </section>

            {/* ===================== COMPANION COLUMN ===================== */}
            <aside className="signin-companion" aria-label="Role-aware sign-in preview and quick accounts">
              <Reveal>
                <div className="signin-side-card">
                  <div className="ly-eyebrow mb-2">Role-aware redirect</div>
                  <h2 className="font-display mb-3" style={{ fontSize: "var(--fs-h3)", marginTop: 0 }}>
                    One sign-in, tailored workspace
                  </h2>
                  <div className="grid gap-3">
                    <div className="signin-route-row">
                      <span className="signin-route-icon" aria-hidden>🎓</span>
                      <div>
                        <div className="font-semibold text-sm">Students &amp; Guardians</div>
                        <div className="ly-hint">Fees, upkeep, result slips &amp; payout receipts</div>
                      </div>
                      <span className="font-mono text-xs font-bold" style={{ color: "var(--brand-ink)" }}>/student</span>
                    </div>
                    <div className="signin-route-row">
                      <span className="signin-route-icon" aria-hidden>📋</span>
                      <div>
                        <div className="font-semibold text-sm">Sponsor &amp; School Staff</div>
                        <div className="ly-hint">RBAC-scoped approvals, Daraja payouts &amp; audit</div>
                      </div>
                      <span className="font-mono text-xs font-bold" style={{ color: "var(--brand-ink)" }}>/admin</span>
                    </div>
                  </div>
                </div>
              </Reveal>

              <Reveal delay={80}>
                <div className="signin-side-card">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div>
                      <div className="ly-eyebrow mb-1">Interactive preview</div>
                      <h2 className="font-display m-0" style={{ fontSize: "1.15rem" }}>
                        Try a Kenyan account
                      </h2>
                    </div>
                    <button
                      type="button"
                      className="signin-inline-link"
                      onClick={() => setDirectoryOpen(true)}
                    >
                      All {SIGNIN_PREVIEW_ACCOUNTS.length} →
                    </button>
                  </div>
                  <p className="mb-3 mt-0 text-sm" style={{ color: "var(--text-secondary)" }}>
                    Tap any account to prefill the form and test direct student sign-in, passwordless OTP, or inline TOTP 2FA.
                  </p>
                  <div className="grid gap-2">
                    {SIGNIN_QUICK_PRESETS.map((preset) => {
                      const selected = matchedPreview?.id === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          className={`preset-account-btn ${selected ? "is-active" : ""}`}
                          onClick={() => applyPresetAccount(preset)}
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-sm truncate">{preset.fullName}</div>
                            <div className="ly-hint truncate">
                              {preset.role === "admin"
                                ? `${preset.staffRoleLabel} · ${preset.dataScope}`
                                : `${preset.school} · ${preset.gradeLabel}`}
                            </div>
                          </div>
                          <span
                            className={`ly-chip flex-shrink-0 ${preset.totpEnabled ? "ly-status-pending" : "ly-status-approved"}`}
                            style={{ padding: "0.18rem 0.55rem", fontSize: "var(--fs-label)" }}
                          >
                            {preset.totpEnabled ? "2FA" : "Direct"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3 ly-hint">
                    Preview codes: SMS OTP <span className="font-mono font-semibold">{OTP_PREVIEW_CODE}</span> · 2FA TOTP{" "}
                    <span className="font-mono font-semibold">{TOTP_PREVIEW_CODE}</span> · Recovery{" "}
                    <span className="font-mono font-semibold">{TOTP_RECOVERY_PREVIEW_CODE}</span>.
                  </div>
                </div>
              </Reveal>

              <Reveal delay={140}>
                <div className="signin-side-card">
                  <blockquote className="ly-quote m-0" style={{ fontSize: "0.98rem" }}>
                    “Two-factor verification on finance approvals and direct school paybill rails mean every sponsor shilling is auditable.”
                  </blockquote>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="ly-chip" style={{ padding: "0.25rem 0.65rem", fontSize: "var(--fs-label)" }}>
                      Africa's Talking OTP
                    </span>
                    <span className="ly-chip" style={{ padding: "0.25rem 0.65rem", fontSize: "var(--fs-label)" }}>
                      ODPC Compliant
                    </span>
                    <span className="ly-chip" style={{ padding: "0.25rem 0.65rem", fontSize: "var(--fs-label)" }}>
                      RBAC 6 roles
                    </span>
                  </div>
                </div>
              </Reveal>
            </aside>
          </div>
        </div>
      </main>

      {/* Full 12-account preview directory dialog */}
      <Dialog
        open={directoryOpen}
        onClose={() => setDirectoryOpen(false)}
        eyebrow="Kenyan preview accounts"
        title="All 12 Student & RBAC Staff Profiles"
        maxWidth={660}
        footer={
          <button type="button" className="ly-btn ly-btn-primary" onClick={() => setDirectoryOpen(false)}>
            Close
          </button>
        }
      >
        <div className="grid gap-2">
          {SIGNIN_PREVIEW_ACCOUNTS.map((acc) => (
            <button
              key={acc.id}
              type="button"
              className="preset-account-btn"
              onClick={() => applyPresetAccount(acc)}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-sm">{acc.fullName}</span>
                  {acc.eduLevel ? (
                    <span className={`ly-edu-badge ly-edu-badge-${acc.eduLevel}`}>{eduLevelLabel(acc.eduLevel)}</span>
                  ) : (
                    <span className="ly-chip" style={{ padding: "0.1rem 0.5rem", fontSize: "var(--fs-label)" }}>
                      {acc.staffRoleLabel}
                    </span>
                  )}
                </div>
                <div className="ly-hint mt-1">
                  {acc.role === "admin" ? acc.dataScope : `${acc.school} · ${acc.gradeLabel}`}
                </div>
                <div className="font-mono mt-0.5" style={{ fontSize: "var(--fs-label)", color: "var(--text-tertiary)" }}>
                  {acc.phone} · {acc.email}
                </div>
              </div>
              <span
                className={`ly-chip flex-shrink-0 ${acc.totpEnabled ? "ly-status-pending" : "ly-status-approved"}`}
                style={{ padding: "0.18rem 0.55rem", fontSize: "var(--fs-label)" }}
              >
                {acc.totpEnabled ? "2FA TOTP" : "Direct"}
              </span>
            </button>
          ))}
        </div>
      </Dialog>

      {/* Sign-in Help Dialog (S5) */}
      <Dialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        eyebrow="Sign-in help"
        title="Having trouble signing in?"
        footer={
          <>
            <button
              type="button"
              className="ly-btn ly-btn-outline"
              onClick={() => {
                setHelpOpen(false);
                setForgot(true);
              }}
            >
              Reset password
            </button>
            <button type="button" className="ly-btn ly-btn-primary" onClick={() => setHelpOpen(false)}>
              Got it
            </button>
          </>
        }
      >
        <div className="grid gap-3 text-sm" style={{ color: "var(--text-secondary)" }}>
          <p className="m-0">
            <strong style={{ color: "var(--text-primary)" }}>Forgot your password?</strong> Switch to{" "}
            <strong>Sign in with OTP instead</strong> for instant SMS access, or use{" "}
            <strong>Forgot password</strong> to rotate your password and invalidate old sessions.
          </p>
          <p className="m-0">
            <strong style={{ color: "var(--text-primary)" }}>Lost your 2FA authenticator device?</strong> Enter one of the single-use recovery codes saved when you enabled 2FA. For staff accounts, a Super Admin can revoke your 2FA from AD-7 (audit-logged).
          </p>
          <p className="m-0">
            <strong style={{ color: "var(--text-primary)" }}>SMS OTP not arriving?</strong> Confirm your Kenyan line is active (<span className="font-mono">+2547XX</span> / <span className="font-mono">+2541XX</span>) and wait 60 seconds before requesting a resend.
          </p>
          <a href="mailto:hello@learnly.co.ke" className="ly-btn ly-btn-outline self-start">
            Contact Nairobi support (hello@learnly.co.ke) →
          </a>
        </div>
      </Dialog>

      <ForgotDialog open={forgot} onClose={() => setForgot(false)} />
      <LegalDialog which={legal} onClose={() => setLegal(null)} />
    </AuthShell>
  );
}

function KeyIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="7.5" cy="15.5" r="4.5" />
      <path d="m21 2-9.6 9.6M15.5 7.5 19 11" />
    </svg>
  );
}
function SmsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="6" y="2" width="12" height="20" rx="3" />
      <path d="M10 18h4" />
    </svg>
  );
}
function ShieldKeyIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Z" />
      <circle cx="12" cy="11" r="2" />
      <path d="M12 13v3" />
    </svg>
  );
}
function EyeIcon({ visible }: { visible: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {visible ? (
        <path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.5 5.4A11 11 0 0 1 12 5c6 0 10 7 10 7a18 18 0 0 1-3 3.8M6.2 6.2A20 20 0 0 0 2 12s4 7 10 7a11 11 0 0 0 5.8-1.8" />
      ) : (
        <>
          <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}
