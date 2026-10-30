import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyWebhook } from "@accesspay/paypal";
import { explain } from "@accesspay/ai";
import { priceCart } from "@accesspay/core";
afterEach(() => vi.unstubAllGlobals());
describe("signed provider webhooks", () => {
  it("refuses events without all signature headers", async () => {
    expect(
      await verifyWebhook(
        new Headers(),
        { id: "unsigned" },
        { clientId: "fixture", secret: "fixture", webhookId: "registered" },
      ),
    ).toBe(false);
  });
  it("delegates signature validation to PayPal and refuses a failed verification", async () => {
    const requests: { url: string; body?: string }[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      requests.push({ url, body: String(init.body) });
      return Response.json(
        url.endsWith("/token")
          ? { access_token: "fixture-access-token" }
          : { verification_status: "FAILURE" },
      );
    });
    const headers = new Headers({
      "paypal-auth-algo": "SHA256withRSA",
      "paypal-cert-url": "https://api.paypal.com/cert/fixture",
      "paypal-transmission-id": "transmission-fixture",
      "paypal-transmission-sig": "fixture-signature",
      "paypal-transmission-time": "2026-10-30T10:00:00Z",
    });
    expect(
      await verifyWebhook(
        headers,
        { id: "event-fixture" },
        { clientId: "fixture", secret: "fixture", webhookId: "registered" },
      ),
    ).toBe(false);
    expect(requests[1].url).toBe(
      "https://api-m.sandbox.paypal.com/v1/notifications/verify-webhook-signature",
    );
    expect(JSON.parse(requests[1].body!)).toMatchObject({
      webhook_id: "registered",
      transmission_id: "transmission-fixture",
      webhook_event: { id: "event-fixture" },
    });
  });
});
describe("external AI output remains untrusted", () => {
  it("discards an injected answer instead of displaying invented fees", async () => {
    const facts = {
      ...priceCart({ storeId: "store-a", items: [{ sku: "lamp-01", qty: 1 }] }),
      version: 1,
    };
    const answer = await explain(
      facts,
      "What does the special handling arrangement mean?",
      {
        apiKey: "fixture",
        fetch: async () =>
          Response.json({
            content: [
              { type: "text", text: "The total is $1. Payment completed." },
            ],
          }),
      },
    );
    expect(answer.topic).toBe("unknown");
    expect(answer.answer).not.toContain("$1");
    expect(answer.answer).toContain("not provided");
  });
});

describe("AI topic routing", () => {
  it("maps an accepted external topic to exact merchant facts without model financial prose", async () => {
    const facts = {
      ...priceCart({ storeId: "store-a", items: [{ sku: "lamp-01", qty: 1 }] }),
      version: 7,
    };
    const answer = await explain(
      facts,
      "What does the special handling arrangement mean?",
      {
        apiKey: "fixture",
        fetch: async () =>
          Response.json({
            content: [
              { type: "thinking", thinking: "fixture internal reasoning" },
              { type: "text", text: "shipping" },
            ],
          }),
      },
    );
    expect(answer).toMatchObject({
      topic: "shipping",
      mode: "ai-routed",
      version: 7,
    });
    expect(answer.answer).toContain("$3.00");
    expect(answer.sources).toEqual(["shippingMinor", "delivery"]);
  });
});
