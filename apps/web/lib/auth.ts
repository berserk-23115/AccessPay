import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CheckoutError, type Actor } from "@accesspay/core";
import { cookieName, verifyIdentity } from "./security";
import { sessionSecret } from "./runtime";
export async function identity(): Promise<Actor | null> {
  const cookie = (await cookies()).get(cookieName)?.value;
  return cookie ? verifyIdentity(cookie, sessionSecret()) : null;
}
export async function requireIdentity(): Promise<Actor> {
  const actor = await identity();
  if (!actor)
    throw new CheckoutError(
      "UNAUTHENTICATED",
      "Sign in to open your checkout.",
      401,
    );
  return actor;
}
export async function pageIdentity(next: string) {
  const actor = await identity();
  if (!actor) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  return actor;
}
export async function authenticateDemo(
  handle: string,
  password: string,
  deviceToken?: string,
): Promise<Actor> {
  const { runtime } = await import("./runtime");
  const { constantEqual, verifyIdentity } = await import("./security");
  const { randomUUID } = await import("node:crypto");
  const { repo } = await runtime();
  await repo.rateLimit("login:global", 80, 60_000);
  await repo.rateLimit(
    `login:${handle.toLowerCase().trim().slice(0, 100)}`,
    8,
    60_000,
  );
  const enabled =
    process.env.NODE_ENV !== "production" ||
    process.env.ALLOW_DEMO_AUTH === "true";
  const expected =
    process.env.DEMO_ACCOUNT_PASSWORD ||
    (process.env.NODE_ENV !== "production" ? "accesspay-demo-only" : "");
  if (
    !enabled ||
    !expected ||
    handle.toLowerCase().trim() !== "demo@accesspay.test" ||
    !constantEqual(password, expected)
  )
    throw new CheckoutError(
      "CREDENTIALS",
      "Email or password did not match the demo account.",
      401,
    );
  const previous = deviceToken
    ? verifyIdentity(deviceToken, sessionSecret())
    : null;
  return {
    userId: "demo-shopper",
    deviceId:
      previous?.userId === "device-only" ? previous.deviceId : randomUUID(),
  };
}
