import { describe, expect, it } from "vitest";
import type { NextApiRequest, NextApiResponse } from "next";
import { clientIp, enforceRateLimit, rateLimit } from "@/lib/rate-limit";

describe("rateLimit", () => {
  it("allows requests up to the limit then blocks", () => {
    const key = `t-${Math.random()}`;
    const first = rateLimit(key, 2, 10_000);
    expect(first.ok).toBe(true);
    expect(first.remaining).toBe(1);
    expect(rateLimit(key, 2, 10_000).remaining).toBe(0);
    const blocked = rateLimit(key, 2, 10_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("tracks separate keys independently", () => {
    const a = `a-${Math.random()}`;
    const b = `b-${Math.random()}`;
    rateLimit(a, 1, 10_000);
    expect(rateLimit(a, 1, 10_000).ok).toBe(false);
    expect(rateLimit(b, 1, 10_000).ok).toBe(true);
  });

  it("resets once the window elapses", () => {
    const key = `w-${Math.random()}`;
    rateLimit(key, 1, 1);
    const start = Date.now();
    while (Date.now() - start < 5) {
      /* busy wait past the window */
    }
    expect(rateLimit(key, 1, 1).ok).toBe(true);
  });
});

function fakeReq(headers: Record<string, string>, remoteAddress = "10.0.0.1") {
  return { headers, socket: { remoteAddress } } as unknown as NextApiRequest;
}

describe("clientIp", () => {
  it("uses the socket address by default", () => {
    const prev = process.env.TRUST_PROXY;
    delete process.env.TRUST_PROXY;
    try {
      expect(clientIp(fakeReq({ "x-forwarded-for": "1.2.3.4" }))).toBe("10.0.0.1");
    } finally {
      if (prev !== undefined) process.env.TRUST_PROXY = prev;
    }
  });

  it("trusts the first x-forwarded-for hop when TRUST_PROXY=1", () => {
    process.env.TRUST_PROXY = "1";
    try {
      expect(clientIp(fakeReq({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }))).toBe("1.2.3.4");
    } finally {
      delete process.env.TRUST_PROXY;
    }
  });
});

describe("enforceRateLimit", () => {
  function fakeRes() {
    const state: { status?: number; body?: unknown; headers: Record<string, string> } = {
      headers: {},
    };
    const res = {
      setHeader: (k: string, v: string) => {
        state.headers[k] = v;
      },
      status: (code: number) => {
        state.status = code;
        return res;
      },
      json: (body: unknown) => {
        state.body = body;
        return res;
      },
    } as unknown as NextApiResponse;
    return { res, state };
  }

  it("passes under the limit and writes 429 with Retry-After over it", () => {
    const scope = `scope-${Math.random()}`;
    const { res, state } = fakeRes();
    expect(enforceRateLimit(fakeReq({}), res, scope, 1, 10_000)).toBe(true);
    expect(enforceRateLimit(fakeReq({}), res, scope, 1, 10_000)).toBe(false);
    expect(state.status).toBe(429);
    expect(Number(state.headers["Retry-After"])).toBeGreaterThan(0);
  });
});
