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
import AdminCommandCenter from "./pages/admin/CommandCenter";
import StudentProfile from "./pages/student/Profile";
import StudentFinancialAssistance from "./pages/student/FinancialAssistance";
import StudentAcademicRecords from "./pages/student/AcademicRecords";
import { SettingsPage, HelpPage } from "./pages/student/SettingsHelp";
import { RelatedUsersPage, AccountPage, DocumentsPage, MessagesPage, NotificationsPage } from "./pages/student/WorkspacePages";

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
      "/admin": "Admin Command Center — Learnly",
      "/admin/students": "Student Management — Learnly",
      "/admin/approvals": "Approvals — Learnly",
      "/admin/disbursements": "Disbursements — Learnly",
      "/admin/academic-verification": "Academic Verification — Learnly",
      "/admin/schools": "Schools & Institutions — Learnly",
      "/student/profile": "My Profile — Student Record | Learnly",
      "/student/financial-assistance": "Financial Assistance — Learnly",
      "/student/academic-records": "Academic Records — Learnly",
      "/student/related-users": "Related Users — Learnly",
      "/student/account": "Account & Payout Methods — Learnly",
      "/student/documents": "Documents — Learnly",
      "/student/messages": "Messages — Learnly",
      "/student/notifications": "Notifications — Learnly",
      "/student/settings": "Settings — Learnly",
      "/student/help": "Help & Support — Learnly",
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
    ) : ["/admin", "/admin/students", "/admin/approvals", "/admin/disbursements", "/admin/academic-verification", "/admin/schools"].includes(pathname) ? (
      <AdminCommandCenter />
    ) : pathname === "/student/settings" ? (
      <SettingsPage />
    ) : pathname === "/student/help" ? (
      <HelpPage />
    ) : pathname === "/student/related-users" ? (
      <RelatedUsersPage />
    ) : pathname === "/student/account" ? (
      <AccountPage />
    ) : pathname === "/student/documents" ? (
      <DocumentsPage />
    ) : pathname === "/student/messages" ? (
      <MessagesPage />
    ) : pathname === "/student/notifications" ? (
      <NotificationsPage />
    ) : pathname === "/student/academic-records" ? (
      <StudentAcademicRecords />
    ) : pathname === "/student/financial-assistance" ? (
      <StudentFinancialAssistance />
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
