import { notFound } from "next/navigation";
import { isCheckoutError, money, amountReadback } from "@accesspay/core";
import { PageFocus, Icon } from "@accesspay/a11y";
import { pageIdentity } from "../../../lib/auth";
import { runtime } from "../../../lib/runtime";
export const metadata = {
  title: "Payment receipt",
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params,
    actor = await pageIdentity(`/receipts/${id}`),
    receipt = await (
      await runtime()
    ).service
      .receipt(actor, id)
      .catch((error) => {
        if (isCheckoutError(error) && error.status === 404) notFound();
        throw error;
      });
  return (
    <div className="narrow-page receipt-page">
      <PageFocus identity={id} />
      <div className="receipt-check">
        <Icon name="check" size={36} />
      </div>
      <h1 tabIndex={-1}>Payment completed</h1>
      <p className="muted">
        PayPal confirmed this sandbox payment. Your receipt stays here for you.
      </p>
      <section className="receipt-paper" aria-labelledby="receipt-heading">
        <h2 id="receipt-heading">Sandbox receipt</h2>
        <p>{receipt.merchant}</p>
        <p className="receipt-amount">
          <span aria-hidden="true">{money(receipt.totalMinor)} USD</span>
          <span className="sr-only">{amountReadback(receipt.totalMinor)}</span>
        </p>
        <dl className="receipt-data">
          <div>
            <dt>Status</dt>
            <dd>Completed · Verified with PayPal</dd>
          </div>
          <div>
            <dt>Date</dt>
            <dd>
              {new Date(receipt.completedAt).toLocaleString("en-GB", {
                timeZone: "Asia/Kolkata",
              })}{" "}
              IST
            </dd>
          </div>
          <div>
            <dt>PayPal capture</dt>
            <dd>{receipt.captureId}</dd>
          </div>
          <div>
            <dt>Receipt reference</dt>
            <dd>{receipt.id}</dd>
          </div>
        </dl>
      </section>
      <div className="button-row">
        <a className="button primary" href="/workspace">
          Your payment workspace
        </a>
        <a className="button secondary" href={`/review/${receipt.sessionId}`}>
          View order details
        </a>
      </div>
    </div>
  );
}
