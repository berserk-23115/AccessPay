# Development bundler decision

Owner: AccessPay maintainers. Applies to the pinned Next.js 16.4.3 local environment. Review before the next framework upgrade and before release.

Repeated clean-start browser runs against Turbopack development mode could continually refresh the initial form after a production build, clearing input before submission. A previously warm server passed the same behavior checks. This is a development runtime observation, not a confirmed upstream defect or a payment-state failure.

Decision: use the existing, documented `next dev --webpack` capability. Do not patch Next internals or add a custom refresh suppressor. `next build` continues using the default production bundler. Runtime storage paths are absolute and excluded from build-time filesystem tracing; test ledgers live outside the watched source tree.

No external issue or contribution was opened. The installed `next dev --help` lists `--webpack`. Revisit this choice when adopting a maintained Next version whose clean-start development behavior passes the full browser suite repeatedly after a production build. Rollback: remove `--webpack` from the dev script only after that verification. This choice changes local compilation, not the server-side authorization or payment protocol.
