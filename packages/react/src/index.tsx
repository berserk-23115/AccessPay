"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useActionState,
  type ReactNode,
} from "react";
import {
  amountReadback,
  money,
  stateLabels,
  type PublicSession,
} from "@accesspay/core";
import type {
  CheckoutActions,
  FormResult,
  MerchantAdapter,
} from "@accesspay/merchant-adapter";
import { Icon, playHaptic, type Haptic } from "@accesspay/a11y";

type Context = {
  session: PublicSession;
  actions: CheckoutActions;
  adapter: MerchantAdapter;
  setSession(s: PublicSession): void;
  announce(message: string): void;
  clientId?: string;
};
const stateHaptics: Partial<Record<PublicSession["state"], Haptic>> = {
  COMPLETED: "success",
  FAILED: "failure",
  CANCELLED: "attention",
  PENDING: "attention",
};
const CheckoutContext = createContext<Context | null>(null);
function useCheckout() {
  const value = useContext(CheckoutContext);
  if (!value) throw Error("Use checkout components inside AccessPayProvider.");
  return value;
}
export function AccessPayProvider({
  initialSession,
  adapter,
  actions,
  paypalClientId,
  children,
}: {
  initialSession: PublicSession;
  adapter: MerchantAdapter;
  actions: CheckoutActions;
  paypalClientId?: string;
  children: ReactNode;
}) {
  const [session, setSession] = useState(initialSession),
    [status, announce] = useState("");
  const lastState = useRef(initialSession.state);
  useEffect(() => {
    if (session.state === lastState.current) return;
    lastState.current = session.state;
    const haptic = stateHaptics[session.state];
    if (haptic) playHaptic(haptic);
  }, [session.state]);
  useEffect(() => {
    if (["COMPLETED", "FAILED", "CANCELLED"].includes(session.state)) return;
    let active = true;
    const timer = window.setInterval(async () => {
      try {
        const next = await adapter.getPaymentStatus();
        if (active)
          setSession((previous) => {
            if (
              next.state !== previous.state ||
              next.canEdit !== previous.canEdit ||
              next.version !== previous.version
            ) {
              announce(
                next.canEdit
                  ? stateLabels[next.state]
                  : "Checkout is active on another device. This page is view-only.",
              );
              return next;
            }
            return previous;
          });
      } catch {
        /* Keep last known state. Explicit Check status surfaces connection failures. */
      }
    }, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [adapter, session.state]);
  return (
    <CheckoutContext.Provider
      value={{
        session,
        setSession,
        announce,
        adapter,
        actions,
        clientId: paypalClientId,
      }}
    >
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {status}
      </div>
      {children}
    </CheckoutContext.Provider>
  );
}
export function AccessibleCheckout({
  storeId,
  sku,
  action,
}: {
  storeId: string;
  sku: string;
  action(form: FormData): Promise<void>;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="storeId" value={storeId} />
      <input type="hidden" name="sku" value={sku} />
      <input type="hidden" name="qty" value="1" />
      <button className="button primary" type="submit">
        <Icon name="bag" />
        Pay with AccessPay
      </button>
    </form>
  );
}
export function AmountReadback({
  minor,
  className,
}: {
  minor: number;
  className?: string;
}) {
  return (
    <span className={className}>
      <span aria-hidden="true">{money(minor)}</span>
      <span className="sr-only">{amountReadback(minor)}</span>
    </span>
  );
}
export function AccessibleError({ children }: { children?: ReactNode }) {
  return children ? (
    <div className="notice error">
      <strong>Action needed</strong>
      <p>{children}</p>
    </div>
  ) : null;
}
export function AccessPayReview() {
  const { session: s, actions } = useCheckout();
  const editable = s.canEdit && ["REVIEW_REQUIRED", "READY"].includes(s.state);
  return (
    <section className="review-details" aria-labelledby="merchant-heading">
      <div className="merchant-heading">
        <span
          className={`store-avatar ${s.storeId === "store-b" ? "field" : ""}`}
          aria-hidden="true"
        >
          {s.storeId === "store-a" ? "N" : "f."}
        </span>
        <div>
          <p className="muted small">You’re paying</p>
          <h2 id="merchant-heading">{s.merchantDisplayName}</h2>
          <p className="small muted">
            Participating demo merchant · One sandbox seller
          </p>
        </div>
      </div>
      <div className="section-line">
        <h3>Your order</h3>
        <span className="muted small">
          {s.lineItems.reduce((n, i) => n + i.qty, 0)} item
          {s.lineItems.reduce((n, i) => n + i.qty, 0) === 1 ? "" : "s"}
        </span>
      </div>
      <ul className="order-items">
        {s.lineItems.map((item) => (
          <li key={item.sku}>
            <img
              src={`/products/${item.sku}.svg`}
              alt=""
              width="88"
              height="88"
            />
            <div className="item-description">
              <h4>{item.name}</h4>
              <p className="muted small">Quantity {item.qty}</p>
              <p className="muted small">{money(item.unitMinor)} each</p>
            </div>
            <strong>{money(item.unitMinor * item.qty)}</strong>
          </li>
        ))}
      </ul>
      <dl className="amount-list">
        <div>
          <dt>Subtotal</dt>
          <dd>{money(s.subtotalMinor)}</dd>
        </div>
        <div>
          <dt>Standard shipping</dt>
          <dd>{money(s.shippingMinor)}</dd>
        </div>
        <div>
          <dt>
            Tax <span className="muted">(5.6%)</span>
          </dt>
          <dd>{money(s.taxMinor)}</dd>
        </div>
        <div className="total-line">
          <dt>
            Total <span className="muted small">USD</span>
          </dt>
          <dd>
            <AmountReadback minor={s.totalMinor} />
          </dd>
        </div>
      </dl>
      <div className="policies">
        <div>
          <Icon name="bag" />
          <div>
            <h3>Delivery</h3>
            <p>{s.delivery}</p>
          </div>
        </div>
        <div>
          <Icon name="back" />
          <div>
            <h3>Returns</h3>
            <p>{s.returnPolicy}</p>
          </div>
        </div>
      </div>
      {editable ? (
        <details className="edit-order">
          <summary>Change quantities</summary>
          <form action={actions.update}>
            <p className="small muted">
              We’ll calculate the new total and ask you to review it again.
            </p>
            {s.lineItems.map((item) => (
              <div className="field" key={item.sku}>
                <label htmlFor={`qty-${item.sku}`}>
                  Quantity for {item.name}
                </label>
                <input
                  id={`qty-${item.sku}`}
                  name={`qty:${item.sku}`}
                  type="number"
                  min="1"
                  max="10"
                  step="1"
                  defaultValue={item.qty}
                  required
                />
              </div>
            ))}
            <button className="button secondary" type="submit">
              Update order
            </button>
          </form>
        </details>
      ) : null}
    </section>
  );
}
export function PaymentStatus() {
  const { session: s, adapter, setSession, announce } = useCheckout();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (["COMPLETED", "FAILED", "CANCELLED"].includes(s.state))
      heading.current?.focus();
  }, [s.state]);
  async function refresh() {
    setBusy(true);
    setError("");
    try {
      const next = await adapter.getPaymentStatus();
      setSession(next);
      announce(stateLabels[next.state]);
    } catch {
      const text =
        "Status unavailable. Your payment is not confirmed. Check again before starting another payment.";
      setError(text);
      announce(text);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className={`payment-status ${s.state === "COMPLETED" ? "complete" : ""}`}
      aria-labelledby="payment-state"
    >
      <h2 ref={heading} tabIndex={-1} id="payment-state">
        {stateLabels[s.state]}
      </h2>
      {!s.canEdit ? (
        <p>
          This checkout is active on another device. This page is view-only.
        </p>
      ) : null}
      {s.completedOnAnotherDevice ? <p>Completed on another device.</p> : null}
      {s.state === "PENDING" ? (
        <p>Do not start another payment. We’ll check this same PayPal order.</p>
      ) : null}
      {s.state === "CANCELLED" ? <p>No PayPal payment was started.</p> : null}
      {s.state === "FAILED" ? (
        <p>
          PayPal did not complete this payment. Return to the store when you’re
          ready to try again.
        </p>
      ) : null}
      {s.receiptId ? (
        <a className="button primary" href={`/receipts/${s.receiptId}`}>
          Open receipt
          <Icon name="arrow" />
        </a>
      ) : (
        <button
          type="button"
          className="text-button"
          onClick={refresh}
          disabled={busy}
        >
          {busy ? "Checking status…" : "Check payment status"}
        </button>
      )}
      <AccessibleError>{error}</AccessibleError>
    </section>
  );
}
export function AccessPayCheckout() {
  const { session: s, actions } = useCheckout();
  const active =
    s.canEdit &&
    [
      "REVIEW_REQUIRED",
      "READY",
      "CREATING",
      "CREATED",
      "APPROVED",
      "CAPTURING",
      "PENDING",
    ].includes(s.state);
  return (
    <section className="payment-card" aria-labelledby="ready-heading">
      <div className="card-icon">
        <Icon name="shield" size={28} />
      </div>
      <h2 id="ready-heading">Your payment. Your pace.</h2>
      <p className="muted">
        Check the details, then choose when to continue. You’re in control.
      </p>
      <div className="payment-total">
        <span>Total to pay</span>
        <AmountReadback minor={s.totalMinor} />
      </div>
      {active && s.state === "REVIEW_REQUIRED" ? (
        <form action={actions.review}>
          <p className="small">
            Confirm that the merchant, items, and total are correct. This step
            does not make a payment.
          </p>
          <button className="button primary full" type="submit">
            Confirm review
            <Icon name="arrow" />
          </button>
        </form>
      ) : null}
      {active && s.state !== "REVIEW_REQUIRED" ? <PayPalPaymentArea /> : null}
      <p className="trust-note">
        <Icon name="lock" size={16} />
        Payment approval happens securely with PayPal.
      </p>
      {s.canEdit && ["REVIEW_REQUIRED", "READY"].includes(s.state) ? (
        <form action={actions.cancel}>
          <button type="submit" className="text-button">
            Cancel this checkout
          </button>
        </form>
      ) : null}
    </section>
  );
}
export function PayPalPaymentArea() {
  const { clientId, session: s, announce, adapter, setSession } = useCheckout();
  const [load, setLoad] = useState(false),
    [finishing, setFinishing] = useState(false),
    [failure, setFailure] = useState("");
  useEffect(() => {
    setLoad(true);
  }, []);
  if (!clientId)
    return (
      <div className="notice">
        <strong>PayPal sandbox is not connected.</strong>
        <p>
          Your draft is unpaid. The project owner needs to connect sandbox
          credentials before you can pay.
        </p>
        <a href="/integration">View setup instructions</a>
      </div>
    );
  if (s.state === "APPROVED" && s.orderId)
    return (
      <div>
        <p>
          PayPal has approved this order. Complete the existing approved payment
          below.
        </p>
        <button
          type="button"
          className="button primary full"
          disabled={finishing}
          onClick={async () => {
            setFinishing(true);
            try {
              const next = await adapter.capturePayPalOrder(s.orderId!);
              setSession(next);
              announce(stateLabels[next.state]);
            } catch {
              setFailure(
                "Payment status is pending. Check status before retrying.",
              );
              announce("Payment status is pending.");
            } finally {
              setFinishing(false);
            }
          }}
        >
          {finishing ? "Checking payment…" : "Complete this approved payment"}
        </button>
        <AccessibleError>{failure}</AccessibleError>
      </div>
    );
  if (s.state === "CAPTURING")
    return (
      <p>
        Checking payment with PayPal. Use “Check payment status” if this takes
        longer than expected.
      </p>
    );
  return (
    <div>
      <p className="small">
        <Icon name="check" size={16} /> Review confirmed. PayPal will ask you to
        approve {money(s.totalMinor)} USD.
      </p>
      {load ? <PayPalLazy /> : <p>Loading PayPal…</p>}
      <noscript>
        <p>
          PayPal’s official button requires JavaScript. Your review is saved.
          Enable JavaScript to open PayPal, or continue on another supported
          device.
        </p>
      </noscript>
    </div>
  );
}
// Delay the payment library until a reviewed checkout actually needs it.
import { lazy, Suspense } from "react";
const PayPalButton = lazy(() => import("./paypal-button"));
function PayPalLazy() {
  const context = useCheckout();
  return (
    <Suspense fallback={<p>Loading PayPal checkout…</p>}>
      <PayPalButton
        clientId={context.clientId!}
        session={context.session}
        adapter={context.adapter}
        onSession={context.setSession}
        announce={context.announce}
      />
    </Suspense>
  );
}
function Feedback({ result }: { result: FormResult }) {
  const { announce } = useCheckout();
  useEffect(() => {
    if (result.error || result.message)
      announce(result.error ?? result.message!);
  }, [result, announce]);
  return (
    <>
      <AccessibleError>{result.error}</AccessibleError>
      {result.message ? <p className="small">{result.message}</p> : null}
    </>
  );
}
export function HelpDrawer() {
  const { actions } = useCheckout();
  const [result, action, pending] = useActionState(actions.help, {});
  return (
    <section className="help-panel" aria-labelledby="help-heading">
      <div className="section-line">
        <h2 id="help-heading">
          <Icon name="help" />A little clarity, if you need it.
        </h2>
        <span className="badge">Text first</span>
      </div>
      <p className="muted">
        Ask about fees, delivery, or returns. No microphone needed.
      </p>
      <form action={action}>
        <div className="field">
          <label htmlFor="question">Your question</label>
          <input
            id="question"
            name="question"
            maxLength={500}
            required
            placeholder="Why is there a shipping fee?"
            aria-describedby="help-limit"
          />
        </div>
        <p id="help-limit" className="small muted">
          Help explains merchant facts. It cannot change your order or make a
          payment.
        </p>
        <button type="submit" className="button secondary" disabled={pending}>
          {pending ? "Finding the merchant facts…" : "Ask about this order"}
        </button>
      </form>
      <Feedback result={result} />
      {result.answer ? (
        <div className="help-answer">
          <h3>Merchant facts</h3>
          <p>{result.answer}</p>
          <p className="small muted">
            Order version {result.version}.{" "}
            {result.mode === "ai-routed"
              ? "AI matched your question to these facts."
              : "From the merchant’s checkout information."}
          </p>
        </div>
      ) : null}
    </section>
  );
}
export function ContinueOnPhone() {
  const { session: s, actions } = useCheckout(),
    [result, action, pending] = useActionState(actions.handoff, {});
  if (!s.canEdit || !["REVIEW_REQUIRED", "READY"].includes(s.state))
    return null;
  return (
    <section className="handoff-panel" aria-labelledby="phone-heading">
      <Icon name="phone" size={26} />
      <h2 id="phone-heading">Continue on your phone</h2>
      <p className="muted">
        Move this unpaid draft to another device. You’ll review it again before
        paying.
      </p>
      <form action={action}>
        <button
          className="button secondary full"
          type="submit"
          disabled={pending}
        >
          {pending ? "Creating code…" : "Create pairing code"}
        </button>
      </form>
      <Feedback result={result} />
      {result.code ? (
        <div className="pairing">
          <label htmlFor="pair-code">Your one-time pairing code</label>
          <output className="pair-code" id="pair-code">
            {result.code}
          </output>
          <p className="small">
            Expires at{" "}
            {new Date(result.expiresAt!).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
            . Create a new code if it expires.
          </p>
          <p className="small">
            Open <strong>this AccessPay site</strong> on your phone, sign in to
            the same account, and choose{" "}
            <a href="/handoff">Enter a pairing code</a>.
          </p>
        </div>
      ) : null}
    </section>
  );
}
export function AccessPayReceipt() {
  const { session: s } = useCheckout();
  return s.receiptId ? (
    <a href={`/receipts/${s.receiptId}`} className="button primary">
      View payment receipt
    </a>
  ) : null;
}
export const Receipt = AccessPayReceipt;
