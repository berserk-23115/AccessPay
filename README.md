# AccessPay

Every payment. Every ability. Every device.

AccessPay implements the core journeys in [Plan.md](Plan.md): two participating demo stores, a shared React checkout SDK, a responsive hosted payment workspace, exact server-owned amounts, typed explanations, one-time draft handoff, PayPal sandbox order/capture adapters, and persistent verified receipts.

**Status:** working local application with automated verification. Real PayPal sandbox transactions, hosted Render deployment, live AI calls, and human assistive-technology sessions require credentials/devices and are not represented as completed. See [implementation status](docs/implementation-status.md) and [test evidence](docs/at-test-report.md).

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
| `AI_API_KEY`            | Optional server-only Anthropic key                                                |
| `AI_MODEL`              | Configurable Claude model identifier                                              |
| `ALLOW_DEMO_AUTH`       | Must explicitly be `true` to enable the shared account in production              |
| `DEMO_ACCOUNT_PASSWORD` | Required custom demo password for hosted environments                             |
| `MERCHANT_API_KEY`      | Server-to-server credential for the demo merchant checkout API                    |

Create a sandbox business seller and a **separate** sandbox personal buyer. Both logical demo stores use the same seller. Configure the webhook URL as `https://<your-origin>/api/paypal/webhook` and subscribe to `CHECKOUT.ORDER.APPROVED`, `CHECKOUT.ORDER.COMPLETED`, `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.PENDING`, and `PAYMENT.CAPTURE.DENIED`.

PayPal’s [Next.js 16 guide](https://developer.paypal.com/guides/nextjs-checkout) and [React SDK v6 reference](https://developer.paypal.com/sdk/react/reference) informed the integration. Client code imports **`@paypal/react-paypal-js/sdk-v6`**, not the older Buttons API. The server uses **`@paypal/paypal-server-sdk`**. No credential is embedded into product pages other than the intentionally public client ID.

Without complete PayPal configuration, the UI explicitly says payment is unavailable. It cannot generate a simulated completed receipt. If a real request times out, the existing order stays pending and is reconciled before capture/retry. Do not start another checkout for an unresolved payment.

AI routes questions to an allowlist of read-only merchant facts. Financial prose is deterministic; the model cannot authorize payment, change a price, or supply a recipient. Common questions work without an AI key, labelled as merchant facts. The default is Claude Haiku 5.5 with thinking disabled for this short classification task, following the [current model documentation](https://platform.claude.com/docs/en/models/haiku-5-5/overview). The selected Claude model must be enabled in your provider account. No live AI success is claimed without provider-call evidence.

## Packages and application

- `apps/web`: Next.js 16.4.3 / React 19.3.1 hosted app, Store A/B, authentication, API, PWA.
- `packages/core`: validation, immutable priced snapshots, integer money, state transitions.
- `packages/react`: shared accessible review, checkout, help, status, handoff, and receipt links.
- `packages/merchant-adapter`: typed callback interface and transaction service.
- `packages/paypal`: official v6-compatible server gateway, strict provider parsing, signed webhook verification.
- `packages/ai`: bounded question routing and fact-based answers.
- `packages/a11y`: route focus and decorative icon helpers.
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

The [Blueprint](render.yaml) provisions one always-on Node web service and managed Postgres in Singapore. It has not been applied to your Render account. It selects paid compute plans: review the resources before deploying.

1. Push the application and Blueprint to your Git remote.
2. Validate using `render blueprints validate render.yaml` (Render CLI 2.7+); structural schema validation alone is not a platform deployment check.
3. Create a Blueprint in Render from your repository. Supply the required secret values through Render, including exact `APP_BASE_URL`, seller ID, webhook ID, and a custom demo password.
4. Build uses `pnpm install --frozen-lockfile && pnpm build`. The pre-deploy step runs `pnpm db:migrate`; the service starts with `pnpm start` and binds Render’s `PORT` on all interfaces.
5. Register the HTTPS PayPal webhook, test actual approve/cancel/decline/pending scenarios, and verify provider capture IDs and persisted receipts.
6. Perform the manual accessibility matrix in `docs/at-test-report.md`. Record actual participant results before publishing accessibility or completion-time claims.

Production refuses to use a local/ephemeral ledger. The app is sandbox-only even when hosted. The Blueprint uses current compute-plan IDs from [Render’s reference](https://render.com/docs/compute-plans) and same-region private database wiring from [the Blueprint reference](https://render.com/docs/blueprint-spec).

## Boundaries

No browser extension, self-voicing, microphone capture, passkey step-up, arbitrary-site interception, sign-language recognition, personal transfers, independent live sellers, refunds, or sponsor dashboards are enabled. Optional features are deliberately absent from the product claims. Installability depends on browser support; offline mode shows only a static explanation and never cached payment data.

[Merchant integration](docs/merchant-integration.md) · [Threat model](docs/threat-model.md) · [Demo script](docs/demo-script.md) · [Sponsor evidence](docs/sponsor-evidence.md)

MIT licensed. Not a production payment processor, compliance certification, or accessibility conformance declaration.
