# Merchant integration

## Demo integration

Both `apps/web/app/store-a/page.tsx` and `store-b/page.tsx` render `StorePage`, which imports `AccessibleCheckout` from `@accesspay/react`. Each product submits only store ID, SKU, and quantity to an authenticated server action. The backend looks up catalog values and computes tax, shipping, and total. Hosted reviews render the same `AccessPayReview`, `AccessPayCheckout`, `PaymentStatus`, `HelpDrawer`, and `ContinueOnPhone` components.

```tsx
import { AccessibleCheckout } from "@accesspay/react";

<AccessibleCheckout
  storeId="store-a"
  sku="lamp-01"
  action={createAuthenticatedMerchantCheckout}
/>;
```

This launcher is demo-specific. The reusable hosted SDK takes a server-issued `PublicSession`, typed `MerchantAdapter`, and authenticated `CheckoutActions`:

```tsx
<AccessPayProvider
  initialSession={session}
  adapter={adapter}
  actions={actions}
  paypalClientId={publicSandboxClientId}
>
  <AccessPayReview />
  <AccessPayCheckout />
  <PaymentStatus />
  <HelpDrawer />
  <ContinueOnPhone />
</AccessPayProvider>
```

Callbacks carry no client-trusted amount or payee. `createPayPalOrder(version)` creates or resumes the same provider order. `capturePayPalOrder(orderId)` checks the stored session/order association and verifies provider approval before capture. `getPaymentStatus()` reconciles the stored order. Session IDs are references, not bearer credentials.

`CheckoutActions` are bound Next.js server actions for review, update, cancellation, help, and pairing. Review/edit/cancel are native HTML forms and continue without hydration. Help and handoff use progressively enhanced React form actions. PayPal’s own SDK requires JavaScript; the UI discloses that dependency and keeps the review readable.

## API contract

All shopper endpoints require a signed HttpOnly same-site identity cookie. Every mutation requires an exact `Origin` matching `APP_BASE_URL`. The webhook uses PayPal signature verification instead. Responses containing checkout data use `Cache-Control: no-store`. Unknown, malformed, stale, unauthorized, and rate-limited requests return structured errors.

| Method and route                                 | Input                                                             | Result                                             |
| ------------------------------------------------ | ----------------------------------------------------------------- | -------------------------------------------------- |
| `POST /api/auth/sign-in`                         | `{email,password}` demo credentials                               | Signed cookie; persistent device identifier        |
| `POST /api/auth/sign-out`                        | none                                                              | Removes sign-in cookie                             |
| `POST /api/merchant/checkout-sessions`           | `{storeId,items:[{sku,qty}]}` and server-only merchant bearer key | Immutable priced snapshot                          |
| `GET /api/checkout-sessions`                     | none                                                              | Account’s most recent 30 checkouts                 |
| `GET /api/checkout-sessions/:id`                 | none                                                              | Authorized summary with `canEdit`                  |
| `POST /api/checkout-sessions/:id/review`         | `{version}`                                                       | Confirms current review                            |
| `POST /api/checkout-sessions/:id/cart`           | `{version,items}`                                                 | Reprices and increments version                    |
| `POST /api/checkout-sessions/:id/cancel`         | `{version}`                                                       | Cancels an unpaid, unsubmitted draft               |
| `POST /api/checkout-sessions/:id/paypal/order`   | `{version}`                                                       | Stable PayPal `orderId`                            |
| `POST /api/checkout-sessions/:id/paypal/capture` | `{orderId}`                                                       | Verified state or explicitly pending               |
| `GET /api/checkout-sessions/:id/status`          | none                                                              | Reconciled provider state                          |
| `POST /api/handoff`                              | `{sessionId,version}`                                             | Short-lived code, never a credential URL           |
| `POST /api/handoff/redeem`                       | `{code}`                                                          | Account-bound target ownership, new review version |
| `POST /api/help/explain`                         | `{sessionId,question}`                                            | Answer, source fields, version, and routing mode   |
| `GET /api/receipts/:id`                          | none                                                              | Account-bound sanitized receipt                    |
| `POST /api/paypal/webhook`                       | PayPal event and signature headers                                | Reconcile and deduplicate verified event           |
| `GET /api/health`                                | none                                                              | DB readiness; payment configuration boolean        |

Passkeys are optional in the master plan and are not enabled. There are no placeholder passkey verification endpoints that silently approve a payment.

For a third-party seller, implement these callbacks in that merchant’s authenticated backend. Do not distribute this demo’s merchant key, share its seller credentials, or claim independent settlement. Generic merchant origin allowlists are intentionally not opened: both demos and APIs are same-origin. A future remote embedding integration needs an explicit CORS/authentication design and merchant-side adapters or approved PayPal partner onboarding.
