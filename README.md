# AccessPay

Every payment. Every ability. Every device.

AccessPay implements the core journeys in [Plan.md](Plan.md): two participating demo stores, a shared React checkout SDK, a responsive hosted payment workspace, exact server-owned amounts, typed explanations, one-time draft handoff, PayPal sandbox order/capture adapters, and persistent verified receipts.

**Try it:** <https://accesspay-web.onrender.com> (free hosting: the first visit can take about a minute to wake up). Sign in with `demo@accesspay.test` and `accesspay-demo-only`. At PayPal, use a sandbox **personal** buyer account; never a real PayPal login. All money is PayPal sandbox money.

## What it does

AccessPay is a checkout and payment assistant for blind, low-vision, deaf and motor-impaired shoppers, and for everyone else, with no separate "accessible version".

- **Say or type what you want.** "Two desk lamps" or "do desk lamp lena hai" becomes a proposed order. The AI only picks products and quantities; prices always come from the store catalog.
- **Review before paying.** Every amount is spoken in words for screen readers ("55 US dollars and 80 cents"), focus moves to each new result, and quantities can be changed before anything is paid.
- **Pay with PayPal.** The shopper approves in PayPal (React SDK v6), the server captures with the Orders v2 API, and a receipt is saved only after PayPal confirms the capture. Signed webhooks reconcile the result.
- **Feel the result.** On Android Chrome, distinct vibration patterns mark a suggestion, an error, and a completed payment. The success pattern is used only for a captured payment. Vibration can be turned off.
- **Safety by design.** The AI cannot pay, set a price, or send money to a person; requests like "send Rahul 500 dollars" are refused. Card numbers, emails and phone numbers are removed before any text reaches the AI service.

## AI and tools used

| Tool                                                               | How it is used                                                                                                                                                                                                                        |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Groq** running open-weight **`openai/gpt-oss-20b`**              | Turns a typed or dictated request into a proposed order using strict JSON-schema output (only SKUs, quantities and an outcome such as `unsupported`). Also classifies free-form checkout questions to an allowlist of merchant facts. |
| Browser speech recognition                                         | Dictation fills the text field; nothing submits automatically.                                                                                                                                                                        |
| **PayPal** sandbox: React SDK v6, Server SDK (Orders v2), webhooks | Order creation, buyer approval, capture, merchant-ID checks and signed webhook verification.                                                                                                                                          |
| **Render**                                                         | Hosts the web app and Postgres.                                                                                                                                                                                                       |

**Status:** working, hosted application. Real PayPal sandbox payments complete end to end (order, approval, capture, receipt), and the assistant runs on live Groq calls. The team tested on laptop and phone browsers; the app has not yet been tested with blind or deaf participants. See [implementation status](docs/implementation-status.md) and [test evidence](docs/at-test-report.md).

## Run locally

Requires Node **22.12+** (developed with **24.19.0**) and pnpm **11.22.0**.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in with:

- Email: `demo@accesspay.test`
- Local development password: `accesspay-demo-only`

No service keys are required to explore stores, create/review/edit drafts, ask common typed questions, or transfer a draft between signed-in devices. A durable local PostgreSQL-compatible PGlite database is created in `.data/postgres`. This is a single-process local development database, never the hosted payment ledger. A private local signing key is created beside that database and retained across restarts. Do not commit or share the `.data` directory. Do not open the same local database from two app processes.

The demo account is deliberately shared. Use sample data only. There is no public account registration or live merchant onboarding. Signing out keeps only a signed device identifier so signing back in on the same browser retains draft ownership. It is not a sign-in credential.

## Configure PayPal sandbox and AI

```sh
cp .env.example apps/web/.env.local
```

Set the following values in that file; restart the app after changing credentials:

| Variable                | Purpose                                                                           |
| ----------------------- | --------------------------------------------------------------------------------- |
| `APP_BASE_URL`          | Exact origin, e.g. `http://localhost:3000`; required HTTPS origin when hosted     |
| `SESSION_SECRET`        | At least 32 random characters; production required; changing it signs devices out |
| `DATABASE_URL`          | Managed PostgreSQL connection; production required                                |
| `PAYPAL_ENV`            | Must be `sandbox`; live payments are intentionally rejected                       |
| `PAYPAL_CLIENT_ID`      | Sandbox application client ID; public SDK identifier                              |
| `PAYPAL_CLIENT_SECRET`  | Server-only sandbox application secret                                            |
| `PAYPAL_MERCHANT_ID`    | Sandbox business seller merchant ID; verified on every order/capture              |
| `PAYPAL_WEBHOOK_ID`     | Registered webhook ID used for official signature verification                    |
| `AI_API_KEY`            | Server-only Groq key; required for the assistant                                  |
| `AI_MODEL`              | Groq model identifier; defaults to `openai/gpt-oss-20b`                           |
| `ALLOW_DEMO_AUTH`       | Must explicitly be `true` to enable the shared account in production              |
| `DEMO_ACCOUNT_PASSWORD` | Required custom demo password for hosted environments                             |
| `MERCHANT_API_KEY`      | Server-to-server credential for the demo merchant checkout API                    |

