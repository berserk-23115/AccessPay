import { PageFocus } from "@accesspay/a11y";
export const metadata = { title: "Accessibility and limitations" };
export default function Page() {
  return (
    <article className="prose">
      <PageFocus identity="accessibility" />
      <h1 tabIndex={-1}>Built for access. Honest about limits.</h1>
      <p>
        AccessPay is a payment review for participating merchants. Our owned
        pages aim to meet the Web Content Accessibility Guidelines (WCAG) 2.2
        AA. A complete audit and testing with people who use assistive
        technology are still needed.
      </p>
      <h2>Choose the way you use it</h2>
      <ul>
        <li>
          Use a keyboard throughout. Press Tab to move between controls and
          Enter or Space to activate them.
        </li>
        <li>
          Read the merchant, items, shipping, tax, and total as structured text.
        </li>
        <li>
          Type or dictate what you want to buy. Speaking is optional: every step
          works without a microphone, camera, or audio.
        </li>
        <li>
          On Android, your phone can vibrate when a payment succeeds, fails, or
          needs attention. The same status is always written on the page.
        </li>
        <li>
          Use browser zoom or Reading preferences at the bottom of the page.
          Your system’s color and motion preferences are respected.
        </li>
        <li>
          Enter a handoff code in text. Scanning a code is never required.
        </li>
      </ul>
      <h2>Review before you pay</h2>
      <p>
        Confirm the merchant and exact total before opening PayPal. Changing
        your order requires a fresh review. Your device’s passkey does not
        replace PayPal approval; device passkeys are not enabled in this
        release.
      </p>
      <h2>PayPal’s approval pages</h2>
      <p>
        PayPal controls its login, approval, and security steps. They are
        outside AccessPay’s page and need separate accessibility testing. If the
        payment window closes, use Check payment status before trying again. A
        receipt appears only after our server verifies a completed PayPal
        capture.
      </p>
      <h2>Screen readers and braille</h2>
      <p>
        We provide semantic headings, visible labels, keyboard controls, short
        status updates, and persistent payment results. Screen-reader sessions
        on real desktop and phone devices have not yet been recorded. Physical
        refreshable braille hardware has not been tested. Compatibility with a
        specific device is unverified.
      </p>
      <h2>A sandbox, with clear boundaries</h2>
      <p>
        Both shops use one sandbox seller. This demonstrates a reusable
        integration; the shops are not separate live merchants. The demo account
        is shared. Use sample orders only. AccessPay never asks for a card
        number, security code, or PayPal password.
      </p>
      <h2>If something blocks you</h2>
      <p>
        Keep the checkout open and use its persistent status. You can return to
        Your checkouts or refresh the review. To report a barrier, give the
        project owner the page, action, browser, assistive technology, and what
        happened. Do not include passwords or payment credentials.
      </p>
      <a href="/workspace">Open your payment workspace</a>
    </article>
  );
}
