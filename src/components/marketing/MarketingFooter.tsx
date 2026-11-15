import { LearnlyLogo } from "./LearnlyLogo";
import type { LegalKey } from "./LandingDialogs";

export function MarketingFooter({ onLegal, onNav }: { onLegal: (k: LegalKey) => void; onNav: (anchor: string) => void }) {
  return (
    <footer className="footer marketing-footer">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-12">
        <div className="md:col-span-5">
          <LearnlyLogo size={28} />
          <p className="mt-3 max-w-sm" style={{ color: "var(--text-secondary)" }}>
            The academic-sponsorship platform for Kenya. Fees, upkeep, pocket money and fare for every level — with proof, approvals and payouts.
          </p>
          <div className="mt-4 grid gap-1">
            <span>📍 Nairobi, Kenya</span>
            <a href="mailto:hello@learnly.co.ke" className="footer-link" style={{ textDecoration: "none" }}>
              ✉️ hello@learnly.co.ke
            </a>
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="ly-eyebrow mb-3">Platform</div>
          <ul className="grid gap-2" style={{ listStyle: "none", padding: 0, margin: 0 }}>
            <li><button className="footer-link" onClick={() => onNav("#features")}>Features</button></li>
            <li><button className="footer-link" onClick={() => onNav("/how-it-works")}>How it works</button></li>
            <li><button className="footer-link" onClick={() => onNav("/levels")}>Education levels</button></li>
            <li><button className="footer-link" onClick={() => onNav("#get-started")}>Get started</button></li>
          </ul>
        </div>

        <div className="md:col-span-2">
          <div className="ly-eyebrow mb-3">Legal</div>
          <ul className="grid gap-2" style={{ listStyle: "none", padding: 0, margin: 0 }}>
            <li><button className="footer-link" onClick={() => onLegal("privacy")}>Privacy</button></li>
            <li><button className="footer-link" onClick={() => onLegal("terms")}>Terms</button></li>
            <li><button className="footer-link" onClick={() => onLegal("dpa")}>Data Protection Act 2019 Notice</button></li>
          </ul>
        </div>

        <div className="md:col-span-3">
          <div className="ly-eyebrow mb-3">Compliance</div>
          <div className="flex flex-wrap gap-2">
            <span className="ly-chip" style={{ padding: "0.3rem 0.7rem" }}>🇰🇪 Data resident in Kenya / EA</span>
            <span className="ly-chip" style={{ padding: "0.3rem 0.7rem" }}>ODPC registered</span>
            <span className="ly-chip" style={{ padding: "0.3rem 0.7rem" }}>Safaricom Daraja</span>
          </div>
        </div>
      </div>
      <div style={{ borderTop: "1px solid var(--border-subtle)" }}>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-4 sm:px-6" style={{ fontSize: "var(--fs-label)", color: "var(--text-tertiary)" }}>
          <span>© {new Date().getFullYear()} Learnly Technologies Ltd. Nairobi, Kenya.</span>
          <span>Built for CBC, 8-4-4, TVET &amp; university learners.</span>
        </div>
      </div>
    </footer>
  );
}
