import { PageFocus, Icon } from "@accesspay/a11y";
import { signIn } from "../actions";
import { safeReturnPath } from "../../lib/security";
export const metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const query = await searchParams;
  const local =
    process.env.NODE_ENV !== "production" && !process.env.DEMO_ACCOUNT_PASSWORD;
  return (
    <div className="auth-page">
      <PageFocus identity="sign-in" />
      <div className="auth-intro">
        <span className="card-icon">
          <Icon name="shield" size={30} />
        </span>
        <h1 tabIndex={-1}>
          Your checkout,
          <br />
          where you need it.
        </h1>
        <p className="muted">
          Sign in to save your draft, continue on another device, and find your
          receipts.
        </p>
      </div>
      <div className="auth-card">
        <h2>Sign in to the demo</h2>
        <p className="muted">
          Use the same account on both devices to move an unpaid draft.
        </p>
        {query.error ? (
          <div className="notice error">
            <p>
              Email or password did not match. Use the demo account details.
            </p>
          </div>
        ) : null}
        <form action={signIn}>
          <input
            type="hidden"
            name="next"
            value={safeReturnPath(query.next ?? "/workspace")}
          />
          <div className="field">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              maxLength={100}
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={200}
            />
          </div>
          <button type="submit" className="button primary full">
            Sign in
            <Icon name="arrow" />
          </button>
        </form>
        <div className="demo-credentials">
          <strong>Test account only</strong>
          <p>
            Email: <span className="break-text">demo@accesspay.test</span>
          </p>
          {local ? (
            <p>
              Password: <span className="break-text">accesspay-demo-only</span>
            </p>
          ) : (
            <p>Use the demo password shared by the project owner.</p>
          )}
          <p className="small muted">
            You can paste a password or use a password manager. This is a shared
            test account; do not enter personal information.
          </p>
        </div>
      </div>
    </div>
  );
}
