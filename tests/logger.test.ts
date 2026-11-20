import { afterEach, describe, expect, it, vi } from "vitest";
import { logEvent, sameOrigin, sha256Hex } from "@/lib/logger";

describe("sameOrigin", () => {
  it("accepts matching origin and host", () => {
    expect(
      sameOrigin({ headers: { origin: "https://app.example.com", host: "app.example.com" } }),
    ).toBe(true);
  });
  it("rejects mismatched or missing origin", () => {
    expect(
      sameOrigin({ headers: { origin: "https://evil.com", host: "app.example.com" } }),
    ).toBe(false);
    expect(sameOrigin({ headers: { host: "app.example.com" } })).toBe(false);
    expect(sameOrigin({ headers: { origin: "not a url", host: "x" } })).toBe(false);
  });
  it("handles array header values", () => {
    expect(
      sameOrigin({ headers: { origin: ["https://a.tn"], host: ["a.tn"] } }),
    ).toBe(true);
  });
});

describe("sha256Hex", () => {
  it("is deterministic and non-reversible-looking", async () => {
    const a = await sha256Hex("hello@example.com");
    const b = await sha256Hex("hello@example.com");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toContain("hello");
  });
  it("differs for different inputs", async () => {
    expect(await sha256Hex("a")).not.toBe(await sha256Hex("b"));
  });
});

describe("logEvent", () => {
  afterEach(() => vi.restoreAllMocks());

  it("writes structured JSON at the right level", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logEvent("error", "test.event", { id: 1 });
    expect(spy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(spy.mock.calls[0][0] as string);
    expect(payload.level).toBe("error");
    expect(payload.event).toBe("test.event");
    expect(payload.id).toBe(1);
    expect(typeof payload.ts).toBe("string");
  });
});
