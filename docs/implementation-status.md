# Plan.md implementation status

This report maps the master plan to code and verifiable evidence. Implementation began with only the plan and project skills. No external success, participant, compliance, or sponsor result has been invented.

## Implemented core

| Plan sections                          | Delivered                                                                                                                                                                                                                                                      |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1–3: users, surfaces, journeys         | Text-first responsive owned UI; two distinct stores; persistent account workspace; typed-only forms; draft handoff; explicit unpaid/pending/failed/completed states                                                                                            |
| 4–6: architecture, stack, SDK          | pnpm/TypeScript monorepo; Next.js 16/React 19; shared core/React/merchant-adapter/PayPal/AI/a11y packages; typed callback interface; same SDK in both stores; integration guide                                                                                |
| 6–7: sessions and financial invariants | Authenticated catalog-based pricing; immutable server snapshot; versioned review; edits invalidate review; seller/order/session/currency/amount binding; two-phase persisted intents; stable request IDs; database transaction lock and uniqueness             |
| 6–7: payment integration               | Official PayPal React SDK v6; server SDK Orders v2; approval checks; exact completed-capture verification; persistent sanitized receipts; unknown outcomes remain pending; official webhook verification and event deduplication                               |
| 8: cross-device drafts                 | 50-bit human-enterable codes; hashed at rest; 90-second expiration; rate-limited guesses that survive rejection; same-account redemption; one-use lock; stale-version rejection; source view-only; new review on target                                        |
| 9: owned UI accessibility              | Semantic landmarks/headings; exact amount readback; route/result focus; one checkout status announcer; no forced speech; native forms; persisted theme/text preferences; reduced-motion/forced-color styles; narrow layouts; no-JavaScript review/help/handoff |
| 10–11: bounded AI and security         | Read-only question classification; allowlisted output topics; deterministic fee/total strings; no model money tools; prompt-injection checks; signed HttpOnly identity; exact Origin mutations; safe return paths; explicit same-origin demo API               |
| 12–13: data and structure              | Drizzle schema and initial migration; session/items/reviews/attempts/events/receipts/handoffs/users/audit/rate-limit storage; reserved authenticator table; durable local PGlite; hosted production requires PostgreSQL                                        |
| 15: deployment preparation             | Render Node + managed Postgres Blueprint; pre-deploy migration; health route; environment example; same-region private connection; static offline PWA explanation; install icons/manifest                                                                      |
| 17: automated verification             | Unit/integration tests on real database transactions; Chromium and iPhone-sized WebKit browser flows; native keyboard checks; axe raw evidence; 320px reflow/preference indicators; CI workflow                                                                |
| 18–19: delivery preparation            | README, MIT license, merchant guide, threat model, test report, sponsor evidence, evidence-aware demo script, Postman collection                                                                                                                               |

## Explicit implementation choices

- Server-side Drizzle is the one ORM. Local PGlite is PostgreSQL-compatible and durable; hosted production refuses local storage.
- Semantic CSS and small React primitives provide styling. Tailwind was not added; the UI uses a compact, contrast-checked semantic token system.
- A global database row lock intentionally serializes this small demo ledger. It is correct for the tested races, not a production throughput claim. Per-session locks/outbox reconciliation belong to a scaling follow-up.
- WebAuthn/passkeys are optional in the plan and remain disabled. There is no fake verification fallback. Alternate demo password sign-in supports paste/password managers.
- Common questions use deterministic merchant-fact lookup; unfamiliar questions optionally use Claude for topic routing. Model text never becomes a financial string.
- Browser extension, voice, sponsor dashboards, and discovery adapters are omitted as permitted by the plan’s cut order.

## External release gates still open

| Gate                          | Remaining evidence or action                                                                                                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1 / G2: sandbox verification | Supply PayPal sandbox app/seller/buyer credentials; approve and cancel actual transactions from both stores; confirm capture ledger amounts and seller IDs                            |
| Signed webhook release        | Register the HTTPS webhook, verify real signatures, retry/replay real events, and exercise webhook-before-create-response recovery                                                    |
| Managed database release      | Apply the Blueprint/migration and exercise actual network Postgres, process termination, and multi-process races; local PostgreSQL-compatible transaction tests are not that evidence |
| Live AI                       | Configure provider credentials and record a successful bounded request plus a grounded-fact evaluation set                                                                            |
| G3 / G4 / G6: human access    | Desktop and phone screen-reader sessions, actual participants with consent, real external keyboards/switch input where available, and separate PayPal-surface testing                 |
| Braille                       | Physical refreshable display model/procedure/results; currently unverified                                                                                                            |
| PWA                           | Install on real supported phone/browser combinations and exercise intermittent-network return behavior                                                                                |
| G7 / submission               | Captioned sub-three-minute public video, public source publication, Devpost submission, and hosted availability through judging                                                       |
| Monitoring                    | Hosted alerting, an OpenTelemetry collector/export setup, and retention/backup policy; current code provides structured error codes and persistent audit events only                  |
| Sponsors                      | Optional integrations remain unclaimed; see sponsor-evidence.md                                                                                                                       |

The code and documentation are prepared for these checks. Automated green results do not close the human, account, provider, or hosting gates.
