"use client";
import { useMemo } from "react";
import {
  AccessPayProvider,
  AccessPayReview,
  AccessPayCheckout,
  PaymentStatus,
  HelpDrawer,
  ContinueOnPhone,
} from "@accesspay/react";
import type {
  CheckoutActions,
  MerchantAdapter,
} from "@accesspay/merchant-adapter";
import type { PublicSession } from "@accesspay/core";
async function call<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: body === undefined ? "GET" : "POST",
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "same-origin",
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      result.error?.message ?? "The checkout service is unavailable.",
    );
  return result;
}
export function CheckoutWorkspace({
  session,
  actions,
  paypalClientId,
}: {
  session: PublicSession;
  actions: CheckoutActions;
  paypalClientId?: string;
}) {
  const adapter = useMemo<MerchantAdapter>(() => {
    const base = `/api/checkout-sessions/${session.id}`;
    return {
      getSession: () => call(base),
      createPayPalOrder: (version) => call(`${base}/paypal/order`, { version }),
      capturePayPalOrder: (orderId) =>
        call(`${base}/paypal/capture`, { orderId }),
      getPaymentStatus: () => call(`${base}/status`),
    };
  }, [session.id]);
  return (
    <AccessPayProvider
      key={`${session.id}:${session.version}:${session.state}`}
      initialSession={session}
      adapter={adapter}
      actions={actions}
      paypalClientId={paypalClientId}
    >
      <div className="checkout-grid">
        <AccessPayReview />
        <AccessPayCheckout />
        <HelpDrawer />
        <ContinueOnPhone />
        <PaymentStatus />
        <p className="small muted aside-note">
          Use your keyboard, screen reader, or braille input. No speech
          required.
        </p>
      </div>
    </AccessPayProvider>
  );
}
