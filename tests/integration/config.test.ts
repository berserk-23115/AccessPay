import { describe, expect, it } from "vitest";
import { validateDeployment } from "../../apps/web/lib/config";
const hosted = {
  nodeEnv: "production",
  baseUrl: "https://accesspay.test",
  databaseUrl: "postgres://fixture",
  sessionSecret: "fixture-secret-with-at-least-thirty-two-characters",
  paypalEnv: "sandbox",
};
describe("hosted configuration safety", () => {
  it("accepts only an explicit HTTPS production origin", () => {
    expect(() => validateDeployment(hosted)).not.toThrow();
    expect(() =>
      validateDeployment({ ...hosted, baseUrl: "http://accesspay.test" }),
    ).toThrow();
    expect(() =>
      validateDeployment({ ...hosted, baseUrl: undefined }),
    ).toThrow();
  });
  it("refuses an ephemeral production ledger or a weak signer", () => {
    expect(() =>
      validateDeployment({ ...hosted, databaseUrl: undefined }),
    ).toThrow();
    expect(() =>
      validateDeployment({ ...hosted, sessionSecret: "weak" }),
    ).toThrow();
  });
  it("rejects live payment configuration even in a local app", () => {
    expect(() =>
      validateDeployment({ nodeEnv: "development", paypalEnv: "live" }),
    ).toThrow();
  });
  it("keeps credential-free local review available", () => {
    expect(() => validateDeployment({ nodeEnv: "development" })).not.toThrow();
  });
});
