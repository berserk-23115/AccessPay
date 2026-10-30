import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  CheckoutError,
  cartInput,
  priceCart,
  publicSession,
  transition,
  type Actor,
  type CheckoutSession,
  type PublicSession,
  type State,
} from "@accesspay/core";
import type { Repository, Transaction } from "../../../db/repository";
import type { PaymentGateway, ProviderOrder } from "./gateway";

const unpaid = (s: CheckoutSession) =>
  ["REVIEW_REQUIRED", "READY"].includes(s.state) && !s.attempt;
const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export class CheckoutService {
  private now: () => number;
  constructor(
    private repo: Repository,
    private gateway: PaymentGateway,
    private config: { sellerId: string; now?: () => number },
  ) {
    this.now = config.now ?? Date.now;
  }
  private time() {
    return new Date(this.now()).toISOString();
  }
  private move(s: CheckoutSession, state: State) {
    if (s.state !== state) {
      s.state = transition(s.state, state);
      s.history.push({ state, at: this.time() });
    }
  }
  private async load(
    tx: Transaction,
    actor: Actor,
    id: string,
    options: { edit?: boolean; version?: number; fresh?: boolean } = {},
  ) {
    const s = await tx.getSession(id);
    if (!s || s.userId !== actor.userId)
      throw new CheckoutError(
        "NOT_FOUND",
        "Checkout not found. Sign in with the account that created it.",
        404,
      );
    if (options.edit && s.ownerDeviceId !== actor.deviceId)
      throw new CheckoutError(
        "VIEW_ONLY",
        "This checkout is active on another device. You can still read its status.",
      );
    if (options.version !== undefined && s.version !== options.version)
      throw new CheckoutError(
        "STALE_VERSION",
        "Your order changed. Refresh and review the current total.",
      );
    if (options.fresh && Date.parse(s.expiresAt) <= this.now())
      throw new CheckoutError(
        "EXPIRED",
        "This checkout expired. Return to the store to start a new one.",
      );
    return s;
  }
  async create(actor: Actor, input: unknown): Promise<PublicSession> {
    await this.repo.rateLimit(`create:${actor.userId}`, 30, 60_000, this.now());
    const facts = priceCart(input),
      id = `cs_${randomUUID()}`;
    return this.repo.transaction(async (tx) => {
      const s: CheckoutSession = {
        ...facts,
        id,
        ...{ userId: actor.userId, ownerDeviceId: actor.deviceId },
        version: 1,
        state: "REVIEW_REQUIRED",
        expiresAt: new Date(this.now() + 30 * 60_000).toISOString(),
        createdAt: this.time(),
        history: [{ state: "REVIEW_REQUIRED", at: this.time() }],
        isSandbox: true,
      };
      await tx.putSession(s);
      await tx.audit(id, "checkout.created");
      return publicSession(s, actor);
    });
  }
  async get(actor: Actor, id: string) {
    return this.repo.transaction(async (tx) =>
      publicSession(await this.load(tx, actor, id), actor),
    );
  }
  async list(actor: Actor) {
    return this.repo.transaction(async (tx) =>
      (await tx.list(actor.userId)).map((s) => publicSession(s, actor)),
    );
  }
  async review(actor: Actor, id: string, version: number) {
    return this.repo.transaction(async (tx) => {
      const s = await this.load(tx, actor, id, {
        edit: true,
        version,
        fresh: true,
      });
      if (!unpaid(s))
        throw new CheckoutError(
          "LOCKED",
          "This order is already with PayPal. Check its payment status.",
        );
      s.reviewedVersion = s.version;
      this.move(s, "READY");
      await tx.putSession(s);
      await tx.recordReview(s);
      await tx.audit(id, "checkout.reviewed");
      return publicSession(s, actor);
    });
  }
  async update(actor: Actor, id: string, version: number, items: unknown) {
    return this.repo.transaction(async (tx) => {
      const s = await this.load(tx, actor, id, {
        edit: true,
        version,
        fresh: true,
      });
      if (!unpaid(s))
        throw new CheckoutError(
          "LOCKED",
          "An order with PayPal cannot be edited. Check its status first.",
        );
      Object.assign(
        s,
        priceCart(cartInput.parse({ storeId: s.storeId, items })),
      );
      s.version++;
      s.reviewedVersion = undefined;
      s.handoffId = undefined;
      this.move(s, "REVIEW_REQUIRED");
      await tx.putSession(s);
      await tx.audit(id, "checkout.updated");
      return publicSession(s, actor);
    });
  }
  async cancel(actor: Actor, id: string, version: number) {
    return this.repo.transaction(async (tx) => {
      const s = await this.load(tx, actor, id, { edit: true, version });
      if (!unpaid(s))
        throw new CheckoutError(
          "LOCKED",
          "Check the existing PayPal order before starting another checkout.",
        );
      this.move(s, "CANCELLED");
      s.handoffId = undefined;
      await tx.putSession(s);
      return publicSession(s, actor);
    });
  }
  async createOrder(actor: Actor, id: string, version: number) {
    // Commit the intent before sending any request that can create a provider order.
    await this.repo.transaction(async (tx) => {
      const s = await this.load(tx, actor, id, {
        edit: true,
        version,
        fresh: true,
      });
      if (s.attempt) return;
      if (s.state !== "READY" || s.reviewedVersion !== s.version)
        throw new CheckoutError(
          "REVIEW_REQUIRED",
          "Review the current merchant and total before opening PayPal.",
        );
      s.attempt = {
        id: randomUUID(),
        createRequestId: randomUUID(),
        captureRequestId: randomUUID(),
      };
      s.handoffId = undefined;
      this.move(s, "CREATING");
      await tx.putSession(s);
      await tx.audit(id, "paypal.create_intent");
    });
    return this.repo
      .transaction(async (tx) => {
        const s = await this.load(tx, actor, id, { edit: true, version });
        if (s.attempt!.orderId) return { orderId: s.attempt!.orderId! };
        if (!["CREATING", "PENDING"].includes(s.state))
          throw new CheckoutError(
            "LOCKED",
            "Check the existing payment status.",
          );
        // PayPal request-id retention is finite: never replay an unresolved create after the draft expires.
        if (Date.parse(s.expiresAt) <= this.now())
          throw new CheckoutError(
            "PENDING",
            "The payment needs merchant reconciliation. Do not start a duplicate payment.",
          );
        try {
          s.attempt!.orderId = await this.gateway.create(
            s,
            s.attempt!.createRequestId,
          );
          this.move(s, "CREATED");
          await tx.putSession(s);
          return { orderId: s.attempt!.orderId };
        } catch {
          this.move(s, "PENDING");
          await tx.putSession(s);
          return { orderId: "" };
        }
      })
      .then((result) => {
        if (!result.orderId)
          throw new CheckoutError(
            "PENDING",
            "Status pending; checking PayPal. Retry only this same checkout.",
          );
        return result;
      });
  }
  private matches(s: CheckoutSession, order: ProviderOrder) {
    return (
      order.id === s.attempt?.orderId &&
      order.sessionId === s.id &&
      order.currency === s.currency &&
      order.totalMinor === s.totalMinor &&
      order.sellerId === this.config.sellerId
    );
  }
  private async reconcile(
    tx: Transaction,
    s: CheckoutSession,
    order: ProviderOrder,
  ) {
    if (s.state === "COMPLETED") return;
    if (!this.matches(s, order)) {
      this.move(s, "PENDING");
      await tx.audit(s.id, "paypal.binding_mismatch");
      await tx.putSession(s);
      return;
    }
    s.attempt!.lastVerifiedAt = this.time();
    if (
      order.capture?.status === "COMPLETED" &&
      order.status === "COMPLETED" &&
      order.capture.currency === s.currency &&
      order.capture.totalMinor === s.totalMinor &&
      order.capture.id
    ) {
      if (!["CAPTURING", "PENDING"].includes(s.state)) this.move(s, "PENDING");
      this.move(s, "COMPLETED");
      s.receipt = {
        id: `rc_${randomUUID()}`,
        sessionId: s.id,
        captureId: order.capture.id,
        merchant: s.merchantDisplayName,
        currency: s.currency,
        totalMinor: s.totalMinor,
        completedAt: this.time(),
        deviceId: s.ownerDeviceId,
        isSandbox: true,
      };
      await tx.audit(s.id, "paypal.capture_verified");
    } else if (
      ["DECLINED", "DENIED", "FAILED"].includes(order.capture?.status ?? "") ||
      order.status === "VOIDED"
    ) {
      this.move(s, "FAILED");
    } else if (
      order.status === "COMPLETED" ||
      order.capture ||
      s.state === "CAPTURING"
    ) {
      this.move(s, "PENDING");
    } else if (order.status === "APPROVED") {
      this.move(s, "APPROVED");
    } else if (s.state === "PENDING" && order.status === "CREATED")
      this.move(s, "CREATED");
    await tx.putSession(s);
  }
  async capture(actor: Actor, id: string, orderId: string) {
    await this.repo.transaction(async (tx) => {
      const s = await this.load(tx, actor, id, { edit: true });
      if (s.attempt?.orderId !== orderId)
        throw new CheckoutError(
          "ORDER_MISMATCH",
          "This PayPal order does not belong to this checkout.",
        );
      if (s.state === "COMPLETED") return;
      if (["FAILED", "CANCELLED"].includes(s.state))
        throw new CheckoutError("LOCKED", "This payment cannot be captured.");
      let order: ProviderOrder;
      try {
        order = await this.gateway.get(orderId);
      } catch {
        this.move(s, "PENDING");
        await tx.putSession(s);
        return;
      }
      if (!this.matches(s, order)) {
        this.move(s, "PENDING");
        await tx.putSession(s);
        return;
      }
      if (order.status === "COMPLETED" || order.capture) {
        await this.reconcile(tx, s, order);
        return;
      }
      if (order.status !== "APPROVED")
        throw new CheckoutError(
          "NOT_APPROVED",
          "Payment not completed. Approve this order in PayPal to continue.",
        );
      if (s.state !== "CAPTURING") {
        if (s.state !== "APPROVED") this.move(s, "APPROVED");
        this.move(s, "CAPTURING");
      }
      await tx.putSession(s);
      await tx.audit(id, "paypal.capture_intent");
    });
    return this.repo.transaction(async (tx) => {
      const s = await this.load(tx, actor, id, { edit: true });
      if (s.state !== "CAPTURING") return publicSession(s, actor);
      try {
        await this.reconcile(
          tx,
          s,
          await this.gateway.capture(orderId, s.attempt!.captureRequestId),
        );
      } catch {
        this.move(s, "PENDING");
        await tx.putSession(s);
      }
      return publicSession(s, actor);
    });
  }
  async status(actor: Actor, id: string) {
    return this.repo.transaction(async (tx) => {
      const s = await this.load(tx, actor, id);
      if (
        s.attempt?.orderId &&
        !["COMPLETED", "FAILED", "CANCELLED"].includes(s.state)
      ) {
        try {
          await this.reconcile(
            tx,
            s,
            await this.gateway.get(s.attempt.orderId),
          );
        } catch {
          if (!["CREATING", "PENDING"].includes(s.state))
            this.move(s, "PENDING");
          await tx.putSession(s);
        }
      }
      return publicSession(s, actor);
    });
  }
  async receipt(actor: Actor, id: string) {
    return this.repo.transaction(async (tx) => {
      const row = await tx.getReceipt(id);
      if (!row || row.userId !== actor.userId)
        throw new CheckoutError(
          "NOT_FOUND",
          "Receipt not found for this account.",
          404,
        );
      const { deviceId: _device, ...receipt } = row.data;
      return receipt;
    });
  }
  async webhook(eventId: string, orderId: string) {
    return this.repo.transaction(async (tx) => {
      if (await tx.hasEvent(eventId)) return { duplicate: true };
      const s = await tx.findOrder(orderId);
      if (!s)
        throw new CheckoutError(
          "UNKNOWN_ORDER",
          "Order is not recorded yet. Retry webhook delivery.",
          503,
        );
      if (s.state !== "COMPLETED")
        await this.reconcile(tx, s, await this.gateway.get(orderId));
      await tx.addEvent(eventId, orderId);
      return { duplicate: false };
    });
  }
  async handoff(actor: Actor, id: string, version: number) {
    await this.repo.rateLimit(
      `handoff:${actor.userId}`,
      10,
      60_000,
      this.now(),
    );
    return this.repo.transaction(async (tx) => {
      const s = await this.load(tx, actor, id, {
        edit: true,
        version,
        fresh: true,
      });
      if (!unpaid(s))
        throw new CheckoutError(
          "LOCKED",
          "Only an unpaid draft without a PayPal order can move to another device.",
        );
      const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      const code = Array.from(
        randomBytes(10),
        (n) => alphabet[n % alphabet.length],
      ).join("");
      const hash = digest(code),
        expiresAt = new Date(this.now() + 90_000).toISOString();
      s.handoffId = hash;
      await tx.putHandoff({
        id: hash,
        sessionId: id,
        userId: actor.userId,
        sourceDeviceId: actor.deviceId,
        version: s.version,
        expiresAt,
        redeemed: false,
      });
      await tx.putSession(s);
      return { code: `${code.slice(0, 5)}-${code.slice(5)}`, expiresAt };
    });
  }
  async redeem(actor: Actor, code: string) {
    // Consume the budget outside the redemption transaction so rejected codes cannot roll it back.
    await this.repo.rateLimit(`redeem:${actor.userId}`, 8, 60_000, this.now());
    return this.repo.transaction(async (tx) => {
      const hash = digest(code.toUpperCase().replace(/[\s-]/g, "")),
        handoff = await tx.getHandoff(hash);
      const invalid = () =>
        new CheckoutError(
          "INVALID_CODE",
          "Code unavailable. Check the account and code, or create a new code on the original device.",
          400,
        );
      if (
        !handoff ||
        handoff.userId !== actor.userId ||
        handoff.redeemed ||
        Date.parse(handoff.expiresAt) <= this.now() ||
        handoff.sourceDeviceId === actor.deviceId
      )
        throw invalid();
      const s = await tx.getSession(handoff.sessionId);
      if (
        !s ||
        !unpaid(s) ||
        s.handoffId !== hash ||
        s.version !== handoff.version ||
        Date.parse(s.expiresAt) <= this.now() ||
        s.ownerDeviceId !== handoff.sourceDeviceId
      )
        throw invalid();
      handoff.redeemed = true;
      s.ownerDeviceId = actor.deviceId;
      s.version++;
      s.reviewedVersion = undefined;
      s.handoffId = undefined;
      this.move(s, "REVIEW_REQUIRED");
      await tx.putHandoff(handoff);
      await tx.putSession(s);
      await tx.audit(s.id, "handoff.redeemed");
      return publicSession(s, actor);
    });
  }
}
