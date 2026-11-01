import { PageFocus } from "@accesspay/a11y";
export const metadata = { title: "Merchant integration" };
export default function Page() {
  return (
    <article className="prose">
      <PageFocus identity="integration" />
      <h1 tabIndex={-1}>One review. A reusable integration.</h1>
      <p>
        Northstar Goods and Fieldwork Supply share the same AccessPay React
        package, review controls, server-calculated amounts, and payment status
        handling.
      </p>
      <h2>Start with a server-issued checkout</h2>
      <p>
        Your backend owns the cart and catalog. It creates a priced checkout
        snapshot. The browser receives a session reference, never permission to
        set the price or recipient.
      </p>
      <pre>
        <code>{`<AccessPayProvider\n  initialSession={checkout}\n  adapter={merchantAdapter}\n  actions={serverActions}\n  paypalClientId={sandboxClientId}\n>\n  <AccessPayReview />\n  <AccessPayCheckout />\n  <PaymentStatus />\n  <HelpDrawer />\n  <ContinueOnPhone />\n</AccessPayProvider>`}</code>
      </pre>
      <h2>Connect your local sandbox</h2>
      <p>
        Follow the repository README. Copy the example environment file to the
        web app’s local environment file. Configure a sandbox PayPal client ID,
        client secret, and seller merchant ID. Register the signed webhook
        endpoint before testing payment reconciliation.
      </p>
      <p>
        The client secret stays on the server. Payment is disabled until the
        required credentials are configured. There is no simulated successful
        payment button.
      </p>
      <h2>Keep approval with PayPal</h2>
      <p>
        The official PayPal React SDK v6 opens the buyer approval flow. Server
        callbacks create and capture the locked order with stable request
        identifiers. AccessPay displays completion only when the provider’s
        seller, session, currency, order, and captured amount match.
      </p>
      <h2>Explain, without authorizing</h2>
      <p>
        With an AI key configured, a read-only question classifier can route
        unfamiliar questions to merchant facts. Financial answers are written
        from the locked checkout values. Without a key, the same common
        questions use local merchant-fact lookup.
      </p>
      <h2>What this release leaves for later</h2>
      <p>
        Live merchant onboarding, independent sellers, device passkeys, browser
        extensions, sponsor dashboards, and formal compliance certification
        require separate work. The repository includes a deployment blueprint,
        test suite, manual test procedures, and an implementation status report.
      </p>
      <a
        href="https://developer.paypal.com/guides/nextjs-checkout"
        target="_blank"
        rel="noreferrer"
      >
        PayPal’s Next.js and SDK v6 guide (opens a new tab)
      </a>
    </article>
  );
}
