import "server-only";
import { validateDeployment } from "./config";
import { developmentSecret } from "./development-secret";
import path from "node:path";
import { createRepository } from "../../../db/repository";
import { CheckoutService } from "../../../packages/merchant-adapter/src/service";
import { PayPalGateway, UnconfiguredGateway } from "@accesspay/paypal";

type Runtime = Awaited<ReturnType<typeof initialize>>;
const globalRuntime = globalThis as typeof globalThis & {
  accesspayRuntime?: Promise<Runtime>;
  accesspayDevSecret?: string;
};
export function sessionSecret() {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32)
    return process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === "production")
    throw new Error("A SESSION_SECRET of at least 32 characters is required.");
  return (globalRuntime.accesspayDevSecret ??= developmentSecret(
    `${localDatabasePath()}.session-secret`,
  ));
}
function localDatabasePath() {
  return path.resolve(
    /*turbopackIgnore: true*/
    process.env.LOCAL_DATABASE_PATH ??
      path.resolve(process.cwd(), "../../.data/postgres"),
  );
}
export function baseUrl() {
  return process.env.APP_BASE_URL ?? "http://localhost:3000";
}
export function paymentConfigured() {
  return !!(
    process.env.PAYPAL_CLIENT_ID &&
    process.env.PAYPAL_CLIENT_SECRET &&
    process.env.PAYPAL_MERCHANT_ID
  );
}
async function initialize() {
  validateDeployment({
    nodeEnv: process.env.NODE_ENV,
    baseUrl: process.env.APP_BASE_URL,
    databaseUrl: process.env.DATABASE_URL,
    sessionSecret: process.env.SESSION_SECRET,
    paypalEnv: process.env.PAYPAL_ENV,
  });
  sessionSecret();
  const repo = await createRepository({
    url: process.env.DATABASE_URL,
    localPath: localDatabasePath(),
    migrate: !process.env.DATABASE_URL,
  });
  const gateway = paymentConfigured()
    ? new PayPalGateway({
        clientId: process.env.PAYPAL_CLIENT_ID!,
        secret: process.env.PAYPAL_CLIENT_SECRET!,
        sellerId: process.env.PAYPAL_MERCHANT_ID!,
      })
    : new UnconfiguredGateway();
  return {
    repo,
    service: new CheckoutService(repo, gateway, {
      sellerId: process.env.PAYPAL_MERCHANT_ID ?? "unconfigured",
    }),
  };
}
export function runtime() {
  return (globalRuntime.accesspayRuntime ??= initialize().catch((error) => {
    globalRuntime.accesspayRuntime = undefined;
    throw error;
  }));
}
