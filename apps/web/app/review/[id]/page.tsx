import { notFound } from "next/navigation";
import { amountReadback, isCheckoutError } from "@accesspay/core";
import { PageFocus, Icon } from "@accesspay/a11y";
import { CheckoutWorkspace } from "../../../components/checkout-workspace";
import { NextStep } from "../../../components/next-step";
import { pageIdentity } from "../../../lib/auth";
import { runtime, paymentConfigured } from "../../../lib/runtime";
import {
  askHelp,
  makeHandoff,
  reviewCheckout,
  updateCheckout,
  cancelCheckout,
} from "../../actions";
export const metadata = {
  title: "Review your payment",
  robots: { index: false, follow: false },
};
const errors: Record<string, string> = {
  STALE_VERSION: "Your order changed. Review the latest details below.",
  VIEW_ONLY:
    "This checkout is active on another device. You can read its status here.",
  EXPIRED: "This checkout expired. Return to the store to start again.",
  LOCKED:
    "This order is already with PayPal. Check payment status before trying anything else.",
  UNAVAILABLE:
    "The service is unavailable. Check payment status before retrying.",
};
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params,
    actor = await pageIdentity(`/review/${id}`),
    { service } = await runtime();
  const s = await service.get(actor, id).catch((error) => {
    if (isCheckoutError(error) && error.status === 404) notFound();
    throw error;
  });
  const query = await searchParams;
  const actions = {
    review: reviewCheckout.bind(null, s.id, s.version),
    update: updateCheckout.bind(null, s.id, s.version),
    cancel: cancelCheckout.bind(null, s.id, s.version),
    handoff: makeHandoff.bind(null, s.id, s.version),
    help: askHelp.bind(null, s.id),
  };
  return (
    <div className="page-container review-page">
      <PageFocus identity={`${s.id}:${s.version}`} />
      <a href={`/${s.storeId}`} className="back-link">
        <Icon name="back" size={18} />
        Back to {s.merchantDisplayName}
      </a>
      <div className="page-heading">
        <div>
          <h1 tabIndex={-1}>Review your payment</h1>
          <p className="muted">
            Everything you need to know, before you say yes.
          </p>
        </div>
        <span className="badge">
          <Icon name="lock" size={15} />
          Sandbox checkout
        </span>
      </div>
      {s.canEdit && s.state === "REVIEW_REQUIRED" ? (
        <NextStep
          text={`You are paying ${amountReadback(s.totalMinor)} to ${s.merchantDisplayName}. Check the order below, or skip to the Confirm review button. Nothing is paid until you approve in PayPal.`}
          label="Skip to Confirm review"
          targetId="confirm-review"
        />
      ) : null}
      {s.canEdit && ["READY", "CREATING", "CREATED"].includes(s.state) ? (
        <NextStep
          text={`Review confirmed. Next, approve ${amountReadback(s.totalMinor)} with PayPal.`}
          label="Skip to the PayPal button"
          targetId="paypal-next"
          focusOnLoad
        />
      ) : null}
      <ol className="checkout-steps" aria-label="Payment progress">
        <li
          aria-current={
            ["REVIEW_REQUIRED", "READY"].includes(s.state) ? "step" : undefined
          }
        >
          <span>1</span>Review details
        </li>
        <li
          aria-current={
            ["CREATED", "PENDING", "CAPTURING", "APPROVED"].includes(s.state)
              ? "step"
              : undefined
          }
        >
          <span>2</span>Approve with PayPal
        </li>
        <li aria-current={s.state === "COMPLETED" ? "step" : undefined}>
          <span>3</span>Get your receipt
        </li>
      </ol>
      {query.error ? (
        <div className="notice error">
          <p>{errors[query.error] ?? "Check your order and try again."}</p>
        </div>
      ) : null}
      <CheckoutWorkspace
        session={s}
        actions={actions}
        paypalClientId={
          paymentConfigured() ? process.env.PAYPAL_CLIENT_ID : undefined
        }
      />
    </div>
  );
}
