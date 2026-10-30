# Accessibility and verification report

Date: 30 October 2026 (IST). Scope: AccessPay-owned content and payment orchestration. This is not a WCAG conformance report.

## Executed evidence

- **34 unit/integration tests:** server money calculations, state guards, merchant binding, account isolation, review version invalidation, concurrent creates/captures, mismatched completed amount, lost-response recovery across service reconstruction, webhook replay, strict provider parsing, database rollback, pairing expiry/regeneration/race, failed-guess rate budgets, signed cookie tampering/expiry, origin checks, safe redirects, hosted HTTPS/ledger/signer configuration, and hostile external AI output.
- **22 browser tests:** 11 scenarios each in Chromium desktop and WebKit with an iPhone 13 viewport/profile. Both stores, quantity changes, typed questions, source/target handoff, malformed/stale/cross-origin requests, review/help/handoff without JavaScript, keyboard navigation, persistent theme/text preferences, and sign-out/sign-in ownership are exercised.
- **Axe:** @axe-core/playwright 4.11.1, installed axe-core 4.11.4, Playwright 1.58.2. Scans cover home, both shops, workspace, handoff, accessibility information, and checkout in light/dark system schemes. Raw results are preserved in Playwright attachments, including `violations`, `incomplete`, `passes`, and `inapplicable`. The tested scans reported no violations. Incomplete checks remain human-review work.
- **Behavioral indicators:** 320 CSS pixel layout checks, large-text/dark preference checks, and forced-color/reduced-motion screenshots. These are indicators for review, not universal reflow/contrast/focus findings. A 320px viewport is not a real 400% desktop zoom session.
- **Keyboard mechanics:** native key presses operate store launch, quantity update, review confirmation, and typed help. WebKit uses Option-Tab/Option-Shift-Tab to include links under its default keyboard convention. This does not stand in for a real iPhone external-keyboard session.
- **Visual QA:** desktop and narrow review screenshots inspected; reading order aligned with DOM order. `docs/screenshots/` contains representative owned pages.
- **Deployment structure:** render.yaml validates against the fetched public Render JSON schema. Render CLI/platform deployment validation has not run; no Render resources were created.

Browser versions installed for the run: Chromium 145.0.7632.6 and WebKit 26.0 (Playwright build 2248), on macOS arm64. iPhone emulation is not a physical iPhone, Safari application, VoiceOver, or TalkBack test.

## Defects found and corrected

1. Concurrent captures attempted a backward state transition: corrected while preserving one verified capture/receipt.
2. Native form POSTs failed Origin checks with a no-referrer policy: corrected to strict-origin-when-cross-origin, then verified with JavaScript disabled.
3. Signing back in replaced device identity and stranded draft ownership: added a signed, non-authorizing device cookie retained across sign-out.
4. A hot-reloaded domain error failed an instanceof check: added a bounded domain-error shape guard and verified HTTP error codes.
5. Narrow visual ordering differed from DOM ordering: restructured the checkout grid to follow the same logical order.
6. Local restarts could change the signing key and lose device ownership: persist a private development signer and test independent reloads.
7. Some clean-start Turbopack development runs repeatedly reloaded the initial form after a build. Isolate test storage, exclude runtime paths from source tracing, and select Next’s supported Webpack development mode. The owner, removal condition, and rollback are recorded in development-runtime.md.

## Human testing not performed

Real participant count: **0**. No completion-time median/p90, independence score, disability-specific usability result, or hardware-braille compatibility result is claimed. PayPal-owned login/approval, real sandbox captures, and live AI calls remain untested without credentials.

## Manual release protocol

Record participant consent without unnecessary identifying information. For each run, record browser/version, OS, assistive technology/version, physical device/display, scenario, completion/intervention/error count, timings, and observed announcements. Use the same storefront tasks and counterbalance baseline/AccessPay order where possible.

1. **NVDA + Chrome on Windows:** launch from each store; navigate headings/landmarks; read item quantities, merchant, fees, exact currency/amount; edit; review; ask typed help; approve/cancel in PayPal; restore focus; read final/pending result and receipt.
2. **VoiceOver + Safari on macOS:** repeat, including rotor navigation, zoom, native password manager/paste, keyboard settings, and browser popup return.
3. **TalkBack + Android Chrome:** real device; linear reading; touch target use; pairing by text; PayPal browser switch and return; persistent receipt.
4. **VoiceOver + iPhone Safari:** real device; responsive reading sequence; software/external keyboard as available; PayPal return; installability/offline explanation.
5. **Physical braille:** document the actual display and screen-reader pairing; verify concise persistent statuses, review editing, pairing code entry, pending and completed receipts. If unavailable, retain “unverified.”
6. **Low vision / motor access:** 200% and 400% actual browser zoom, user text-spacing overrides, large text, forced colors on Windows, reduced motion, switch/keyboard access, and no focus obstruction or unexpected timeout during review.
7. **Failure cases:** declined capture, lost network after approval, closed popup, duplicate click, expired/regenerated pairing code, both devices racing, stale review, session expiry, AI outage, and webhook retries.

Keep automated rule outcomes separate from human-confirmed findings. Publish only the specific configurations and outcomes actually tested.
