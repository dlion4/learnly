import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Confetti, Dropdown } from "../ui/overlays";
import { Icon } from "../ui/Icon";
import { useOverlay } from "../ui/primitives";
import { LearnlyLogo } from "../marketing/LearnlyLogo";
import { useStudent, type PanelKey } from "../student/StudentStore";
import { AddProofModal, CapsModal, ExportDialog, NewRequestWizard, RequestDrawer, WithdrawDialog } from "../student/RequestFlows";
import { AddMethodWizard, ChartModal, PayoutDrawer, ReceiptModal, RemoveMethodDialog, ReportIssueModal } from "../student/PayoutFlows";
import {
  CompletenessModal, DataExportDialog, DocPreviewDialog, EduLevelModal, HelpDialog, RelatedUserDialog, SignOutDialog,
  TermCalendarModal, UploadDocumentModal,
} from "../student/RecordFlows";
import {
  AcademicPanel, AccountPanel, DocumentsPanel, FinancialPanel, MessagesPanel, NotificationsPanel, RelatedPanel, SettingsPanel,
} from "../student/WorkspacePanels";
import { isActiveRequest } from "../../data/requests";
import { eduLevelColor, eduLevelLabel, relativeTime } from "../../data/students";
import { navigate, usePathname } from "../../lib/navigation";

/**
 * Student nav config. `ready: true` items are real routes. Pages that have not
 * shipped yet never render as links — they open their real in-page panel instead.
 */
export const STUDENT_NAV: { id: string; icon: string; route: string; ready: boolean; panel?: PanelKey }[] = [
  { id: "overview", icon: "home", route: "/student", ready: true },
  { id: "profile", icon: "user", route: "/student/profile", ready: true },
  { id: "financial", icon: "wallet", route: "/student/financial-assistance", ready: false, panel: "financial" },
  { id: "academic", icon: "book", route: "/student/academic-records", ready: false, panel: "academic" },
  { id: "related", icon: "users", route: "/student/related-users", ready: false, panel: "related" },
  { id: "account", icon: "card", route: "/student/account", ready: false, panel: "account" },
  { id: "documents", icon: "file", route: "/student/documents", ready: false, panel: "documents" },
  { id: "messages", icon: "chat", route: "/student/messages", ready: false, panel: "messages" },
  { id: "notifications", icon: "bell", route: "/student/notifications", ready: false, panel: "notifications" },
  { id: "settings", icon: "settings", route: "/student/settings", ready: false, panel: "settings" },
];

export function StudentShell({ children, pageClass }: { children: ReactNode; pageClass: string }) {
  // The provider is mounted once by App for every /student route, so state survives navigation.
  return <ShellFrame pageClass={pageClass}>{children}</ShellFrame>;
}

