import {
  Client,
  Environment,
  OrdersController,
  CheckoutPaymentIntent,
} from "@paypal/paypal-server-sdk";
import {
  CheckoutError,
  decimalAmount,
  type CheckoutSession,
} from "@accesspay/core";
import type {
  PaymentGateway,
  ProviderOrder,
} from "../../merchant-adapter/src/gateway";
function parseMinor(value: string | undefined) {
  if (!value || !/^\d{1,8}\.\d{2}$/.test(value))
    throw new Error("Unexpected provider money representation");
  const [whole, fraction] = value.split(".");
  const minor = Number(whole) * 100 + Number(fraction);
  if (!Number.isSafeInteger(minor)) throw new Error("Invalid provider amount");
  return minor;
}
type ProviderPayload = {
  id?: string;
  status?: string;
  purchaseUnits?: {
    customId?: string;
    payee?: { merchantId?: string };
    amount?: { value?: string; currencyCode?: string };
    payments?: {
      captures?: {
        id?: string;
        status?: string;
        amount?: { value?: string; currencyCode?: string };
      }[];
    };
  }[];
};
export function normalizeOrder(order: ProviderPayload): ProviderOrder {
  if (!order.id || order.purchaseUnits?.length !== 1)
    throw new Error("Expected one purchase unit");
  const unit = order.purchaseUnits[0],
    captures = unit.payments?.captures ?? [];
  if (captures.length > 1)
    throw new Error("Multiple captures need manual reconciliation");
  const capture = captures[0];
  return {
    id: order.id,
    status: order.status ?? "UNKNOWN",
    sessionId: unit.customId ?? "",
    sellerId: unit.payee?.merchantId ?? "",
    currency: unit.amount?.currencyCode ?? "",
    totalMinor: parseMinor(unit.amount?.value),
    capture: capture
      ? {
          id: capture.id ?? "",
          status: capture.status ?? "UNKNOWN",
          currency: capture.amount?.currencyCode ?? "",
          totalMinor: parseMinor(capture.amount?.value),
        }
      : undefined,
  };
}
export class PayPalGateway implements PaymentGateway {
  private controller: OrdersController;
  constructor(
    private config: { clientId: string; secret: string; sellerId: string },
  ) {
    const client = new Client({
      clientCredentialsAuthCredentials: {
        oAuthClientId: config.clientId,
        oAuthClientSecret: config.secret,
      },
      environment: Environment.Sandbox,
      timeout: 10000,
    });
    this.controller = new OrdersController(client);
  }
  async create(s: CheckoutSession, requestId: string) {
    const { result } = await this.controller.createOrder({
      paypalRequestId: requestId,
      prefer: "return=representation",
      body: {
        intent: CheckoutPaymentIntent.Capture,
        purchaseUnits: [
          {
            customId: s.id,
            referenceId: `${s.id}:v${s.version}`,
            payee: { merchantId: this.config.sellerId },
            description: `${s.merchantDisplayName} sandbox checkout`,
            amount: {
              currencyCode: s.currency,
              value: decimalAmount(s.totalMinor),
              breakdown: {
                itemTotal: {
                  currencyCode: s.currency,
                  value: decimalAmount(s.subtotalMinor),
                },
                shipping: {
                  currencyCode: s.currency,
                  value: decimalAmount(s.shippingMinor),
                },
                taxTotal: {
                  currencyCode: s.currency,
                  value: decimalAmount(s.taxMinor),
                },
              },
            },
            items: s.lineItems.map((item) => ({
              name: item.name,
              sku: item.sku,
              quantity: String(item.qty),
              unitAmount: {
                currencyCode: s.currency,
                value: decimalAmount(item.unitMinor),
              },
            })),
          },
        ],
      },
    });
    if (!result.id) throw new Error("PayPal did not return an order ID");
    return result.id;
  }
  async get(id: string) {
    return normalizeOrder((await this.controller.getOrder({ id })).result);
  }
  async capture(id: string, requestId: string) {
    await this.controller.captureOrder({
      id,
      paypalRequestId: requestId,
      prefer: "return=representation",
    });
    return this.get(id);
  }
}
export class UnconfiguredGateway implements PaymentGateway {
  async create(): Promise<string> {
    throw new CheckoutError(
      "PAYPAL_UNAVAILABLE",
      "PayPal sandbox is not configured.",
      503,
    );
  }
  async get(): Promise<ProviderOrder> {
    throw new CheckoutError(
      "PAYPAL_UNAVAILABLE",
      "PayPal sandbox is not configured.",
      503,
    );
  }
  async capture(): Promise<ProviderOrder> {
    throw new CheckoutError(
      "PAYPAL_UNAVAILABLE",
      "PayPal sandbox is not configured.",
      503,
    );
  }
}
export async function verifyWebhook(
  headers: Headers,
  event: unknown,
  config: { clientId: string; secret: string; webhookId: string },
) {
  const names = [
    "paypal-auth-algo",
    "paypal-cert-url",
    "paypal-transmission-id",
    "paypal-transmission-sig",
    "paypal-transmission-time",
  ];
  if (names.some((name) => !headers.get(name))) return false;
  const tokenResponse = await fetch(
    "https://api-m.sandbox.paypal.com/v1/oauth2/token",
    {
      method: "POST",
      signal: AbortSignal.timeout(10000),
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.secret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    },
  );
  if (!tokenResponse.ok) throw new Error("Webhook authentication unavailable");
  const { access_token } = await tokenResponse.json();
  const response = await fetch(
    "https://api-m.sandbox.paypal.com/v1/notifications/verify-webhook-signature",
    {
      method: "POST",
      signal: AbortSignal.timeout(10000),
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        auth_algo: headers.get(names[0]),
        cert_url: headers.get(names[1]),
        transmission_id: headers.get(names[2]),
        transmission_sig: headers.get(names[3]),
        transmission_time: headers.get(names[4]),
        webhook_id: config.webhookId,
        webhook_event: event,
      }),
    },
  );
  if (!response.ok) throw new Error("Webhook verification unavailable");
  return (await response.json()).verification_status === "SUCCESS";
}
