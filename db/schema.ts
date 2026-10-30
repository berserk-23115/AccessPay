import {
  pgTable,
  text,
  integer,
  jsonb,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import type { CheckoutSession, Receipt } from "@accesspay/core";
export const transactionLock = pgTable("transaction_lock", {
  id: integer("id").primaryKey(),
});
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  handle: text("handle").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export const merchants = pgTable("merchants", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
});
export const sessions = pgTable("checkout_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  merchantId: text("merchant_id").notNull(),
  version: integer("version").notNull(),
  state: text("state").notNull(),
  totalMinor: integer("total_minor").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  data: jsonb("data").$type<CheckoutSession>().notNull(),
});
export const items = pgTable("checkout_items", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => sessions.id),
  sku: text("sku").notNull(),
  qty: integer("qty").notNull(),
  unitMinor: integer("unit_minor").notNull(),
});
export const reviews = pgTable("reviews", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  version: integer("version").notNull(),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export const attempts = pgTable("payment_attempts", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  orderId: text("order_id").unique(),
  createRequestId: text("create_request_id").notNull().unique(),
  captureRequestId: text("capture_request_id").notNull().unique(),
  state: text("state").notNull(),
});
export type Handoff = {
  id: string;
  sessionId: string;
  userId: string;
  sourceDeviceId: string;
  version: number;
  expiresAt: string;
  redeemed: boolean;
};
export const handoffs = pgTable("handoffs", {
  id: text("id").primaryKey(),
  data: jsonb("data").$type<Handoff>().notNull(),
});
export const events = pgTable("payment_events", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export const receipts = pgTable("receipts", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  captureId: text("capture_id").notNull().unique(),
  userId: text("user_id").notNull(),
  data: jsonb("data").$type<Receipt>().notNull(),
});
export const audit = pgTable("audit_events", {
  id: text("id").primaryKey(),
  sessionId: text("session_id"),
  action: text("action").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export const rateLimits = pgTable("rate_limits", {
  id: text("id").primaryKey(),
  count: integer("count").notNull(),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
});
// Reserved for optional device step-up; no biometric data is stored.
export const authenticators = pgTable("authenticators", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  publicKey: text("public_key").notNull(),
  counter: integer("counter").notNull(),
  backedUp: boolean("backed_up").notNull().default(false),
});
