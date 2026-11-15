import { useEffect, useState, type ReactNode } from "react";
import { AUTH_NAV } from "../../data/auth";
import { navigate, usePathname } from "../../lib/navigation";
import { LearnlyLogo } from "../marketing/LearnlyLogo";
import { Dialog } from "../ui/primitives";
import type { LegalKey } from "../marketing/LandingDialogs";

interface Props {
  children: ReactNode;
  onSignIn?: () => void;
  onLegal: (key: LegalKey) => void;
  className?: string;
}

/** Shared A-group shell. Reused across A-1, A-2, and future auth routes. */
export function AuthShell({ children, onSignIn, onLegal, className = "" }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem("ly-theme") === "dark");

  useEffect(() => {
    document.documentElement.setAttribute("data-bs-theme", dark ? "dark" : "light");
    localStorage.setItem("ly-theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setDark(document.documentElement.getAttribute("data-bs-theme") === "dark");
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-bs-theme"] });
    return () => observer.disconnect();
  }, []);

  const go = (to: string) => {
    setOpen(false);
    navigate(to);
  };

  const isSignInPage = pathname === "/auth/signin";

  return (
    <div className={`auth-shell ${className} min-h-screen flex flex-col`}>
      <header className="auth-topbar">
        <div className="auth-topbar-inner">
          <a href="/" className="no-underline" aria-label="Learnly home" onClick={(e) => { e.preventDefault(); go("/"); }}>
            <LearnlyLogo size={28} />
          </a>

          <nav className="auth-nav" aria-label="Account navigation">
            {AUTH_NAV.filter((item) => item.ready).map((item) => {
              const active = pathname === item.route;
              return (
                <a
                  key={item.id}
                  href={item.route}
                  className={`ly-btn ly-btn-ghost ly-btn-sm ${active ? "is-active" : ""}`}
                  aria-current={active ? "page" : undefined}
                  onClick={(e) => { e.preventDefault(); go(item.route); }}
                >
                  {item.label}
                </a>
              );
            })}
            <a href="/" className="ly-btn ly-btn-ghost ly-btn-sm" onClick={(e) => { e.preventDefault(); go("/"); }}>
              Explore Learnly →
            </a>
          </nav>

          <div className="flex items-center gap-2">
            {isSignInPage ? (
              <>
                <span className="auth-member-prompt">New to Learnly?</span>
                <a
                  href="/auth/signup"
                  className="ly-btn ly-btn-primary ly-btn-sm"
                  onClick={(e) => { e.preventDefault(); go("/auth/signup"); }}
                >
                  Create account
                </a>
              </>
            ) : (
              <>
                <span className="auth-member-prompt">Already a member?</span>
                {onSignIn ? (
                  <button className="ly-btn ly-btn-outline ly-btn-sm" onClick={() => { setOpen(false); onSignIn(); }}>
                    Sign in
                  </button>
                ) : (
                  <a
                    href="/auth/signin"
                    className="ly-btn ly-btn-outline ly-btn-sm"
                    onClick={(e) => { e.preventDefault(); go("/auth/signin"); }}
                  >
                    Sign in
                  </a>
                )}
              </>
            )}
            <button
              className="ly-icon-btn auth-theme-toggle"
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
              onClick={() => setDark((d) => !d)}
            >
              {dark ? <SunIcon /> : <MoonIcon />}
            </button>
            <button
              className="ly-icon-btn auth-mobile-toggle"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
            >
              {open ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>

        {open && (
          <nav className="auth-mobile-menu" aria-label="Mobile account navigation">
            <div className="grid gap-1 p-4">
              <button className="ly-btn ly-btn-ghost justify-start" onClick={() => go("/")}>Explore Learnly</button>
              <button className="ly-btn ly-btn-ghost justify-start" onClick={() => go("/levels")}>Education levels</button>
              <button className="ly-btn ly-btn-ghost justify-start" onClick={() => go("/how-it-works")}>How it works</button>
              <button
                className={`ly-btn justify-start ${isSignInPage ? "ly-btn-primary" : "ly-btn-outline"}`}
                onClick={() => go("/auth/signin")}
              >
                Sign in
              </button>
              <button
                className={`ly-btn justify-start ${!isSignInPage ? "ly-btn-primary" : "ly-btn-outline"}`}
                onClick={() => go("/auth/signup")}
              >
                Create account
              </button>
            </div>
          </nav>
        )}
      </header>

      <div className="auth-content flex-1">{children}</div>

      <footer className="auth-footer">
        <div className="auth-footer-inner">
          <span>© {new Date().getFullYear()} Learnly · Nairobi, Kenya</span>
          <div className="flex flex-wrap items-center gap-4">
            <button className="footer-link" onClick={() => setHelp(true)}>Need help?</button>
            <button className="footer-link" onClick={() => onLegal("privacy")}>Privacy</button>
            <button className="footer-link" onClick={() => onLegal("terms")}>Terms</button>
            <button className="footer-link" onClick={() => onLegal("dpa")}>DPA 2019 Notice</button>
          </div>
        </div>
      </footer>

      <Dialog
        open={help}
        onClose={() => setHelp(false)}
        eyebrow="Account support"
        title={isSignInPage ? "Need help signing in?" : "Let's get you started"}
        footer={<button className="ly-btn ly-btn-primary" onClick={() => setHelp(false)}>Got it</button>}
      >
        <div className="grid gap-3 text-sm" style={{ color: "var(--text-secondary)" }}>
          <p>
            <strong style={{ color: "var(--text-primary)" }}>Student or parent?</strong> Sign in with the Kenyan mobile number
            (<span className="font-mono">+2547XX</span> or <span className="font-mono">07XX</span>) or email on your learner profile.
            You can switch to <strong>Sign in with OTP instead</strong> for a passwordless SMS code.
          </p>
          <p>
            <strong style={{ color: "var(--text-primary)" }}>Sponsor or staff with 2FA?</strong> After entering your password or SMS OTP,
            complete the inline 6-digit authenticator challenge (or use a recovery code). If you lost your authenticator device, a Super Admin can revoke and reset your 2FA.
          </p>
          <p>
            This is an interactive frontend preview. No SMS is sent. Use SMS OTP <span className="font-mono">123456</span> and
            authenticator 2FA code <span className="font-mono">246810</span> (recovery code <span className="font-mono">LY-8492-K9</span>).
            Passwords and secrets are never stored.
          </p>
          <a href="mailto:hello@learnly.co.ke" className="ly-btn ly-btn-outline self-start">Email hello@learnly.co.ke →</a>
        </div>
      </Dialog>
    </div>
  );
}

function MoonIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" /></svg>;
}
function SunIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>;
}
function MenuIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden><path d="M3 6h18M3 12h18M3 18h18" /></svg>;
}
function CloseIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden><path d="M18 6 6 18M6 6l12 12" /></svg>;
}
