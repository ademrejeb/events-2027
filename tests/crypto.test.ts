import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, isEncryptionConfigured } from "@/lib/crypto";

const original = process.env.TOKEN_ENCRYPTION_KEY;

describe("secret encryption", () => {
  beforeEach(() => {
    process.env.TOKEN_ENCRYPTION_KEY = "test-passphrase-at-least-32-chars-long!!";
  });
  afterEach(() => {
    if (original === undefined) delete process.env.TOKEN_ENCRYPTION_KEY;
    else process.env.TOKEN_ENCRYPTION_KEY = original;
  });

  it("reports configuration when a key is present", () => {
    expect(isEncryptionConfigured()).toBe(true);
  });

  it("round-trips a token", () => {
    const token = "EAAG-super-secret-token-123";
    const encrypted = encryptSecret(token);
    expect(encrypted.startsWith("v1:")).toBe(true);
    expect(encrypted).not.toContain(token);
    expect(decryptSecret(encrypted)).toBe(token);
  });

  it("uses a fresh IV each time", () => {
    expect(encryptSecret("same")).not.toBe(encryptSecret("same"));
  });

  it("rejects tampered ciphertext", () => {
    const encrypted = encryptSecret("token");
    const parts = encrypted.split(":");
    const data = Buffer.from(parts[3], "base64");
    data[0] ^= 0xff;
    const tampered = `${parts[0]}:${parts[1]}:${parts[2]}:${data.toString("base64")}`;
    expect(() => decryptSecret(tampered)).toThrow();
  });

  it("passes through legacy plaintext values", () => {
    expect(decryptSecret("legacy-plain-token")).toBe("legacy-plain-token");
  });
});

describe("secret encryption without a key", () => {
  beforeEach(() => {
    delete process.env.TOKEN_ENCRYPTION_KEY;
    delete process.env.SOCIAL_TOKEN_KEY;
  });
  afterEach(() => {
    if (original !== undefined) process.env.TOKEN_ENCRYPTION_KEY = original;
  });

  it("falls back to plaintext storage", () => {
    expect(isEncryptionConfigured()).toBe(false);
    expect(encryptSecret("token")).toBe("token");
  });

  it("refuses to decrypt an encrypted value", () => {
    expect(() => decryptSecret("v1:aaaa:bbbb:cccc")).toThrow();
  });
});
