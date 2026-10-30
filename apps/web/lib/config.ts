export function validateDeployment(config: {
  nodeEnv?: string;
  baseUrl?: string;
  databaseUrl?: string;
  sessionSecret?: string;
  paypalEnv?: string;
}): void {
  if (config.paypalEnv && config.paypalEnv !== "sandbox")
    throw new Error("AccessPay currently supports sandbox payments only.");
  if (config.nodeEnv !== "production") return;
  if (!config.databaseUrl)
    throw new Error("Production requires managed PostgreSQL.");
  if (!config.sessionSecret || config.sessionSecret.length < 32)
    throw new Error(
      "Production requires a SESSION_SECRET of at least 32 characters.",
    );
  if (!config.baseUrl)
    throw new Error("Production requires an explicit HTTPS APP_BASE_URL.");
  const url = new URL(config.baseUrl);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  )
    throw new Error(
      "APP_BASE_URL must be an HTTPS origin without credentials or a path.",
    );
}
