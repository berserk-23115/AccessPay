import { PageFocus } from "@accesspay/a11y";
import { pageIdentity } from "../../lib/auth";
import { AssistantForm } from "../../components/assistant-form";
import { NextStep } from "../../components/next-step";
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
          <NextStep
            text="Type or dictate what you want in the request box, then choose Find this. You will hear a suggested order, and nothing is paid until you approve in PayPal."
            label="Skip to the request box"
            targetId="request"
          />
          <p className="muted">
            Type or dictate a request. You’ll review the exact order before
            anything is paid.
          </p>
          <p className="muted">
            Your request is sent to an AI service (Groq) to find matching
            products. Card numbers, emails and phone numbers are removed first,
            and payment details are never sent.
          </p>
        </div>
      </div>
      <AssistantForm />
    </div>
  );
}
