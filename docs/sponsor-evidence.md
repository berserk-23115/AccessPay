# Sponsor evidence ledger

Claims below distinguish source preparation from running-service evidence. Do not submit unchecked sponsor integrations as complete.

| Sponsor   | Present work                                                                                           | Running external evidence                                  |
| --------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| PayPal    | Official React v6 and server SDK adapters, locked orders, verified capture checks, signed webhook code | Not yet: needs sandbox credentials and buyer approval      |
| Render    | Web service/Postgres Blueprint, migration, health endpoint                                             | Not deployed in this session                               |
| Postman   | Importable collection with auth, positive/negative checkout requests and sandbox regression steps      | Collection not run in hosted Postman                       |
| APIMatic  | PayPal’s installed server SDK is APIMatic-generated                                                    | APIMatic context plugin not invoked; no plugin prize claim |
| AG Grid   | Not included                                                                                           | None                                                       |
| Channel3  | Not included                                                                                           | None                                                       |
| Elastic   | Not included                                                                                           | None                                                       |
| Zapier    | Not included; no email sent                                                                            | None                                                       |
| KERNEL    | Not included; Playwright used locally                                                                  | None                                                       |
| Astropods | Not included                                                                                           | None                                                       |
| Bryntum   | Not included                                                                                           | None                                                       |

The required AI integration is a server-only open-weight model on Groq (`openai/gpt-oss-20b`): a request-to-order proposal limited to catalog SKUs and quantities, and a question classifier with deterministic merchant-fact answers. Common fact lookup works without a key. No live model request has been made yet; do not imply provider-call evidence from local fallback tests.