function ShellFrame({ children, pageClass }: { children: ReactNode; pageClass: string }) {
  const s = useStudent();
  const pathname = usePathname();
  useEffect(() => {
    s.closeAll();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [menu, setMenu] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem("ly-theme") === "dark");
  const closeMenu = useCallback(() => setMenu(false), []);
  useOverlay(menu, closeMenu);

  useEffect(() => {
    document.documentElement.setAttribute("data-bs-theme", dark ? "dark" : "light");
    localStorage.setItem("ly-theme", dark ? "dark" : "light");
  }, [dark]);
  useEffect(() => {
    const observer = new MutationObserver(() => setDark(document.documentElement.getAttribute("data-bs-theme") === "dark"));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-bs-theme"] });
    return () => observer.disconnect();
  }, []);

  const badges: Partial<Record<string, number>> = {
    financial: s.requests.filter(isActiveRequest).length,
    messages: s.unreadMessages,
    notifications: s.unreadNotifications,
  };
  const st = s.student;

  return (
    <div className={`student-shell ${pageClass}`}>
      {menu && <button type="button" className="student-backdrop" aria-label="Close menu" onClick={closeMenu} />}
      <aside className={`student-sidebar ${menu ? "is-open" : ""}`} aria-label="Student navigation">
        <div className="flex items-center justify-between gap-2 px-2">
          <a href="/" aria-label="Learnly home" className="no-underline" onClick={(e) => { e.preventDefault(); navigate("/"); }}>
            <LearnlyLogo size={28} />
          </a>
          <button type="button" className="ly-icon-btn student-menu-toggle" aria-label="Close menu" onClick={closeMenu}><Icon name="x" size={16} /></button>
        </div>

        <button type="button" className="student-id-card" onClick={() => { closeMenu(); s.open("profile"); }}>
          <span className="ly-avatar">{st.initials}</span>
          <span className="min-w-0">
            <span className="block truncate font-semibold" style={{ fontSize: 14 }}>{st.fullName}</span>
            <span className="ly-hint block truncate">{st.grade} · {st.school}</span>
          </span>
        </button>

        <nav className="student-nav" aria-label="Student sections">
          <div className="student-nav-label">Workspace</div>
          {STUDENT_NAV.map((item) => {
            const badge = badges[item.id];
            const inner = (
              <>
                <Icon name={item.icon} size={18} />
                <span>{s.t(item.id)}</span>
                {!!badge && <span className="ly-badge-count">{badge}</span>}
              </>
            );
            return item.ready ? (
              <a key={item.id} href={item.route} className={`student-nav-item ${pathname === item.route ? "is-active" : ""}`} aria-current={pathname === item.route ? "page" : undefined}
                onClick={(e) => { e.preventDefault(); closeMenu(); navigate(item.route); }}>
                {inner}
              </a>
            ) : (
              <button key={item.id} type="button" className="student-nav-item" onClick={() => { closeMenu(); if (item.panel) s.open(item.panel); }}>
                {inner}
              </button>
            );
          })}
        </nav>

        <div className="student-nav mt-auto">
          <button type="button" className="student-nav-item" onClick={() => { closeMenu(); s.open("help"); }}><Icon name="help" size={18} /><span>{s.t("help")}</span></button>
          <button type="button" className="student-nav-item" onClick={() => { closeMenu(); s.open("signOut"); }}><Icon name="logout" size={18} /><span>{s.t("signOut")}</span></button>
          <div className="ly-hint px-3 pt-2">Sponsor: {st.sponsor}</div>
        </div>
      </aside>

      <div className="student-main">
        <div className="student-ribbon" style={{ ["--ribbon" as string]: eduLevelColor(st.eduLevel) }} title={eduLevelLabel(st.eduLevel)} />
        <header className="student-topbar">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" className="ly-icon-btn student-menu-toggle" aria-label="Open menu" aria-expanded={menu} onClick={() => setMenu(true)}><Icon name="menu" size={18} /></button>
            <div className="student-topbar-title min-w-0 truncate font-display" style={{ fontSize: "1.05rem" }}>
              Learnly Student <span style={{ color: "var(--text-tertiary)" }}>· {st.firstName}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button type="button" className="ly-btn ly-btn-primary ly-btn-sm" onClick={() => s.open("newRequest")}>
              <Icon name="plus" size={15} /> <span className="student-new-label">{s.t("newRequest")}</span>
            </button>

            <Dropdown label={`Notifications, ${s.unreadNotifications} unread`} width={360} triggerClassName="ly-icon-btn student-topbar-btn" trigger={<><Icon name="bell" size={17} />{s.unreadNotifications > 0 && <span className="ly-badge-count">{s.unreadNotifications}</span>}</>}>
              {(close) => (
                <>
                  <div className="ly-menu-head">
                    <strong>Notifications</strong>
                    <button type="button" className="ly-link-btn" disabled={s.unreadNotifications === 0} onClick={s.markAllRead}>Mark all read</button>
                  </div>
                  {s.notifications.slice(0, 5).map((n) => (
                    <button key={n.id} type="button" role="menuitem" className={`ly-menu-row ${n.read ? "" : "is-unread"}`} onClick={() => { close(); s.markRead(n.id); s.openLink(n.link); }}>
                      <span className={`ly-pulse ${n.read ? "" : "ly-pulse-warn"}`} style={{ marginTop: 6, visibility: n.read ? "hidden" : "visible" }} aria-hidden />
                      <span className="min-w-0">
                        <span className="block font-semibold" style={{ fontSize: 13 }}>{n.title}</span>
                        <span className="ly-hint block">{relativeTime(n.at)}</span>
                      </span>
                    </button>
                  ))}
                  <div className="ly-menu-sep" />
                  <button type="button" role="menuitem" className="ly-menu-item" onClick={() => { close(); s.open("notifications"); }}><Icon name="bell" size={16} /> View all notifications</button>
                </>
              )}
            </Dropdown>

            <Dropdown label={`Messages, ${s.unreadMessages} unread`} width={340} triggerClassName="ly-icon-btn student-topbar-btn" trigger={<><Icon name="chat" size={17} />{s.unreadMessages > 0 && <span className="ly-badge-count">{s.unreadMessages}</span>}</>}>
              {(close) => (
                <>
                  <div className="ly-menu-head"><strong>Messages</strong></div>
                  {s.threads.slice(0, 4).map((th) => (
                    <button key={th.id} type="button" role="menuitem" className={`ly-menu-row ${th.unread ? "is-unread" : ""}`} onClick={() => { close(); s.open("messages", th.id); }}>
                      <span className="ly-avatar ly-avatar-soft" style={{ width: 30, height: 30, fontSize: 11 }}>{th.with.split(" ").map((w) => w[0]).slice(0, 2).join("")}</span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold" style={{ fontSize: 13 }}>{th.subject}</span>
                        <span className="ly-hint block truncate">{th.with}</span>
                      </span>
                    </button>
                  ))}
                  <div className="ly-menu-sep" />
                  <button type="button" role="menuitem" className="ly-menu-item" onClick={() => { close(); s.open("messages", "to:ru-10"); }}><Icon name="plus" size={16} /> New message</button>
                </>
              )}
            </Dropdown>

            <button type="button" className="ly-icon-btn" aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} onClick={() => setDark((d) => !d)}>
              <Icon name={dark ? "sun" : "moon"} size={16} />
            </button>

            <Dropdown label="Account menu" triggerClassName="student-profile-btn" trigger={<><span className="ly-avatar">{st.initials}</span><span className="name">{st.firstName}</span><Icon name="chevronDown" size={14} /></>} items={[
              { label: s.t("profile"), icon: "user", onSelect: () => s.open("profile") },
              { label: s.t("account"), icon: "card", onSelect: () => s.open("account") },
              { label: s.t("settings"), icon: "settings", onSelect: () => s.open("settings") },
              { label: s.t("help"), icon: "help", onSelect: () => s.open("help") },
              { label: s.t("signOut"), icon: "logout", danger: true, separatorBefore: true, onSelect: () => s.open("signOut") },
            ]} />
          </div>
        </header>

        <main className="student-content">{children}</main>
      </div>

      {/* Overlay host — panels, then entity drawers, then dialogs */}
      <FinancialPanel /><AcademicPanel /><RelatedPanel /><AccountPanel /><DocumentsPanel /><MessagesPanel /><NotificationsPanel /><SettingsPanel />
      <RequestDrawer /><PayoutDrawer />
      <CompletenessModal /><EduLevelModal /><CapsModal /><ChartModal /><TermCalendarModal /><ExportDialog />
      <NewRequestWizard /><WithdrawDialog /><AddProofModal /><ReceiptModal /><ReportIssueModal />
      <DocPreviewDialog /><UploadDocumentModal /><AddMethodWizard /><RemoveMethodDialog /><RelatedUserDialog />
      <DataExportDialog /><HelpDialog /><SignOutDialog />
      <Confetti show={s.confetti} />
    </div>
  );
}
