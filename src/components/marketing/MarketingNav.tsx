import { useEffect, useState } from "react";
import { navigate, scrollToHash, usePathname } from "../../lib/navigation";
import { LearnlyLogo } from "./LearnlyLogo";

/** Unbuilt routes stay anchored to real H-1 sections instead of becoming 404s. */
export const MARKETING_NAV = [
  { id: "levels", label: "Levels", route: "/levels", anchor: "#education-map", ready: true },
  { id: "how", label: "How it Works", route: "/how-it-works", anchor: "#how-it-works", ready: true },
] as const;

export function MarketingNav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem("ly-theme") === "dark");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

  const goAnchor = (anchor: string) => {
    setOpen(false);
    if (pathname === "/") scrollToHash(anchor);
    else navigate(`/${anchor}`);
  };

  const goItem = (item: (typeof MARKETING_NAV)[number]) => {
    setOpen(false);
    if (item.ready) navigate(item.route);
    else goAnchor(item.anchor);
  };

  const navItem = (item: (typeof MARKETING_NAV)[number], mobile = false) => {
    const className = `ly-btn ly-btn-ghost ${mobile ? "justify-start" : "ly-btn-sm"}`;
    const active = item.ready && pathname === item.route;
    const style = active ? { color: "var(--brand-primary)", background: "var(--brand-primary-soft)" } : undefined;
    return item.ready ? (
      <a
        key={item.id}
        href={item.route}
        className={className}
        style={style}
        aria-current={active ? "page" : undefined}
        onClick={(e) => {
          e.preventDefault();
          goItem(item);
        }}
      >
        {item.label}
      </a>
    ) : (
      <button key={item.id} className={className} onClick={() => goItem(item)}>
        {item.label}
      </button>
    );
  };

  return (
    <header
      className="sticky top-0 z-50 transition-all"
      style={{
        background: scrolled ? "color-mix(in srgb, var(--surface-0) 85%, transparent)" : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        borderBottom: scrolled ? "1px solid var(--border-subtle)" : "1px solid transparent",
      }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <a
          href="/"
          className="flex items-center gap-2 no-underline"
          onClick={(e) => {
            e.preventDefault();
            setOpen(false);
            navigate("/");
          }}
        >
          <LearnlyLogo />
        </a>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {MARKETING_NAV.map((item) => navItem(item))}
          <button className="ly-btn ly-btn-ghost ly-btn-sm" onClick={() => goAnchor("#features")}>
            Features
          </button>
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <button
            className="ly-icon-btn"
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            onClick={() => setDark((d) => !d)}
            title="Toggle dark mode"
          >
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>
          <a href="/auth/signin" className="ly-btn ly-btn-outline ly-btn-sm" onClick={(e) => { e.preventDefault(); setOpen(false); navigate("/auth/signin"); }}>
            Login
          </a>
          <a href="/auth/signup" className="ly-btn ly-btn-primary ly-btn-sm" onClick={(e) => { e.preventDefault(); setOpen(false); navigate("/auth/signup"); }}>
            Sign Up
          </a>
        </div>

        <button
          className="ly-icon-btn md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            {open ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
          </svg>
        </button>
      </div>

      {open && (
        <div
          className="md:hidden"
          style={{ background: "var(--surface-1)", borderTop: "1px solid var(--border-subtle)", boxShadow: "var(--shadow-3)" }}
        >
          <div className="flex flex-col gap-1 px-4 py-3">
            {MARKETING_NAV.map((item) => navItem(item, true))}
            <button className="ly-btn ly-btn-ghost justify-start" onClick={() => goAnchor("#features")}>
              Features
            </button>
            <div className="my-2" style={{ height: 1, background: "var(--border-subtle)" }} />
            <div className="flex items-center gap-2">
              <a href="/auth/signin" className="ly-btn ly-btn-outline flex-1" onClick={(e) => { e.preventDefault(); setOpen(false); navigate("/auth/signin"); }}>
                Login
              </a>
              <a href="/auth/signup" className="ly-btn ly-btn-primary flex-1" onClick={(e) => { e.preventDefault(); setOpen(false); navigate("/auth/signup"); }}>
                Sign Up
              </a>
              <button className="ly-icon-btn" aria-label="Toggle dark mode" onClick={() => setDark((d) => !d)}>
                {dark ? <SunIcon /> : <MoonIcon />}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  );
}
function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}
