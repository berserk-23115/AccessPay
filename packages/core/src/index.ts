import { z } from "zod";

export class CheckoutError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 409,
  ) {
    super(message);
    this.name = "CheckoutError";
  }
}
// Runtime services survive Next development hot reloads; error handling must survive module identity changes too.
export function isCheckoutError(error: unknown): error is CheckoutError {
  if (!error || typeof error !== "object") return false;
  const value = error as Record<string, unknown>;
  return (
    value.name === "CheckoutError" &&
    typeof value.code === "string" &&
    /^[A-Z_]+$/.test(value.code) &&
    typeof value.message === "string" &&
    Number.isInteger(value.status) &&
    Number(value.status) >= 400 &&
    Number(value.status) <= 599
  );
}
export const cartInput = z
  .object({
    storeId: z.enum(["store-a", "store-b"]),
    items: z
      .array(
        z
          .object({
            sku: z.string().min(1).max(80),
            qty: z.number().int().min(1).max(10),
          })
          .strict(),
      )
      .min(1)
      .max(10),
  })
  .strict();
export type CartInput = z.infer<typeof cartInput>;
export type Actor = { userId: string; deviceId: string };
export type State =
  | "REVIEW_REQUIRED"
  | "READY"
  | "CREATING"
  | "CREATED"
  | "APPROVED"
  | "CAPTURING"
  | "PENDING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";
export type LineItem = {
  sku: string;
  name: string;
  description: string;
  qty: number;
  unitMinor: number;
};
export type Store = {
  id: CartInput["storeId"];
  name: string;
  domain: string;
  description: string;
  delivery: string;
  returns: string;
  shippingMinor: number;
  products: Omit<LineItem, "qty">[];
};
export const stores: Record<CartInput["storeId"], Store> = {
  "store-a": {
    id: "store-a",
    name: "Northstar Goods",
    domain: "Northstar demo store",
    description: "Considered essentials for your everyday space.",
    delivery: "Standard delivery in 3–5 business days.",
    returns:
      "Return unused items within 30 days. Contact the demo merchant before returning an item.",
    shippingMinor: 300,
    products: [
      {
        sku: "lamp-01",
        name: "Arc desk lamp",
        description:
          "A warm pool of light. Adjustable head, matte blue finish, and a simple tactile switch.",
        unitMinor: 2500,
      },
      {
        sku: "tray-01",
        name: "Everyday catchall",
        description:
          "A solid oak tray for the small things you reach for every day.",
        unitMinor: 1800,
      },
      {
        sku: "notebook-01",
        name: "Lay-flat notebook",
        description:
          "Recycled paper, generous spacing, and a binding that stays open.",
        unitMinor: 1200,
      },
    ],
  },
  "store-b": {
    id: "store-b",
    name: "Fieldwork Supply",
    domain: "Fieldwork demo store",
    description: "Good tools. More room to make.",
    delivery: "Tracked delivery in 4–6 business days.",
    returns:
      "Return unopened supplies within 30 days. Opened supplies cannot be returned.",
    shippingMinor: 450,
    products: [
      {
        sku: "sketch-01",
        name: "Studio sketchbook",
        description:
          "Heavyweight, uncoated paper for ideas in pencil, ink, or charcoal.",
        unitMinor: 1600,
      },
      {
        sku: "pencil-01",
        name: "Graphite set",
        description:
          "Six graphite pencils with distinct grades and a comfortable hexagonal grip.",
        unitMinor: 900,
      },
      {
        sku: "pouch-01",
        name: "Canvas tool roll",
        description:
          "Durable cotton canvas with roomy pockets and a simple tie closure.",
        unitMinor: 2200,
      },
    ],
  },
};
export function assertMinor(value: number) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 100_000_000)
    throw new CheckoutError(
      "INVALID_AMOUNT",
      "Amount must be a safe, nonnegative integer.",
      400,
    );
}
export function money(minor: number, currency = "USD"): string {
  assertMinor(minor);
  if (currency !== "USD")
    throw new CheckoutError("CURRENCY", "Only US dollars are supported.", 400);
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    minor / 100,
  );
}
export function decimalAmount(minor: number): string {
  assertMinor(minor);
  return `${Math.floor(minor / 100)}.${String(minor % 100).padStart(2, "0")}`;
}
export function amountReadback(minor: number): string {
  assertMinor(minor);
  const dollars = Math.floor(minor / 100),
    cents = minor % 100;
  return `${dollars} US dollar${dollars === 1 ? "" : "s"} and ${cents} cent${cents === 1 ? "" : "s"}`;
}
export function priceCart(input: unknown) {
  const cart = cartInput.parse(input),
    store = stores[cart.storeId];
  const seen = new Set<string>();
  const lineItems = cart.items.map(({ sku, qty }) => {
    const product = store.products.find((p) => p.sku === sku);
    if (!product || seen.has(sku))
      throw new CheckoutError(
        "INVALID_CART",
        "Choose each item once from this store.",
        400,
      );
    seen.add(sku);
    return { ...product, qty };
  });
  const subtotalMinor = lineItems.reduce(
    (sum, item) => sum + item.qty * item.unitMinor,
    0,
  );
  // Fixed demo tax of 5.6%, rounded once on the item subtotal.
  const taxMinor = Math.floor((subtotalMinor * 56 + 500) / 1000);
  const totalMinor = subtotalMinor + taxMinor + store.shippingMinor;
  assertMinor(totalMinor);
  return {
    storeId: store.id,
    merchantDisplayName: store.name,
    merchantDomain: store.domain,
    lineItems,
    currency: "USD" as const,
    subtotalMinor,
    shippingMinor: store.shippingMinor,
    taxMinor,
    totalMinor,
    delivery: store.delivery,
    returnPolicy: store.returns,
  };
}
export type PricedCart = ReturnType<typeof priceCart>;
export type Attempt = {
  id: string;
  createRequestId: string;
  captureRequestId: string;
  orderId?: string;
  lastVerifiedAt?: string;
};
export type Receipt = {
  id: string;
  sessionId: string;
  captureId: string;
  merchant: string;
  currency: "USD";
  totalMinor: number;
  completedAt: string;
  deviceId: string;
  isSandbox: true;
};
export type CheckoutSession = PricedCart & {
  id: string;
  userId: string;
  ownerDeviceId: string;
  version: number;
  reviewedVersion?: number;
  state: State;
  expiresAt: string;
  createdAt: string;
  attempt?: Attempt;
  receipt?: Receipt;
  handoffId?: string;
  history: { state: State; at: string }[];
  isSandbox: true;
};
export type PublicSession = Omit<
  CheckoutSession,
  "userId" | "ownerDeviceId" | "handoffId" | "attempt" | "receipt"
