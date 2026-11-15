import { useEffect, useState } from "react";

/** Navigate to a real app URL without requiring a full page reload. */
export function navigate(to: string) {
  const url = new URL(to, window.location.origin);
  const current = `${window.location.pathname}${window.location.hash}`;

  if (url.pathname === window.location.pathname && url.hash && url.hash === window.location.hash) {
    scrollToHash(url.hash);
    return;
  }

  window.history.pushState({}, "", `${url.pathname}${url.hash}`);
  window.dispatchEvent(new PopStateEvent("popstate"));

  if (url.hash) {
    window.setTimeout(() => scrollToHash(url.hash), 60);
  } else if (current !== `${url.pathname}${url.hash}`) {
    window.scrollTo({ top: 0, behavior: "auto" });
  }
}

export function scrollToHash(hash: string) {
  const target = document.getElementById(hash.replace(/^#/, ""));
  target?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function usePathname() {
  const [pathname, setPathname] = useState(window.location.pathname);

  useEffect(() => {
    const update = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);

  return pathname.replace(/\/+$/, "") || "/";
}
