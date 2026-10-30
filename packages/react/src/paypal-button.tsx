"use client";
import { useState } from "react";
import {
  PayPalProvider,
  PayPalOneTimePaymentButton,
} from "@paypal/react-paypal-js/sdk-v6";
import type { PublicSession } from "@accesspay/core";
import type { MerchantAdapter } from "@accesspay/merchant-adapter";
export default function PayPalButton({
  clientId,
  session,
  adapter,
  onSession,
  announce,
}: {
  clientId: string;
  session: PublicSession;
  adapter: MerchantAdapter;
  onSession(s: PublicSession): void;
  announce(s: string): void;
}) {
  const [error, setError] = useState("");
  function failure(message: string) {
    setError(message);
    announce(message);
  }
  return (
    <>
      <PayPalProvider
        clientId={clientId}
        environment="sandbox"
        components={["paypal-payments"]}
        pageType="checkout"
      >
        <PayPalOneTimePaymentButton
          createOrder={async () => {
            setError("");
            try {
              return await adapter.createPayPalOrder(session.version);
            } catch (e) {
              failure(
                e instanceof Error
                  ? e.message
                  : "PayPal is unavailable. Check payment status before retrying.",
              );
              throw e;
            }
          }}
          onApprove={async ({ orderId }) => {
            try {
              const result = await adapter.capturePayPalOrder(orderId);
              onSession(result);
              announce(
                result.state === "COMPLETED"
                  ? "Payment completed. Your receipt is ready."
                  : "Payment is not confirmed. Check payment status.",
              );
            } catch {
              failure(
                "Payment status is pending. Check status before retrying.",
              );
            }
          }}
          onCancel={() => {
            failure(
              "PayPal closed. Payment is not confirmed. Check status, or reopen this same PayPal order.",
            );
          }}
          onError={() =>
            failure(
              "PayPal could not finish this step. Check payment status before retrying.",
            )
          }
          presentationMode="auto"
        />
      </PayPalProvider>
      {error ? <p className="notice error">{error}</p> : null}
      <p className="small muted">
        If PayPal does not open on this browser, keep this checkout and use a
        supported browser. Never start a second payment while status is pending.
      </p>
    </>
  );
}
