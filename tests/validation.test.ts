import { describe, expect, it } from "vitest";
import {
  clampInt,
  isEmail,
  isPlainObject,
  isUuid,
  isValidPhone,
  normalizePhone,
  oneOf,
  queryId,
  sanitizeText,
  trimmed,
  validDate,
} from "@/lib/validation";

describe("isUuid", () => {
  it("accepts a canonical uuid", () => {
    expect(isUuid("00000000-0000-0000-0000-000000000000")).toBe(true);
  });
  it("rejects malformed values", () => {
    for (const bad of ["", "abc", "00000000-0000-0000-0000-00000000000", 42, null, undefined]) {
      expect(isUuid(bad)).toBe(false);
    }
  });
});

describe("isEmail", () => {
  it("accepts plausible addresses", () => {
    expect(isEmail("a@b.tn")).toBe(true);
    expect(isEmail("first.last+tag@sub.domain.org")).toBe(true);
  });
  it("rejects junk", () => {
    for (const bad of ["a@b", "a b@c.com", "@b.com", "a@.com", ""]) {
      expect(isEmail(bad)).toBe(false);
    }
  });
});

describe("phone helpers", () => {
  it("normalizes to digits and a leading plus", () => {
    expect(normalizePhone("+216 (55) 123-456")).toBe("+21655123456");
    expect(normalizePhone("abc")).toBe("");
  });
  it("validates 6–15 digit numbers", () => {
    expect(isValidPhone("55123456")).toBe(true);
    expect(isValidPhone("+216 55 123 456")).toBe(true);
    expect(isValidPhone("12345")).toBe(false);
    expect(isValidPhone("1234567890123456")).toBe(false);
  });
});

describe("sanitizeText / trimmed", () => {
  it("strips control characters and clamps length", () => {
    expect(sanitizeText("a\u0000b\u001fc", 100)).toBe("abc");
    expect(sanitizeText("x".repeat(50), 10)).toBe("x".repeat(10));
  });
  it("keeps newlines and tabs", () => {
    expect(sanitizeText("line1\nline2\tend")).toBe("line1\nline2\tend");
  });
  it("returns null for non-strings", () => {
    expect(sanitizeText(123)).toBeNull();
    expect(trimmed(null)).toBeNull();
  });
  it("trims whitespace", () => {
    expect(trimmed("  hello  ")).toBe("hello");
  });
});

describe("oneOf", () => {
  const allowed = ["a", "b"] as const;
  it("returns the value when allowed", () => {
    expect(oneOf("a", allowed)).toBe("a");
  });
  it("returns null otherwise", () => {
    expect(oneOf("c", allowed)).toBeNull();
    expect(oneOf(1, allowed)).toBeNull();
    expect(oneOf(undefined, allowed)).toBeNull();
  });
});

describe("clampInt", () => {
  it("accepts integers within range", () => {
    expect(clampInt(5, 1, 10)).toBe(5);
    expect(clampInt("7", 1, 10)).toBe(7);
  });
  it("rejects out-of-range, fractional, and non-numeric values", () => {
    expect(clampInt(0, 1, 10)).toBeNull();
    expect(clampInt(11, 1, 10)).toBeNull();
    expect(clampInt(1.5, 1, 10)).toBeNull();
    expect(clampInt("abc", 1, 10)).toBeNull();
  });
});

describe("queryId", () => {
  it("narrows string and first array element", () => {
    expect(queryId("x")).toBe("x");
    expect(queryId(["x", "y"])).toBe("x");
  });
  it("returns null for unsupported shapes", () => {
    expect(queryId([])).toBeNull();
    expect(queryId(undefined)).toBeNull();
  });
});

describe("validDate", () => {
  it("accepts parseable ISO strings", () => {
    expect(validDate("2026-01-02T03:04:05Z")).toBe("2026-01-02T03:04:05Z");
  });
  it("rejects invalid input", () => {
    expect(validDate("not-a-date")).toBeNull();
    expect(validDate(123)).toBeNull();
  });
});

describe("isPlainObject", () => {
  it("distinguishes plain objects from arrays and null", () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject(null)).toBe(false);
    expect(isPlainObject("x")).toBe(false);
  });
});
