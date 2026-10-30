import { Icon, PageFocus } from "@accesspay/a11y";
import { pageIdentity } from "../../lib/auth";
import { RedeemForm } from "../../components/redeem-form";
export const metadata = {
  title: "Continue on this device",
  robots: { index: false, follow: false },
};
export default async function Page() {
  await pageIdentity("/handoff");
  return (
    <div className="narrow-page">
      <PageFocus identity="handoff" />
      <div className="card-icon">
        <Icon name="phone" size={32} />
      </div>
      <h1 tabIndex={-1}>Pick up where you left off.</h1>
      <p className="muted">
        Enter the pairing code from your original device. This moves an unpaid
        draft to this device and asks you to review it again.
      </p>
      <div className="auth-card">
        <h2>Continue on this device</h2>
        <RedeemForm />
      </div>
      <p className="small muted">
        You must be signed in to the same account on both devices. Codes expire
        after 90 seconds. Payment approval never transfers with a draft.
      </p>
      <a href="/workspace">Back to your workspace</a>
    </div>
  );
}
