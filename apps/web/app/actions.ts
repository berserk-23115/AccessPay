"use server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isCheckoutError, cartInput } from "@accesspay/core";
import { explain } from "@accesspay/ai";
import type { FormResult } from "@accesspay/merchant-adapter";
import { requireIdentity, authenticateDemo } from "../lib/auth";
import { baseUrl, runtime, sessionSecret } from "../lib/runtime";
import {
  assertOrigin,
  cookieName,
  deviceCookieName,
  safeReturnPath,
  signIdentity,
} from "../lib/security";
async function origin() {
  assertOrigin((await headers()).get("origin"), baseUrl());
}
function message(error: unknown) {
  if (isCheckoutError(error)) return error.message;
  if (error instanceof z.ZodError)
    return "Check the form fields and try again.";
  return "Unable to complete this request. Check payment status before retrying.";
}
function code(error: unknown) {
  return isCheckoutError(error) ? error.code : "UNAVAILABLE";
}
export async function signIn(form: FormData) {
  await origin();
  const jar = await cookies();
  let actor;
  try {
    actor = await authenticateDemo(
      String(form.get("email") ?? ""),
      String(form.get("password") ?? ""),
      jar.get(deviceCookieName)?.value,
    );
  } catch (error) {
    if (isCheckoutError(error) && error.code === "CREDENTIALS")
      redirect("/sign-in?error=credentials");
    throw error;
  }
  const options = {
    httpOnly: true,
    secure: new URL(baseUrl()).protocol === "https:",
    sameSite: "lax" as const,
    path: "/",
  };
  jar.set(cookieName, signIdentity(actor, sessionSecret()), {
    ...options,
    maxAge: 8 * 60 * 60,
  });
  jar.set(
    deviceCookieName,
    signIdentity(
      { userId: "device-only", deviceId: actor.deviceId },
      sessionSecret(),
      Date.now(),
      365 * 24 * 60 * 60 * 1000,
    ),
    { ...options, maxAge: 365 * 24 * 60 * 60 },
  );
  redirect(safeReturnPath(String(form.get("next") ?? "/workspace")));
}
export async function signOut() {
  await origin();
  (await cookies()).delete(cookieName);
  redirect("/");
}
export async function startCheckout(form: FormData) {
  await origin();
  const input = cartInput.parse({
    storeId: form.get("storeId"),
    items: [{ sku: form.get("sku"), qty: Number(form.get("qty") ?? 1) }],
  });
  const { identity } = await import("../lib/auth");
  const actor = await identity();
  if (!actor)
    redirect(`/sign-in?next=${encodeURIComponent(`/${input.storeId}`)}`);
  const s = await (await runtime()).service.create(actor, input);
  redirect(`/review/${s.id}`);
}
export async function reviewCheckout(
  id: string,
  version: number,
  _form: FormData,
) {
  await origin();
  let problem = "";
  try {
    await (
      await runtime()
    ).service.review(await requireIdentity(), id, version);
  } catch (error) {
    problem = code(error);
  }
  redirect(`/review/${id}${problem ? `?error=${problem}` : "?reviewed=1"}`);
}
export async function updateCheckout(
  id: string,
  version: number,
  form: FormData,
) {
  await origin();
  let problem = "";
  try {
    const { service } = await runtime(),
      actor = await requireIdentity(),
      s = await service.get(actor, id);
    const items = s.lineItems.map((item) => ({
      sku: item.sku,
      qty: Number(form.get(`qty:${item.sku}`)),
    }));
    await service.update(actor, id, version, items);
  } catch (error) {
    problem = code(error);
  }
  redirect(`/review/${id}${problem ? `?error=${problem}` : ""}`);
}
export async function cancelCheckout(
  id: string,
  version: number,
  _form: FormData,
) {
  await origin();
  let problem = "";
  try {
    await (
      await runtime()
    ).service.cancel(await requireIdentity(), id, version);
  } catch (error) {
    problem = code(error);
  }
  redirect(`/review/${id}${problem ? `?error=${problem}` : ""}`);
}
export async function makeHandoff(
  id: string,
  version: number,
  _previous: FormResult,
  _form: FormData,
): Promise<FormResult> {
  try {
    await origin();
    return {
      ...(await (
        await runtime()
      ).service.handoff(await requireIdentity(), id, version)),
      message:
        "Code ready. Sign in on your other device, then enter this code within 90 seconds.",
    };
  } catch (error) {
    return { error: message(error) };
  }
}
export async function redeemHandoff(
  _previous: FormResult,
  form: FormData,
): Promise<FormResult> {
  let id: string;
  try {
    await origin();
    const result = await (
      await runtime()
    ).service.redeem(
      await requireIdentity(),
      z.string().min(1).max(30).parse(form.get("code")),
    );
    id = result.id;
  } catch (error) {
    return { error: message(error) };
  }
  redirect(`/review/${id}`);
}
export async function askHelp(
  id: string,
  _previous: FormResult,
  form: FormData,
): Promise<FormResult> {
  try {
    await origin();
    const { service, repo } = await runtime(),
      actor = await requireIdentity();
    await repo.rateLimit(`help:${actor.userId}`, 15, 60_000);
    const question = z
      .string()
      .trim()
      .min(1)
      .max(500)
      .parse(form.get("question"));
    const answer = await explain(await service.get(actor, id), question, {
      apiKey: process.env.AI_API_KEY,
      model: process.env.AI_MODEL,
    });
    return {
      ...answer,
      message: "Answer ready. Read the merchant facts below.",
    };
  } catch (error) {
    return { error: message(error) };
  }
}
export async function savePreference(form: FormData) {
  await origin();
  const jar = await cookies();
  const theme = z
      .enum(["system", "light", "dark"])
      .optional()
      .parse(form.get("theme") ?? undefined),
    size = z
      .enum(["standard", "large"])
      .optional()
      .parse(form.get("size") ?? undefined);
  const options = {
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
    sameSite: "lax" as const,
    secure: new URL(baseUrl()).protocol === "https:",
  };
  if (theme) jar.set("accesspay_theme", theme, options);
  if (size) jar.set("accesspay_size", size, options);
  redirect(safeReturnPath(String(form.get("returnTo") ?? "/workspace")));
}
