import { createHmac, timingSafeEqual } from "node:crypto";
import { CheckoutError, type Actor } from "@accesspay/core";
export const cookieName = "accesspay_identity";
export const deviceCookieName = "accesspay_device";
export function signIdentity(
  actor: Actor,
  secret: string,
  now = Date.now(),
  lifetimeMs = 8 * 60 * 60 * 1000,
): string {
  if (secret.length < 32)
    throw new Error("SESSION_SECRET must contain at least 32 characters.");
  const payload = Buffer.from(
    JSON.stringify({ ...actor, expires: now + lifetimeMs }),
  ).toString("base64url");
  return `${payload}.${createHmac("sha256", secret).update(payload).digest("base64url")}`;
}
export function verifyIdentity(
  token: string,
  secret: string,
  now = Date.now(),
): Actor | null {
  try {
    if (secret.length < 32 || token.length > 2048) return null;
    const [payload, signature, extra] = token.split(".");
    if (!payload || !signature || extra) return null;
    const expected = createHmac("sha256", secret).update(payload).digest();
    const supplied = Buffer.from(signature, "base64url");
    if (
      expected.length !== supplied.length ||
      !timingSafeEqual(expected, supplied)
    )
      return null;
    const value = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (
      typeof value.userId !== "string" ||
      typeof value.deviceId !== "string" ||
      typeof value.expires !== "number" ||
      value.expires <= now
    )
      return null;
    return { userId: value.userId, deviceId: value.deviceId };
  } catch {
    return null;
  }
}
export function safeReturnPath(path: string): string {
  if (
    !/^\/(?:workspace|review\/[a-zA-Z0-9_-]+|receipts\/[a-zA-Z0-9_-]+|store-a|store-b|handoff)(?:\?[^\\\r\n]*)?$/.test(
      path,
    )
  )
    return "/workspace";
  return path;
}
export function assertOrigin(origin: string | null, base: string) {
  if (!origin || origin !== new URL(base).origin)
    throw new CheckoutError(
      "ORIGIN",
      "This request must come from the AccessPay site.",
      403,
    );
}
export function constantEqual(actual: string, expected: string) {
  const a = Buffer.from(actual),
    b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
