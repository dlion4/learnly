# Learnly — Theme & Shell Notes

Canonical references: `learnlyMO.md` §2 (global styling) and `learnlyMO_build_prompt.md` (page build contract).

## Layer order

1. Tailwind utilities / Bootstrap-style responsive helpers.
2. `src/styles/tokens.css` — canonical design tokens and shared `.ly-*` classes.
3. `src/styles/components/marketing.css` — shared marketing footer.
4. `src/styles/app-shell.css` — shared authenticated shell (A-group).
5. Page-scoped stylesheet, imported only by its route (e.g. `src/styles/pages/auth-signup.css`).

All page selectors are namespaced under their blueprint root class. No page writes another page's styles.

## Typography

- Display / academic headings: `font-display` → Fraunces (`--font-display`).
- Blockquotes / academic voice: `font-serif` / `ly-quote` → Lora (`--font-serif`).
- Body / forms: Inter (`--font-sans`).
- Money, references, OTP digits: `font-display` / `font-mono` as appropriate.

## Shared classes (do not rebuild per page)

- Layout: `.ly-card`, `.hover-lift`, `.ly-chip`, `.ly-eyebrow`, `.ly-h-section`, `.ly-lead`, `.ly-quote`.
- Buttons: `.ly-btn`, `.ly-btn-primary`, `.ly-btn-outline`, `.ly-btn-ghost`, `.ly-btn-gold`, `.ly-btn-sm`, `.ly-btn-lg`.
- Forms: `.ly-field`, `.ly-label`, `.ly-input`, `.ly-select`, `.ly-phone-input`, `.ly-hint`, `.ly-error`, `.is-invalid`.
- Badges: `.ly-edu-badge-*`, `.ly-cat-dot-*`, `.ly-status-pending/approved/rejected/disbursed/failed/verified`.
- Tables: `.ly-table-wrap`, `.ly-table`, `.responsive-table` with `data-label` cells; `.is-card-stack` removes the outer container below md.
- Dialog: `.ly-dialog-backdrop`, `.ly-dialog`, `.ly-dialog-head/body/foot`, `.ly-icon-btn`.
- Motion: `.ly-reveal`, `.stagger.is-entered`, `.icon-draw`, `.icon-pulse`, `.icon-spin`.
- Stepper: `.stepper-h`, `.step.is-active`, `.step.is-done`.

## Semantic text accents

`--brand-primary` remains the canonical indigo **surface / brand** token. `--brand-ink` is the theme-safe **text / icon accent** (indigo in light mode, periwinkle in dark mode). Use it for body-sized coloured text and outline buttons. White text on the indigo brand surface uses `--text-on-brand`; pastel education ribbons use `--text-on-edu`.

## Auth shell (A-group)

`src/components/auth/AuthShell.tsx` mounts the shared top bar and footer. `AUTH_NAV` in `src/data/auth.ts` uses explicit `ready` flags. Unbuilt auth routes are never anchors: A-1 provides real in-page sign-in / recovery dialogs until A-2 / A-5 ship.

- Shell stylesheet: `src/styles/app-shell.css`.
- Signup page stylesheet: `src/styles/pages/auth-signup.css`, root `.page-auth-signup`.
- Signin page stylesheet: `src/styles/pages/auth-signin.css`, root `.page-auth-signin`.
- Routes: `/auth/signup` (A-1), `/auth/signin` (A-2).
- Shared OTP primitive: `src/components/auth/OTPInput.tsx` (six split inputs, numeric inputmode, paste, auto-advance, backspace / arrow navigation).
- Shared password primitive: `src/components/auth/PasswordField.tsx` (show / hide + live strength, no password logging).

## Forms & validation

A-1 uses React Hook Form + Zod through `@hookform/resolvers/zod`. Kenyan phone validation is `^\+254[17]\d{8}$`; identity accepts an 8-digit National ID, 9–10-digit birth certificate, or `K`-prefixed certificate. Passwords require at least 10 characters, one number and one symbol. Terms and DPA consent are independently required booleans.

## Preview safety / honest state

This project currently has no authentication backend. A-1 is an explicitly labelled interactive preview:

