import { describe, expect, it } from "vitest";
import { propose } from "@accesspay/ai";

const reply = (output: unknown) => async () =>
  Response.json({
    choices: [
      {
        message: {
          content: typeof output === "string" ? output : JSON.stringify(output),
        },
      },
    ],
  });
const ask = (output: unknown) =>
  propose("request", {
    apiKey: "fixture",
    fetch: reply(output) as typeof fetch,
  });
const proposal = (storeId: string, items: unknown[]) => ({
  outcome: "proposal",
  storeId,
  items,
  candidateSkus: [],
});

describe("assistant proposals stay inside the catalog", () => {
  it("prices a proposal from the catalog", async () => {
    const result = await ask(proposal("store-a", [{ sku: "lamp-01", qty: 2 }]));
    expect(result.kind).toBe("proposal");
    if (result.kind === "proposal") expect(result.cart.totalMinor).toBe(5580);
  });
  it("ignores a price supplied by the model", async () => {
    const result = await ask({
      ...proposal("store-a", [{ sku: "lamp-01", qty: 1, unitMinor: 1 }]),
      totalMinor: 1,
    });
    if (result.kind === "proposal") expect(result.cart.totalMinor).toBe(2940);
    else expect(result.kind).toBe("unavailable");
  });
  it.each([
    ["an invented SKU", proposal("store-a", [{ sku: "free-01", qty: 1 }])],
    ["another store's SKU", proposal("store-a", [{ sku: "pouch-01", qty: 1 }])],
    ["too many items", proposal("store-a", [{ sku: "lamp-01", qty: 11 }])],
    ["a zero quantity", proposal("store-a", [{ sku: "lamp-01", qty: 0 }])],
    ["no store", proposal(null as unknown as string, [])],
  ])("does not build an order from %s", async (_name, output) => {
    expect((await ask(output)).kind).toBe("clarify");
  });
  it("offers only real products when ambiguous", async () => {
    const result = await ask({
      outcome: "ambiguous",
      storeId: null,
      items: [],
      candidateSkus: ["lamp-01", "invented-01"],
    });
    expect(result.kind === "clarify" && result.options).toEqual([
      { sku: "lamp-01", name: "Arc desk lamp", merchant: "Northstar Goods" },
    ]);
  });
  it("uses fixed wording when a request is unsupported", async () => {
    const result = await ask({
      outcome: "unsupported",
      storeId: null,
      items: [],
      candidateSkus: [],
    });
    expect(result.kind === "clarify" && result.message).toContain(
      "cannot send money to a person",
    );
  });
  it("asks Groq for strict schema output", async () => {
    const sent: { url: string; init: RequestInit }[] = [];
    await propose("two lamps", {
      apiKey: "fixture",
      fetch: (async (url: string, init: RequestInit) => {
        sent.push({ url, init });
        return reply(proposal("store-a", [{ sku: "lamp-01", qty: 2 }]))();
      }) as typeof fetch,
    });
    expect(sent[0].url).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(sent[0].init.headers).toMatchObject({
      authorization: "Bearer fixture",
    });
    const body = JSON.parse(String(sent[0].init.body));
    expect(body.model).toBe("openai/gpt-oss-20b");
    expect(body.response_format.json_schema.strict).toBe(true);
    const schema = body.response_format.json_schema.schema;
    expect(schema.additionalProperties).toBe(false);
    expect(schema.required).toEqual(Object.keys(schema.properties));
  });
  it("retries a failed generation once, then gives up", async () => {
    let calls = 0;
    const failing = (status: number, headers?: HeadersInit) =>
      (async () => {
        calls++;
        return Response.json({ error: {} }, { status, headers });
      }) as typeof fetch;
    const recovered = await propose("two lamps", {
      apiKey: "fixture",
      fetch: (async () => {
        calls++;
        return calls === 1
          ? Response.json({ error: {} }, { status: 400 })
          : reply(proposal("store-a", [{ sku: "lamp-01", qty: 2 }]))();
      }) as typeof fetch,
    });
    expect(recovered.kind).toBe("proposal");
    expect(calls).toBe(2);
    calls = 0;
    expect(
      (await propose("x", { apiKey: "fixture", fetch: failing(400) })).kind,
    ).toBe("unavailable");
    expect(calls).toBe(2);
  });
  it("does not wait out a long rate limit or retry a bad key", async () => {
    let calls = 0;
    const failing = (status: number, headers?: HeadersInit) =>
      (async () => {
        calls++;
        return Response.json({ error: {} }, { status, headers });
      }) as typeof fetch;
    await propose("x", {
      apiKey: "fixture",
      fetch: failing(429, { "retry-after": "3600" }),
    });
    expect(calls).toBe(1);
    calls = 0;
    await propose("x", { apiKey: "fixture", fetch: failing(401) });
    expect(calls).toBe(1);
  });
  it("is unavailable without a key, on bad output, and on API failure", async () => {
    expect((await propose("two lamps")).kind).toBe("unavailable");
    expect((await ask("not json")).kind).toBe("unavailable");
    const failed = await propose("two lamps", {
      apiKey: "fixture",
      fetch: (async () =>
        Response.json(
          { type: "error", error: { type: "invalid_request_error" } },
          { status: 400 },
        )) as typeof fetch,
    });
    expect(failed.kind).toBe("unavailable");
  });
});

describe("personal details never reach the AI provider", () => {
  it("removes emails, card numbers and phone numbers before sending", async () => {
    let sent = "";
    const capture = (async (_url: string, init: RequestInit) => {
      sent = String(init.body);
      return reply(proposal("store-a", [{ sku: "lamp-01", qty: 2 }]))();
    }) as unknown as typeof fetch;
    await propose(
      "2 lamps, card 4111 1111 1111 1111, mail me at a.b@example.com or call +91 98765 43210",
      { apiKey: "fixture", fetch: capture },
    );
    expect(sent).not.toContain("4111");
    expect(sent).not.toContain("example.com");
    expect(sent).not.toContain("98765");
    expect(sent).toContain("2 lamps");
  });
  it("keeps ordinary quantities and prices", async () => {
    const { redact } = await import("@accesspay/ai");
    expect(redact("3 notebooks and 2 lamps under $50")).toBe(
      "3 notebooks and 2 lamps under $50",
    );
    expect(redact("4111-1111-1111-1111")).toBe("[card number removed]");
    expect(redact("9876543210")).toBe("[phone number removed]");
  });
});
