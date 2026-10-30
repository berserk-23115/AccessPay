import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CheckoutError, isCheckoutError, cartInput } from "@accesspay/core";
import { explain } from "@accesspay/ai";
import { verifyWebhook } from "@accesspay/paypal";
import { requireIdentity, authenticateDemo } from "../../../lib/auth";
import {
  assertOrigin,
  constantEqual,
  cookieName,
  deviceCookieName,
  signIdentity,
} from "../../../lib/security";
import {
  baseUrl,
  paymentConfigured,
  sessionSecret,
  runtime as getRuntime,
} from "../../../lib/runtime";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const versionInput = z
  .object({ version: z.number().int().positive() })
  .strict();
async function body(request: NextRequest, max = 16_384) {
  const text = await request.text();
  if (Buffer.byteLength(text) > max)
    throw new CheckoutError("TOO_LARGE", "Request is too large.", 413);
  try {
    return JSON.parse(text);
  } catch {
    throw new CheckoutError("INVALID_JSON", "Send a valid JSON request.", 400);
  }
}
const json = (value: unknown, status = 200) =>
  NextResponse.json(value, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
async function handle(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await context.params,
      route = path.join("/"),
      method = request.method;
    if (route === "health" && method === "GET") {
      const { repo } = await getRuntime();
      await repo.transaction(async () => true);
      return json({
        status: "ok",
        sandbox: true,
        paymentConfigured: paymentConfigured(),
      });
    }
    if (route === "paypal/webhook" && method === "POST") {
      if (!paymentConfigured() || !process.env.PAYPAL_WEBHOOK_ID)
        throw new CheckoutError(
          "UNAVAILABLE",
          "Webhook verification is not configured.",
          503,
        );
      const event = await body(request, 131_072);
      if (
        !(await verifyWebhook(request.headers, event, {
          clientId: process.env.PAYPAL_CLIENT_ID!,
          secret: process.env.PAYPAL_CLIENT_SECRET!,
          webhookId: process.env.PAYPAL_WEBHOOK_ID,
        }))
      )
        throw new CheckoutError("SIGNATURE", "Invalid webhook signature.", 401);
      const parsed = z
        .object({
          id: z.string().min(1).max(200),
          event_type: z.string(),
          resource: z.record(z.string(), z.unknown()),
        })
        .parse(event);
      const supported = [
        "PAYMENT.CAPTURE.COMPLETED",
        "PAYMENT.CAPTURE.PENDING",
        "PAYMENT.CAPTURE.DENIED",
        "CHECKOUT.ORDER.APPROVED",
        "CHECKOUT.ORDER.COMPLETED",
      ];
      if (!supported.includes(parsed.event_type))
        return json({ ignored: true });
      const resource = parsed.resource as {
        id?: string;
        supplementary_data?: { related_ids?: { order_id?: string } };
      };
      const orderId = parsed.event_type.startsWith("CHECKOUT.ORDER.")
        ? resource.id
        : resource.supplementary_data?.related_ids?.order_id;
      if (!orderId)
        throw new CheckoutError("EVENT", "Webhook order ID is missing.", 400);
      return json(
        await (await getRuntime()).service.webhook(parsed.id, orderId),
      );
    }
    if (method !== "GET")
      assertOrigin(request.headers.get("origin"), baseUrl());
    if (route === "auth/sign-in" && method === "POST") {
      const input = z
        .object({
          email: z.string().email().max(100),
          password: z.string().max(200),
        })
        .strict()
        .parse(await body(request));
      const actor = await authenticateDemo(
        input.email,
        input.password,
        request.cookies.get(deviceCookieName)?.value,
      );
      const response = json({ signedIn: true, demoAccount: true });
      const options = {
        httpOnly: true,
        secure: new URL(baseUrl()).protocol === "https:",
        sameSite: "lax" as const,
        path: "/",
      };
      response.cookies.set(cookieName, signIdentity(actor, sessionSecret()), {
        ...options,
        maxAge: 8 * 60 * 60,
      });
      response.cookies.set(
        deviceCookieName,
        signIdentity(
          { userId: "device-only", deviceId: actor.deviceId },
          sessionSecret(),
          Date.now(),
          365 * 24 * 60 * 60 * 1000,
        ),
        { ...options, maxAge: 365 * 24 * 60 * 60 },
      );
      return response;
    }
    if (route === "auth/sign-out" && method === "POST") {
      const response = json({ signedIn: false });
      response.cookies.delete(cookieName);
      return response;
    }
    const actor = await requireIdentity(),
      { service, repo } = await getRuntime();
    await repo.rateLimit(`api:${actor.userId}`, 120, 60_000);
    if (route === "merchant/checkout-sessions" && method === "POST") {
      const key = process.env.MERCHANT_API_KEY;
      if (
        !key ||
        !constantEqual(
          request.headers.get("authorization") ?? "",
          `Bearer ${key}`,
        )
      )
        throw new CheckoutError(
          "MERCHANT_AUTH",
          "Merchant authentication required.",
          401,
        );
      return json(
        await service.create(actor, cartInput.parse(await body(request))),
        201,
      );
    }
    if (route === "checkout-sessions" && method === "GET")
      return json(await service.list(actor));
    if (path[0] === "checkout-sessions" && path[1]) {
      const id = z
          .string()
          .regex(/^cs_[a-f0-9-]{36}$/)
          .parse(path[1]),
        action = path.slice(2).join("/");
      if (!action && method === "GET")
        return json(await service.get(actor, id));
      if (action === "status" && method === "GET")
        return json(await service.status(actor, id));
      if (action === "review" && method === "POST")
        return json(
          await service.review(
            actor,
            id,
            versionInput.parse(await body(request)).version,
          ),
        );
      if (action === "cart" && method === "POST") {
        const input = z
          .object({
            version: z.number().int().positive(),
            items: cartInput.shape.items,
          })
          .strict()
          .parse(await body(request));
        return json(
          await service.update(actor, id, input.version, input.items),
        );
      }
      if (action === "cancel" && method === "POST")
        return json(
          await service.cancel(
            actor,
            id,
            versionInput.parse(await body(request)).version,
          ),
        );
      if (action === "paypal/order" && method === "POST") {
        if (!paymentConfigured())
          throw new CheckoutError(
            "PAYPAL_UNAVAILABLE",
            "PayPal sandbox is not connected. Your draft remains unpaid.",
            503,
          );
        return json(
          await service.createOrder(
            actor,
            id,
            versionInput.parse(await body(request)).version,
          ),
        );
      }
      if (action === "paypal/capture" && method === "POST") {
        const input = z
          .object({ orderId: z.string().min(1).max(200) })
          .strict()
          .parse(await body(request));
        return json(await service.capture(actor, id, input.orderId));
      }
    }
    if (route === "handoff" && method === "POST") {
      const input = z
        .object({ sessionId: z.string(), version: z.number().int().positive() })
        .strict()
        .parse(await body(request));
      return json(await service.handoff(actor, input.sessionId, input.version));
    }
    if (route === "handoff/redeem" && method === "POST")
      return json(
        await service.redeem(
          actor,
          z
            .object({ code: z.string().min(1).max(30) })
            .strict()
            .parse(await body(request)).code,
        ),
      );
    if (route === "help/explain" && method === "POST") {
      const input = z
        .object({
          sessionId: z.string(),
          question: z.string().trim().min(1).max(500),
        })
        .strict()
        .parse(await body(request));
      await repo.rateLimit(`help:${actor.userId}`, 15, 60_000);
      return json(
        await explain(
          await service.get(actor, input.sessionId),
          input.question,
          { apiKey: process.env.AI_API_KEY, model: process.env.AI_MODEL },
        ),
      );
    }
    if (path[0] === "receipts" && path[1] && method === "GET")
      return json(await service.receipt(actor, path[1]));
    throw new CheckoutError("NOT_FOUND", "This endpoint does not exist.", 404);
  } catch (error) {
    if (isCheckoutError(error))
      return json(
        { error: { code: error.code, message: error.message } },
        error.status,
      );
    if (error instanceof z.ZodError)
      return json(
        {
          error: {
            code: "VALIDATION",
            message: "Check the request fields and try again.",
          },
        },
        400,
      );
    console.error(JSON.stringify({ event: "api.error", code: "UNEXPECTED" }));
    return json(
      {
        error: {
          code: "UNEXPECTED",
          message:
            "The service is unavailable. Your payment is not confirmed. Check status before retrying.",
        },
      },
      503,
    );
  }
}
export const GET = handle;
export const POST = handle;
