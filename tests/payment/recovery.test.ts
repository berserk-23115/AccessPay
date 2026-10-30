import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createRepository } from "../../db/repository";
import { CheckoutService } from "../../packages/merchant-adapter/src/service";
import type {
  PaymentGateway,
  ProviderOrder,
} from "../../packages/merchant-adapter/src/gateway";
import type { CheckoutSession } from "@accesspay/core";
let repo: Awaited<ReturnType<typeof createRepository>>;
const actor = { userId: "recovery-shopper", deviceId: "desktop" };
class RecoverableProvider implements PaymentGateway {
  order?: ProviderOrder;
  loseCreateResponse = true;
  createKeys: string[] = [];
  captureKeys: string[] = [];
  async create(s: CheckoutSession, key: string) {
    this.createKeys.push(key);
    this.order ??= {
      id: "provider-order",
      status: "CREATED",
      sessionId: s.id,
      sellerId: "seller",
      currency: "USD",
      totalMinor: s.totalMinor,
    };
    if (this.loseCreateResponse) {
      this.loseCreateResponse = false;
      throw Error("Response lost after provider accepted request");
    }
    return this.order.id;
  }
  async get() {
    return structuredClone(this.order!);
  }
  async capture(_id: string, key: string) {
    this.captureKeys.push(key);
    this.order!.status = "COMPLETED";
    this.order!.capture = {
      id: "unique-capture",
      status: "COMPLETED",
      currency: "USD",
      totalMinor: 2940,
    };
    return this.get();
  }
}
beforeAll(async () => {
  repo = await createRepository({ memory: true });
});
afterAll(async () => {
  await repo.close();
});
describe("persisted recovery boundaries", () => {
  it("resumes a lost create response after service restart with the same request key", async () => {
    const provider = new RecoverableProvider(),
      first = new CheckoutService(repo, provider, { sellerId: "seller" });
    const draft = await first.create(actor, {
      storeId: "store-a",
      items: [{ sku: "lamp-01", qty: 1 }],
    });
    await first.review(actor, draft.id, 1);
    await expect(first.createOrder(actor, draft.id, 1)).rejects.toMatchObject({
      code: "PENDING",
    });
    expect(await first.get(actor, draft.id)).toMatchObject({
      state: "PENDING",
    });
    const restarted = new CheckoutService(repo, provider, {
      sellerId: "seller",
    });
    const recovered = await restarted.createOrder(actor, draft.id, 1);
    expect(recovered.orderId).toBe("provider-order");
    expect(provider.createKeys).toHaveLength(2);
    expect(provider.createKeys[0]).toBe(provider.createKeys[1]);
    provider.order!.status = "APPROVED";
    expect(
      await restarted.capture(actor, draft.id, recovered.orderId),
    ).toMatchObject({ state: "COMPLETED" });
    expect(provider.captureKeys).toHaveLength(1);
  });
  it("retains failed pairing guesses in the rate budget after rollback", async () => {
    const service = new CheckoutService(repo, new RecoverableProvider(), {
      sellerId: "seller",
    });
    const guesser = { userId: "guesser", deviceId: "device" };
    for (let attempt = 0; attempt < 8; attempt++)
      await expect(
        service.redeem(guesser, "WRONG-WRONG"),
      ).rejects.toMatchObject({ code: "INVALID_CODE" });
    await expect(service.redeem(guesser, "WRONG-WRONG")).rejects.toMatchObject({
      code: "RATE_LIMIT",
      status: 429,
    });
  });
  it("invalidates an issued handoff code when the cart changes", async () => {
    const service = new CheckoutService(repo, new RecoverableProvider(), {
      sellerId: "seller",
    });
    const draft = await service.create(actor, {
      storeId: "store-a",
      items: [{ sku: "lamp-01", qty: 1 }],
    });
    const pairing = await service.handoff(actor, draft.id, 1);
    await service.update(actor, draft.id, 1, [{ sku: "lamp-01", qty: 2 }]);
    await expect(
      service.redeem({ ...actor, deviceId: "phone" }, pairing.code),
    ).rejects.toMatchObject({ code: "INVALID_CODE" });
  });
  it("rolls back a database mutation when an operation fails", async () => {
    await expect(
      repo.transaction(async (tx) => {
        await tx.addEvent("rollback-event", "irrelevant-order");
        throw Error("Abort");
      }),
    ).rejects.toThrow("Abort");
    expect(await repo.transaction((tx) => tx.hasEvent("rollback-event"))).toBe(
      false,
    );
  });
});
