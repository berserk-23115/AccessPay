import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { identity } from "../lib/auth";
import { signOut, savePreference } from "./actions";
import "./globals.css";
import { PreferenceReturn } from "../components/preference-return";
import { Pwa } from "../components/pwa";
export const metadata: Metadata = {
  title: {
    default: "AccessPay — Every payment. Every ability.",
    template: "%s | AccessPay",
  },
  description:
    "A clear, accessible payment review for participating merchants. Review at your pace, ask questions in text, and pay securely with PayPal.",
  manifest: "/manifest.webmanifest",
  applicationName: "AccessPay",
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#3930a5",
};
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [jar, actor] = await Promise.all([cookies(), identity()]);
  const theme = jar.get("accesspay_theme")?.value ?? "system",
    size = jar.get("accesspay_size")?.value ?? "standard";
  return (
    <html
      lang="en"
      data-theme={["light", "dark"].includes(theme) ? theme : "system"}
      data-size={size === "large" ? "large" : "standard"}
    >
      <body>
        <Pwa />
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        <header className="site-header">
          <div className="header-inner">
            <a className="brand" href="/" aria-label="AccessPay home">
              <span className="brand-symbol" aria-hidden="true">
                a<span>p</span>
              </span>
              <span>
                accesspay<span className="brand-dot">.</span>
              </span>
            </a>
            <nav aria-label="Main">
              <a href="/assistant">Assistant</a>
              <a href="/store-a">Demo stores</a>
              <a href="/workspace">Your checkouts</a>
              <a href="/handoff">Enter a pairing code</a>
            </nav>
            <div className="header-actions">
              <span className="sandbox-tag">
                <span aria-hidden="true" />
                Sandbox
              </span>
              {actor ? (
                <form action={signOut}>
                  <button className="text-button" type="submit">
                    Sign out
                  </button>
                </form>
              ) : (
                <a href="/sign-in" className="button secondary compact">
                  Sign in
                </a>
              )}
            </div>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <footer className="site-footer">
          <div className="footer-main">
            <a className="brand small-brand" href="/">
              accesspay.
            </a>
            <p>Every payment. Every ability. Every device.</p>
            <nav aria-label="Footer">
              <a href="/accessibility">Accessibility &amp; limitations</a>
              <a href="/integration">For developers</a>
            </nav>
          </div>
          <details className="preferences">
            <summary>Reading preferences</summary>
            <div className="preference-groups">
              <form action={savePreference}>
                <PreferenceReturn />
                <fieldset>
                  <legend>Color theme</legend>
                  {["system", "light", "dark"].map((t) => (
                    <button
                      key={t}
                      type="submit"
                      className="button secondary compact"
                      name="theme"
                      value={t}
                      aria-pressed={theme === t}
                    >
                      {t[0].toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </fieldset>
              </form>
              <form action={savePreference}>
                <PreferenceReturn />
                <fieldset>
                  <legend>Text size</legend>
                  {["standard", "large"].map((s) => (
                    <button
                      key={s}
                      type="submit"
                      className="button secondary compact"
                      name="size"
                      value={s}
                      aria-pressed={size === s}
                    >
                      {s === "large" ? "Large" : "Standard"}
                    </button>
                  ))}
                </fieldset>
              </form>
            </div>
          </details>
          <p className="small muted footer-disclosure">
            Demo environment. No live payments. Both demo stores use one sandbox
            seller. English checkout only.
          </p>
        </footer>
      </body>
    </html>
  );
}
