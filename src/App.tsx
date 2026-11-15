import { useEffect } from "react";
import { ToastProvider } from "./components/ui/primitives";
import { StudentProvider } from "./components/student/StudentStore";
import { scrollToHash, usePathname } from "./lib/navigation";
import Landing from "./pages/Landing";
import Levels from "./pages/Levels";
import HowItWorks from "./pages/HowItWorks";
import Signup from "./pages/auth/Signup";
import Signin from "./pages/auth/Signin";
import StudentOverview from "./pages/student/Overview";
import StudentProfile from "./pages/student/Profile";

/** H-pages, auth pages (A-1, A-2) and the student workspace (S-1, S-2). */
export default function App() {
  const pathname = usePathname();

  useEffect(() => {
    const titles: Record<string, string> = {
      "/": "Learnly — Sponsor a learner. From PP1 to PhD.",
      "/levels": "Education Levels in Kenya — PP1 to PhD | Learnly",
      "/how-it-works": "How Learnly Works — Onboarding, Proof & Payouts | Learnly",
      "/auth/signup": "Create Your Account — Student & Sponsor Sign Up | Learnly",
      "/auth/signin": "Sign In — Student & Admin Login | Learnly",
      "/student": "Student Overview — My Sponsorship Dashboard | Learnly",
      "/student/profile": "My Profile — Student Record | Learnly",
    };
    document.title = titles[pathname] ?? titles["/"];

    const timer = window.setTimeout(() => {
      if (window.location.hash) scrollToHash(window.location.hash);
      else window.scrollTo({ top: 0, behavior: "auto" });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  const page =
    pathname === "/levels" ? (
      <Levels />
    ) : pathname === "/how-it-works" ? (
      <HowItWorks />
    ) : pathname === "/auth/signup" ? (
      <Signup />
    ) : pathname === "/auth/signin" ? (
      <Signin />
    ) : pathname === "/student/profile" ? (
      <StudentProfile />
    ) : pathname === "/student" ? (
      <StudentOverview />
    ) : (
      <Landing />
    );

  const body = <ToastProvider key={pathname}>{page}</ToastProvider>;
  // One store for every student page, so edits made on one page are still there on the next.
  return pathname.startsWith("/student") ? <StudentProvider>{body}</StudentProvider> : body;
}
