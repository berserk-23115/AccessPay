import { PGlite } from "@electric-sql/pglite";
import {
  drizzle as pgliteDrizzle,
  type PgliteDatabase,
} from "drizzle-orm/pglite";
import { drizzle as postgresDrizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, sql, desc } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { CheckoutError, type CheckoutSession } from "@accesspay/core";
import * as schema from "./schema";
import { migration } from "./migrations/0001";
export type Database = PgliteDatabase<typeof schema>;
export class Transaction {
  constructor(private db: Database) {}
  async getSession(id: string) {
    return (
      await this.db
        .select()
        .from(schema.sessions)
        .where(eq(schema.sessions.id, id))
    )[0]?.data;
  }
  async findOrder(id: string) {
    const a = (
      await this.db
        .select()
        .from(schema.attempts)
        .where(eq(schema.attempts.orderId, id))
    )[0];
    return a ? this.getSession(a.sessionId) : undefined;
  }
  async list(userId: string) {
    return (
      await this.db
        .select()
        .from(schema.sessions)
        .where(eq(schema.sessions.userId, userId))
        .orderBy(desc(schema.sessions.expiresAt))
        .limit(30)
    ).map((row) => row.data);
  }
  async putSession(s: CheckoutSession) {
    const row = {
      id: s.id,
      userId: s.userId,
      merchantId: s.storeId,
      version: s.version,
      state: s.state,
      totalMinor: s.totalMinor,
      expiresAt: new Date(s.expiresAt),
      data: s,
    };
    await this.db
      .insert(schema.sessions)
      .values(row)
      .onConflictDoUpdate({ target: schema.sessions.id, set: row });
    await this.db.delete(schema.items).where(eq(schema.items.sessionId, s.id));
    await this.db.insert(schema.items).values(
      s.lineItems.map((item) => ({
        id: `${s.id}:${item.sku}`,
        sessionId: s.id,
        sku: item.sku,
        qty: item.qty,
        unitMinor: item.unitMinor,
      })),
    );
    if (s.attempt) {
      const a = {
        id: s.attempt.id,
        sessionId: s.id,
        orderId: s.attempt.orderId,
        createRequestId: s.attempt.createRequestId,
        captureRequestId: s.attempt.captureRequestId,
        state: s.state,
      };
      await this.db
        .insert(schema.attempts)
        .values(a)
        .onConflictDoUpdate({ target: schema.attempts.id, set: a });
    }
    if (s.receipt)
      await this.db
        .insert(schema.receipts)
        .values({
          id: s.receipt.id,
          sessionId: s.id,
          captureId: s.receipt.captureId,
          userId: s.userId,
          data: s.receipt,
        })
        .onConflictDoNothing();
  }
  async recordReview(s: CheckoutSession) {
    await this.db
      .insert(schema.reviews)
      .values({
        id: `${s.id}:${s.version}`,
        sessionId: s.id,
        version: s.version,
      })
      .onConflictDoNothing();
  }
  async getReceipt(id: string) {
    return (
      await this.db
        .select()
        .from(schema.receipts)
        .where(eq(schema.receipts.id, id))
    )[0];
  }
  async getHandoff(id: string) {
    return (
      await this.db
        .select()
        .from(schema.handoffs)
        .where(eq(schema.handoffs.id, id))
    )[0]?.data;
  }
  async putHandoff(data: schema.Handoff) {
    await this.db
      .insert(schema.handoffs)
      .values({ id: data.id, data })
      .onConflictDoUpdate({ target: schema.handoffs.id, set: { data } });
  }
  async hasEvent(id: string) {
    return !!(
      await this.db.select().from(schema.events).where(eq(schema.events.id, id))
    )[0];
  }
  async addEvent(id: string, orderId: string) {
    await this.db.insert(schema.events).values({ id, orderId });
  }
  async audit(sessionId: string, action: string) {
    await this.db
      .insert(schema.audit)
      .values({ id: randomUUID(), sessionId, action });
  }
  async consumeRate(id: string, limit: number, windowMs: number, now: number) {
    const row = (
      await this.db
        .select()
        .from(schema.rateLimits)
        .where(eq(schema.rateLimits.id, id))
    )[0];
    if (row && row.resetAt.getTime() > now && row.count >= limit) return false;
    await this.db
      .insert(schema.rateLimits)
      .values({ id, count: 1, resetAt: new Date(now + windowMs) })
      .onConflictDoUpdate({
        target: schema.rateLimits.id,
        set:
          row && row.resetAt.getTime() > now
            ? { count: row.count + 1 }
            : { count: 1, resetAt: new Date(now + windowMs) },
      });
    return true;
  }
}
export type Repository = {
  transaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T>;
  rateLimit(
    key: string,
    limit: number,
    windowMs: number,
    now?: number,
  ): Promise<void>;
  close(): Promise<void>;
  migrate(): Promise<void>;
};
export async function createRepository(
  options: {
    memory?: boolean;
    url?: string;
    localPath?: string;
    migrate?: boolean;
  } = {},
): Promise<Repository> {
  let db: Database, close: () => Promise<void>;
  if (options.url) {
    const client = postgres(options.url, {
      max: 5,
      connect_timeout: 10,
      idle_timeout: 20,
    });
    db = postgresDrizzle(client, { schema }) as unknown as Database;
    close = async () => {
      await client.end();
    };
  } else {
    const path = options.memory
      ? undefined
      : (options.localPath ?? ".data/postgres");
    if (path) await mkdir(path, { recursive: true });
    const client = new PGlite(path);
    db = pgliteDrizzle(client, { schema });
    close = () => client.close();
  }
  const migrate = async () => {
    await db.transaction(async (tx) => {
      for (const statement of migration
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean))
        await tx.execute(sql.raw(statement));
    });
  };
  if (options.migrate !== false) await migrate();
  // PGlite transactions need a JS queue. The database lock also serializes independent Render processes.
  let queue: Promise<unknown> = Promise.resolve();
  const transaction = <T>(fn: (tx: Transaction) => Promise<T>): Promise<T> => {
    const result = queue.then(() =>
      db.transaction(async (tx) => {
        await tx
          .select()
          .from(schema.transactionLock)
          .where(eq(schema.transactionLock.id, 1))
          .for("update");
        return fn(new Transaction(tx as unknown as Database));
      }),
    );
    queue = result.catch(() => {});
    return result;
  };
  return {
    transaction,
    close,
    migrate,
    async rateLimit(key, limit, windowMs, now = Date.now()) {
      const allowed = await transaction((tx) =>
        tx.consumeRate(key, limit, windowMs, now),
      );
      if (!allowed)
        throw new CheckoutError(
          "RATE_LIMIT",
          "Too many attempts. Wait a minute and try again.",
          429,
        );
    },
  };
}
