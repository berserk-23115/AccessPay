import { money, stateLabels } from "@accesspay/core";
import { Icon, PageFocus } from "@accesspay/a11y";
import { pageIdentity } from "../../lib/auth";
import { runtime } from "../../lib/runtime";
export const metadata = {
  title: "Your checkouts",
  robots: { index: false, follow: false },
};
export default async function Page() {
  const actor = await pageIdentity("/workspace"),
    sessions = await (await runtime()).service.list(actor);
  return (
    <div className="page-container">
      <PageFocus identity="workspace" />
      <div className="page-heading">
        <div>
          <h1 tabIndex={-1}>Your payment workspace</h1>
          <p className="muted">
            Your saved reviews and payment records, in one place.
          </p>
        </div>
        <a href="/handoff" className="button secondary">
          <Icon name="phone" />
          Enter a pairing code
        </a>
      </div>
      <div className="notice">
        <strong>Demo account</strong>
        <p>
          This is a shared test account. Use sample orders only. Never enter
          personal or real payment information.
        </p>
      </div>
      <section className="workspace-list" aria-label="Saved checkouts">
        {sessions.length ? (
          sessions.map((s) => (
            <article className="workspace-row" key={s.id}>
              <span
                className={`store-avatar ${s.storeId === "store-b" ? "field" : ""}`}
                aria-hidden="true"
              >
                {s.storeId === "store-a" ? "N" : "f."}
              </span>
              <div className="workspace-description">
                <h2>
                  <a href={`/review/${s.id}`}>{s.merchantDisplayName}</a>
                </h2>
                <p className="muted small">
                  {s.lineItems.map((i) => `${i.name} × ${i.qty}`).join(", ")}
                </p>
                <p className="small">{stateLabels[s.state]}</p>
              </div>
              <div className="workspace-amount">
                <strong>{money(s.totalMinor)} USD</strong>
                {s.receiptId ? (
                  <a href={`/receipts/${s.receiptId}`}>Open receipt</a>
                ) : (
                  <a href={`/review/${s.id}`}>Open checkout</a>
                )}
              </div>
            </article>
          ))
        ) : (
          <div className="empty-state">
            <Icon name="bag" size={42} />
            <h2>Your next checkout starts here.</h2>
            <p>
              Visit a demo store and choose a product. Your review will be saved
              to this account.
            </p>
            <a className="button primary" href="/store-a">
              Explore Northstar Goods
              <Icon name="arrow" />
            </a>
          </div>
        )}
      </section>
    </div>
  );
}
