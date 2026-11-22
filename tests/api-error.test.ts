import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextApiRequest, NextApiResponse } from "next";
import { internalError } from "@/lib/api-error";

function fakeRes() {
  const sent: { status?: number; body?: unknown } = {};
  const res = {
    status(code: number) {
      sent.status = code;
      return this;
    },
    json(body: unknown) {
      sent.body = body;
      return this;
    },
  };
  return { res: res as unknown as NextApiResponse, sent };
}

const req = { url: "/api/events?page=1" } as NextApiRequest;

describe("internalError", () => {
  let logged: string[];
  beforeEach(() => {
    logged = [];
    const collect = (line: unknown) => logged.push(String(line));
    vi.spyOn(console, "error").mockImplementation(collect);
    vi.spyOn(console, "warn").mockImplementation(collect);
  });
  afterEach(() => vi.restoreAllMocks());

  const body = () => JSON.stringify(logged.join("\n"));

  it("returns a fixed message, never the database cause", () => {
    const { res, sent } = fakeRes();
    internalError(
      req,
      res,
      "Les actions sont momentanément indisponibles.",
      { message: 'duplicate key value violates unique constraint "events_org_id_fkey"' },
    );

    expect(sent.status).toBe(500);
    expect(sent.body).toEqual({
      error: "Les actions sont momentanément indisponibles.",
    });
    expect(JSON.stringify(sent.body)).not.toContain("events_org_id_fkey");
    expect(JSON.stringify(sent.body)).not.toContain("duplicate key");
  });

  it("logs the real cause server-side with the route", () => {
    const { res } = fakeRes();
    internalError(req, res, "nope", new TypeError("fetch failed"));

    expect(body()).toContain("api.internal");
    expect(body()).toContain("fetch failed");
    expect(body()).toContain("/api/events");
  });

  it("keeps a client-safe body for 4xx and still logs the code", () => {
    const { res, sent } = fakeRes();
    internalError(req, res, "Enregistrement impossible.", { code: "23505" }, 400);

    expect(sent.status).toBe(400);
    expect(sent.body).toEqual({ error: "Enregistrement impossible." });
    expect(body()).toContain("23505");
  });
});
