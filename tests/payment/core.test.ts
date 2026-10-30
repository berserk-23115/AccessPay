import { describe, expect, it } from "vitest";
import {
  priceCart,
  money,
  amountReadback,
  cartInput,
  transition,
} from "@accesspay/core";

describe("authoritative checkout facts", () => {
  it("computes lamp shipping and tax from catalog prices in integer minor units", () => {
    expect(
      priceCart({ storeId: "store-a", items: [{ sku: "lamp-01", qty: 1 }] }),
    ).toMatchObject({
      subtotalMinor: 2500,
      shippingMinor: 300,
      taxMinor: 140,
      totalMinor: 2940,
      currency: "USD",
    });
  });
  it("rejects browser supplied totals, foreign products, and fractional quantities", () => {
    expect(() =>
      cartInput.parse({
        storeId: "store-a",
        items: [{ sku: "lamp-01", qty: 1 }],
        totalMinor: 1,
      }),
    ).toThrow();
    expect(() =>
      priceCart({ storeId: "store-b", items: [{ sku: "lamp-01", qty: 1 }] }),
    ).toThrow();
    expect(() =>
      priceCart({ storeId: "store-a", items: [{ sku: "lamp-01", qty: 1.5 }] }),
    ).toThrow();
  });
  it("uses exact financial formatting, including zero cents", () => {
    expect(money(2940)).toBe("$29.40");
    expect(amountReadback(2940)).toBe("29 US dollars and 40 cents");
    expect(amountReadback(100)).toBe("1 US dollar and 0 cents");
    expect(() => money(1.1)).toThrow();
  });
  it("refuses completion from buyer approval alone", () => {
    expect(() => transition("CREATED", "COMPLETED")).toThrow();
    expect(transition("CAPTURING", "PENDING")).toBe("PENDING");
    expect(() => transition("COMPLETED", "READY")).toThrow();
  });
});