- OTP preview code: `123456`; no SMS is sent and no real authentication is performed.
- The optional bootstrap token comes from `VITE_LEARNLY_BOOTSTRAP_TOKEN`. If absent, the public demo token `LEARNLY-DEMO-2025` is shown in the UI. Production bootstrap validation MUST be enforced server-side with a one-time token.
- Only a minimal account preview (name, role, last four identity / phone digits, optional email, timestamps) is persisted under `learnly.signup-preview.v1`.
- Passwords, full identity numbers and OTP codes are NEVER persisted or logged.
- A production integration must replace the preview handler with a server-side signup / OTP verification endpoint and must not trust client-side role or token checks.

## Responsive & accessibility

- Auth split layout: two columns on lg; one column on sm, with the brand panel condensed rather than removed.
- Minimum target tested mentally at 360px: no horizontal page overflow; stacked role cards if needed; full-width inputs; vertically stacked password fields.
- All icon-only controls have labels; errors use `role="alert"`; OTP is a labelled input group; dialogs support Escape and backdrop dismissal.
- `prefers-reduced-motion` snaps count-ups, skips SVG draw-ins, and disables entrance / pulse animations.

## Student shell (S-group)

`src/components/shell/StudentShell.tsx` owns the sidebar, sticky top bar, mobile offcanvas, the `StudentProvider` store and the single overlay host. S-1 (`/student`) created it; later S-pages render inside it.

- Nav config: `STUDENT_NAV` with `ready` flags. `ready: true` items are real `<a>` routes. Pages that have not shipped never render as links — the item opens that section's real in-page panel (`panel` key) instead, so there are no 404s or blank URLs. When a page ships, flip `ready` and drop `panel`.
- Store: `src/components/student/StudentStore.tsx` (`useStudent()`): requests, payouts, methods, documents, notifications, threads, caps (`capInfo`), per-term limits (`termBlocker`), `open(key, payload)` / `close(key)` for every overlay, and the simulated live approval push (disable with `?live=off`).
- Overlay host order: panels → entity drawers (request, payout) → dialogs. Drawers are `z-index: 900`, dialogs `1000`, menus `1200`. An overlay that opens one from a lower layer must close itself first.
- `useOverlay(open, onClose)` in `primitives.tsx` backs `Dialog`, `Drawer`, `Dropdown` and the offcanvas: Escape closes only the top-most overlay, and body scroll unlocks only when the last one closes.

### Shared dashboard classes (`src/styles/components/dashboard.css`)

Drawer `.ly-drawer*` · menu `.ly-menu*` · tabs `.ly-tabs/.ly-tab`, `.ly-minitabs/.ly-minitab` · KPI `.ly-stat*` · `.ly-link-btn`, `.ly-btn-danger` · status `.ly-status-chip`, `.ly-status-neutral`, `.ly-status-warn`, `.ly-pulse-warn` · `.ly-cat-badge`, `.ly-badge-count` · `.ly-progress`, `.ly-toggle` · table helpers `.ly-amount`, `.ly-ref`, `.ly-toolbar`, `.ly-search`, `.ly-pagination`, `.ly-page-btn`, `tr.ly-flash-approved/rejected/disbursed` · `.ly-kv`, `.ly-panel`, `.ly-alert-*`, `.ly-masked` · `.ly-empty` · `.ly-timeline` · wizard `.ly-wizard-steps`, `.ly-choice`, `.ly-success-mark` · upload `.ly-dropzone`, `.ly-file-row` · `.ly-chart*` · `.ly-confetti` · `.ly-row-btn`, `.chat-bubble`, `.date-block`.

Layout rule: any single-column grid that holds truncating text must use `minmax(0, 1fr)` tracks (Tailwind `.grid` inside `.student-shell` gets this by default from a base-layer rule), otherwise long labels widen the page on 360px screens.

Components: `src/components/ui/overlays.tsx` (Drawer, Dropdown, Tabs, MiniTabs, Pagination, Toggle, StatusChip, CategoryBadge, EmptyState, StatCard, ProgressBar, Alert, KV, Masked, WizardSteps, FileDrop, BarChart, Confetti) and `src/components/ui/Icon.tsx`.

### Honest state on S-1

There is no backend. All records are mock data for one learner; actions change in-memory state (drafts also persist to `localStorage`). File inputs validate type and size but nothing is uploaded; "Attach sample file" exists so flows can be exercised without a file. OTP preview code is `123456`. Downloads (receipt, CSV, `.ics`, data archive) are real files generated in the browser.