> & {
  canEdit: boolean;
  receiptId?: string;
  orderId?: string;
  completedOnAnotherDevice: boolean;
};
export const stateLabels: Record<State, string> = {
  REVIEW_REQUIRED: "Ready for your review",
  READY: "Reviewed. Ready for PayPal",
  CREATING: "Preparing PayPal checkout",
  CREATED: "Awaiting PayPal approval",
  APPROVED: "Approved. Checking payment",
  CAPTURING: "Checking payment",
  PENDING: "Status pending; checking PayPal",
  COMPLETED: "Payment completed",
  FAILED: "Payment not completed",
  CANCELLED: "Checkout cancelled",
};
const edges: Record<State, State[]> = {
  REVIEW_REQUIRED: ["READY", "CANCELLED"],
  READY: ["REVIEW_REQUIRED", "CREATING", "CANCELLED"],
  CREATING: ["CREATED", "PENDING"],
  CREATED: ["APPROVED", "PENDING", "FAILED"],
  APPROVED: ["CAPTURING", "PENDING", "FAILED"],
  CAPTURING: ["COMPLETED", "PENDING", "FAILED"],
  PENDING: ["CREATED", "APPROVED", "CAPTURING", "COMPLETED", "FAILED"],
  COMPLETED: [],
  FAILED: [],
  CANCELLED: [],
};
export function transition(from: State, to: State): State {
  if (from === to) return to;
  if (!edges[from].includes(to))
    throw new CheckoutError(
      "INVALID_STATE",
      `Cannot move checkout from ${from} to ${to}.`,
    );
  return to;
}
export function publicSession(s: CheckoutSession, actor: Actor): PublicSession {
  const {
    userId: _user,
    ownerDeviceId,
    handoffId: _handoff,
    attempt,
    receipt,
    ...facts
  } = s;
  return {
    ...facts,
    canEdit: ownerDeviceId === actor.deviceId,
    receiptId: receipt?.id,
    orderId: attempt?.orderId,
    completedOnAnotherDevice: !!receipt && receipt.deviceId !== actor.deviceId,
  };
}
