# Threat model and payment recovery

## Trust boundaries

The catalog and deterministic service decide amount, currency, seller mapping, version, and state. Browser data supplies SKU/quantity and review acknowledgments only. PayPal decides buyer approval and capture outcome. AI only selects a known merchant-fact topic; output is not payment authority. Store descriptions and user questions cannot call a money-moving tool.

| Threat                           | Implemented control                                                                                                                                      | Residual work                                                             |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Client edits totals or payee     | Strict schemas, fixed store catalog, integer arithmetic, server seller mapping                                                                           | Real inventory/pricing integration for additional merchants               |
| Cross-account read or capture    | Signed, expiring HttpOnly identity; every lookup checks account; writes check active device                                                              | Replace shared demo identity before real customers                        |
| CSRF / open redirects            | Exact mutation Origin check; SameSite=Lax cookies; local return-path allowlist; Next action defenses                                                     | Separate external merchant origin/auth policy if added                    |
| Duplicate clicks / process crash | Create and capture intents committed before provider writes; persisted stable request IDs; DB transaction lock; unique attempt/order/capture constraints | Managed Postgres/process-kill verification before release                 |
| Unknown capture outcome          | Explicit PENDING; GET provider truth; capture only approved existing order; never retry with a new attempt                                               | Operator reconciliation for unresolved create after expiry                |
| Forged / replayed webhook        | PayPal official verification endpoint; known event types; event ID uniqueness; provider GET reconciliation                                               | Live signature fixture and provider delivery evidence                     |
| Code theft / guessing            | 50-bit code, hashed at rest, 90-second expiry, same-account check, one-use transaction, 8 redemptions/account/minute                                     | Shared demo password is intentionally not an individual customer identity |
| Source device race               | Redemption increments version and changes owner; source mutations reject; any existing PayPal attempt prevents handoff                                   | Physical phone/browser matrix                                             |
| LLM injection                    | No tools/capture capability; bounded topic output; deterministic financial answers; unknown-fact fallback                                                | Live adversarial model evaluation                                         |
| Sensitive data retention         | No cards, biometric data, passwords, voice, prompts, or raw webhook payload storage; logs contain event codes only                                       | Hosted retention/backup policy and telemetry operations                   |
| Offline stale state              | No caching of auth, checkout, API, or receipt; static offline warning only                                                                               | Physical PWA installation and intermittent-network sessions               |

## Transaction protocol

The repository takes a database row lock shared by all writers. For a small hackathon ledger, this intentionally serializes operations across sessions and app processes. It favors clear invariants over throughput. External provider calls have bounded timeouts but hold this lock in the finishing transaction. Scale-out deployments should replace the global lock with ordered per-session/attempt locks and an outbox/reconciler while retaining the intent-before-provider-write protocol.

Order creation commits CREATING plus request IDs first. Then it calls PayPal. A crash or timeout leaves the intent recoverable with the same key. Replaying an unresolved create after the 30-minute checkout expiry is blocked because provider idempotency retention is finite. Merchant intervention is required for that case; a new payment must not be created automatically.

Capture checks provider order ID, custom session ID, expected seller merchant ID, currency, total, and APPROVED state. CAPTURING is committed before the capture request. Retrying the same order always re-reads provider state. A receipt requires an exact COMPLETED capture amount and currency with a unique capture ID. Approval, a browser callback, or a webhook’s claimed status alone is never enough.

The browser cannot cancel or edit a checkout once any PayPal attempt exists. Closing a PayPal window means payment is unconfirmed, not a verified cancellation. A verified refusal becomes FAILED. A pending payment stays pending until provider truth resolves it.

## Operational limits

This is a single-seller sandbox demo, not a regulated payment platform. The shared demo login must not hold personal information. HTTPS and an adequate session secret are required when hosted. Production refuses filesystem storage. CSP permits the official PayPal origins and Next’s inline scripts; it is a compatibility policy, not a nonce-based strict CSP. Passkeys, independent registration, refunds, email, extension permissions, and live mode are not enabled.