Create a sandbox business seller and a **separate** sandbox personal buyer. Both logical demo stores use the same seller. Configure the webhook URL as `https://<your-origin>/api/paypal/webhook` and subscribe to `CHECKOUT.ORDER.APPROVED`, `CHECKOUT.ORDER.COMPLETED`, `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.PENDING`, and `PAYMENT.CAPTURE.DENIED`.

PayPal’s [Next.js 16 guide](https://developer.paypal.com/guides/nextjs-checkout) and [React SDK v6 reference](https://developer.paypal.com/sdk/react/reference) informed the integration. Client code imports **`@paypal/react-paypal-js/sdk-v6`**, not the older Buttons API. The server uses **`@paypal/paypal-server-sdk`**. No credential is embedded into product pages other than the intentionally public client ID.

Without complete PayPal configuration, the UI explicitly says payment is unavailable. It cannot generate a simulated completed receipt. If a real request times out, the existing order stays pending and is reconciled before capture/retry. Do not start another checkout for an unresolved payment.

AI routes questions to an allowlist of read-only merchant facts. Financial prose is deterministic; the model cannot authorize payment, change a price, or supply a recipient. Common questions work without an AI key, labelled as merchant facts. The default is `openai/gpt-oss-20b` on [Groq](https://console.groq.com/docs/structured-outputs), a production model with strict structured output. No live AI success is claimed without provider-call evidence.

## Assistant, voice and haptics

`/assistant` turns a typed or dictated request into a proposed order. An open-weight model on Groq (`openai/gpt-oss-20b`) returns only SKUs and quantities through strict structured output; the catalog prices it, fixed strings describe it, and the shopper still reviews and approves in the normal checkout. It needs `AI_API_KEY`, and says it is unavailable without one.

Dictation uses the browser's speech recognition where available (Chrome, including on Android). The browser's speech service receives the audio, the transcript is placed in the text field for checking, and nothing is submitted automatically. Vibration uses the Vibration API, so it works in Chrome on Android and not in iPhone browsers. It adds to written status and can be turned off on the assistant page.

## Packages and application

- `apps/web`: Next.js 16.4.3 / React 19.3.1 hosted app, Store A/B, authentication, API, PWA.
- `packages/core`: validation, immutable priced snapshots, integer money, state transitions.
- `packages/react`: shared accessible review, checkout, help, status, handoff, and receipt links.
- `packages/merchant-adapter`: typed callback interface and transaction service.
- `packages/paypal`: official v6-compatible server gateway, strict provider parsing, signed webhook verification.
- `packages/ai`: Groq client with redaction, order proposals, bounded question routing and fact-based answers.
- `packages/a11y`: route focus, vibration patterns and decorative icon helpers.
- `db`: Drizzle schema, idempotent initial migration, Postgres/PGlite repositories.

Exact dependency versions and integrity hashes are checked into `pnpm-lock.yaml`. Local development uses Next’s supported Webpack mode to avoid an observed Turbopack refresh loop after a build; production builds use Turbopack. See `docs/development-runtime.md`.

## Verify

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install chromium webkit
pnpm test:e2e
```

Stop any development server before running the browser suite. Playwright starts an isolated local server automatically, clears provider credentials for that test process, and stores its test database outside the project. Do not run a production build concurrently with the dev server using the same `.next` directory. Browser tests without credentials verify owned UI and security boundaries; they do **not** count as PayPal approval tests or real assistive-device sessions. Axe retains its raw results, including incomplete checks, as report attachments.

Tests use PostgreSQL-compatible PGlite for real database transaction, uniqueness, and rollback behavior. Managed network PostgreSQL must also be exercised before release. The test PayPal gateway exists only inside the test suite.

## Deploy to Render

The [Blueprint](render.yaml) creates a free Node web service and a free Postgres database in Singapore. Free services sleep after 15 minutes without visitors, and free databases expire 30 days after creation, so upgrade or recreate the database before a long demo period.

1. Push the code, then in Render choose **New > Blueprint** and select the repository.
2. Supply the secret values: `APP_BASE_URL` (the exact `https://...onrender.com` origin), the PayPal sandbox client ID, secret and merchant ID, `AI_API_KEY`, and `DEMO_ACCOUNT_PASSWORD`.
3. Build runs `pnpm install --frozen-lockfile && pnpm build`. The service runs `pnpm db:migrate` and then `pnpm start`. Auto-deploy is off, so deploy manually after each push.
4. Register the webhook `https://<your-origin>/api/paypal/webhook` in the PayPal sandbox app, then set `PAYPAL_WEBHOOK_ID` and redeploy.

Production refuses to use a local/ephemeral ledger. The app is sandbox-only even when hosted.

## Boundaries

No browser extension, self-voicing, passkey step-up, arbitrary-site interception, sign-language recognition, personal transfers, independent live sellers, refunds, or sponsor dashboards are enabled. Optional features are deliberately absent from the product claims. Installability depends on browser support; offline mode shows only a static explanation and never cached payment data.

[Merchant integration](docs/merchant-integration.md) · [Threat model](docs/threat-model.md) · [Demo script](docs/demo-script.md) · [Sponsor evidence](docs/sponsor-evidence.md)

MIT licensed. Not a production payment processor, compliance certification, or accessibility conformance declaration.
