import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { CheckoutService } from "../../packages/merchant-adapter/src/service";
import { createRepository } from "../../db/repository";
import type {
  PaymentGateway,
  ProviderOrder,
} from "../../packages/merchant-adapter/src/gateway";

const alice = { userId: "alice", deviceId: "desktop" },
  phone = { userId: "alice", deviceId: "phone" },
  bob = { userId: "bob", deviceId: "other" };
let clock = Date.parse("2026-10-30T12:00:00Z");
let repo: Awaited<ReturnType<typeof createRepository>>;
class SandboxFixture implements PaymentGateway {
  orders = new Map<string, ProviderOrder>();
  captures = 0;
  failCapture = false;
  wrongAmount = false;
  async create(s: { id: string; totalMinor: number }, requestId: string) {
    const id = `order-${requestId}`;
    if (!this.orders.has(id))
      this.orders.set(id, {
        id,
        status: "CREATED",
        sessionId: s.id,
        currency: "USD",
        totalMinor: s.totalMinor,
        sellerId: "seller-fixture",
      });
    return id;
  }
  async get(id: string) {
    const order = this.orders.get(id);
    if (!order) throw Error("Not found");
    return structuredClone(order);
  }
  async capture(id: string) {
    this.captures++;
    const order = this.orders.get(id)!;
    if (this.failCapture) {
      this.failCapture = false;
      throw Error("Network timeout");
    }
    order.status = "COMPLETED";
    order.capture = {
      id: `capture-${id}`,
      status: "COMPLETED",
      currency: "USD",
      totalMinor: this.wrongAmount ? 1 : order.totalMinor,
    };
    return structuredClone(order);
  }
  approve(id: string) {
    this.orders.get(id)!.status = "APPROVED";
  }
}
let gateway: SandboxFixture, service: CheckoutService;
beforeAll(async () => {
  repo = await createRepository({ memory: true });
});
afterAll(async () => {
  await repo.close();
});
async function draft() {
  gateway = new SandboxFixture();
  service = new CheckoutService(repo, gateway, {
    sellerId: "seller-fixture",
    now: () => clock,
  });
  return service.create(alice, {
    storeId: "store-a",
    items: [{ sku: "lamp-01", qty: 1 }],
  });
}
describe("payment invariants backed by PostgreSQL", () => {
  it("requires the current review and rejects another shopper", async () => {
    const s = await draft();
    await expect(service.createOrder(alice, s.id, 1)).rejects.toMatchObject({
      code: "REVIEW_REQUIRED",
    });
    await expect(service.get(bob, s.id)).rejects.toMatchObject({ status: 404 });
    await service.review(alice, s.id, 1);
    await service.update(alice, s.id, 1, [{ sku: "lamp-01", qty: 2 }]);
    await expect(service.createOrder(alice, s.id, 1)).rejects.toMatchObject({
      code: "STALE_VERSION",
    });
    expect(await service.get(alice, s.id)).toMatchObject({
      state: "REVIEW_REQUIRED",
      version: 2,
      totalMinor: 5580,
    });
  });
  it("does not capture an unapproved or unrelated PayPal order", async () => {
    const s = await draft();
    await service.review(alice, s.id, 1);
    const { orderId } = await service.createOrder(alice, s.id, 1);
    await expect(
      service.capture(alice, s.id, "foreign-order"),
    ).rejects.toMatchObject({ code: "ORDER_MISMATCH" });
    await expect(service.capture(alice, s.id, orderId)).rejects.toMatchObject({
      code: "NOT_APPROVED",
    });
    expect((await service.get(alice, s.id)).receiptId).toBeUndefined();
  });
  it("serializes concurrent captures and persists one receipt", async () => {
    const s = await draft();
    await service.review(alice, s.id, 1);
    const orders = await Promise.all([
      service.createOrder(alice, s.id, 1),
      service.createOrder(alice, s.id, 1),
    ]);
    expect(orders[0].orderId).toBe(orders[1].orderId);
    gateway.approve(orders[0].orderId);
    const results = await Promise.all([
      service.capture(alice, s.id, orders[0].orderId),
      service.capture(alice, s.id, orders[0].orderId),
    ]);
    expect(results[0]).toMatchObject({ state: "COMPLETED", totalMinor: 2940 });
    expect(results[0].receiptId).toBe(results[1].receiptId);
    expect(gateway.captures).toBe(1);
    expect(await service.receipt(alice, results[0].receiptId!)).toMatchObject({
      totalMinor: 2940,
      isSandbox: true,
    });
    await expect(
      service.receipt(bob, results[0].receiptId!),
    ).rejects.toMatchObject({ status: 404 });
  });
  it("keeps timeout pending and reconciles provider truth before retrying", async () => {
    const s = await draft();
    await service.review(alice, s.id, 1);
    const { orderId } = await service.createOrder(alice, s.id, 1);
    gateway.approve(orderId);
    gateway.failCapture = true;
    expect(await service.capture(alice, s.id, orderId)).toMatchObject({
      state: "PENDING",
    });
    const completed = gateway.orders.get(orderId)!;
    completed.status = "COMPLETED";
    completed.capture = {
      id: "async-completion",
      status: "COMPLETED",
      totalMinor: 2940,
      currency: "USD",
    };
    expect(await service.status(alice, s.id)).toMatchObject({
      state: "COMPLETED",
    });
    expect(gateway.captures).toBe(1);
  });
  it("never marks a mismatched completed capture successful", async () => {
    const s = await draft();
    await service.review(alice, s.id, 1);
    const { orderId } = await service.createOrder(alice, s.id, 1);
    gateway.approve(orderId);
    gateway.wrongAmount = true;
    expect(await service.capture(alice, s.id, orderId)).toMatchObject({
      state: "PENDING",
      receiptId: undefined,
    });
  });
  it("deduplicates verified webhook events and reconciles instead of trusting event status", async () => {
    const s = await draft();
    await service.review(alice, s.id, 1);
    const { orderId } = await service.createOrder(alice, s.id, 1);
    expect(await service.webhook("event-1", orderId)).toEqual({
      duplicate: false,
    });
    expect(await service.webhook("event-1", orderId)).toEqual({
      duplicate: true,
    });
    expect((await service.get(alice, s.id)).state).toBe("CREATED");
  });
});
describe("one-time draft handoff", () => {
  it("binds redemption to the shopper, expires, and invalidates review on device transfer", async () => {
    const s = await draft();
    await service.review(alice, s.id, 1);
    const pairing = await service.handoff(alice, s.id, 1);
    await expect(service.redeem(bob, pairing.code)).rejects.toMatchObject({
      code: "INVALID_CODE",
    });
    const result = await service.redeem(phone, pairing.code);
    expect(result).toMatchObject({
      state: "REVIEW_REQUIRED",
      version: 2,
      canEdit: true,
    });
    await expect(service.redeem(phone, pairing.code)).rejects.toMatchObject({
      code: "INVALID_CODE",
    });
    await expect(service.review(alice, s.id, 2)).rejects.toMatchObject({
      code: "VIEW_ONLY",
    });
    expect((await service.get(alice, s.id)).canEdit).toBe(false);
  });
  it("permits exactly one target in a redemption race", async () => {
    const s = await draft();
    const pairing = await service.handoff(alice, s.id, 1);
    const results = await Promise.allSettled([
      service.redeem(phone, pairing.code),
      service.redeem({ ...phone, deviceId: "phone-2" }, pairing.code),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  });
  it("rejects expired and regenerated codes while leaving original device usable", async () => {
    const s = await draft();
    const old = await service.handoff(alice, s.id, 1);
    const fresh = await service.handoff(alice, s.id, 1);
    await expect(service.redeem(phone, old.code)).rejects.toMatchObject({
      code: "INVALID_CODE",
    });
    clock += 91_000;
    await expect(service.redeem(phone, fresh.code)).rejects.toMatchObject({
      code: "INVALID_CODE",
    });
    expect((await service.review(alice, s.id, 1)).state).toBe("READY");
  });
  it("refuses to transfer or edit a checkout with a PayPal order", async () => {
    const s = await draft();
    await service.review(alice, s.id, 1);
    await service.createOrder(alice, s.id, 1);
    await expect(service.handoff(alice, s.id, 1)).rejects.toMatchObject({
      code: "LOCKED",
    });
    await expect(
      service.update(alice, s.id, 1, [{ sku: "lamp-01", qty: 2 }]),
    ).rejects.toMatchObject({ code: "LOCKED" });
  });
});
