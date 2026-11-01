import { PageFocus } from "@accesspay/a11y";
import { pageIdentity } from "../../lib/auth";
import { AssistantForm } from "../../components/assistant-form";
export const metadata = {
  title: "Assistant",
  robots: { index: false, follow: false },
};
export default async function Page() {
  await pageIdentity("/assistant");
  return (
    <div className="page-container">
      <PageFocus identity="assistant" />
      <div className="page-heading">
        <div>
          <h1 tabIndex={-1}>Tell us what you want to buy</h1>
          <p className="muted">
            Type or dictate a request. You’ll review the exact order before
            anything is paid.
          </p>
        </div>
      </div>
      <AssistantForm />
    </div>
  );
}
