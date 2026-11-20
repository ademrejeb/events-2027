import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Symmetric encryption for secrets at rest (e.g. social access tokens).
 *
 * AES-256-GCM with a random 12-byte IV per value. The key is derived from
 * `TOKEN_ENCRYPTION_KEY` (or the legacy `SOCIAL_TOKEN_KEY`) so any sufficiently
 * long passphrase works. Stored format:
 *
 *   v1:<iv base64>:<auth tag base64>:<ciphertext base64>
 *
 * Values without the `v1:` prefix are treated as legacy plaintext so existing
 * rows keep working until re-saved. Never log decrypted values.
 */

const PREFIX = "v1:";

function key(): Buffer | null {
  const raw = process.env.TOKEN_ENCRYPTION_KEY || process.env.SOCIAL_TOKEN_KEY;
  if (!raw || raw.trim().length < 16) return null;
  // Derive a fixed 32-byte key from the configured passphrase.
  return createHash("sha256").update(raw.trim(), "utf8").digest();
}

export function isEncryptionConfigured(): boolean {
  return key() !== null;
}

export function encryptSecret(plaintext: string): string {
  const k = key();
  if (!k) return plaintext; // no key configured — caller should warn in ops docs
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", k, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${ciphertext.toString("base64")}`;
}

export function decryptSecret(stored: string): string {
  if (!stored.startsWith(PREFIX)) return stored; // legacy plaintext
  const k = key();
  if (!k) throw new Error("Clé de chiffrement absente : impossible de lire ce secret.");
  const [ivB64, tagB64, dataB64] = stored.slice(PREFIX.length).split(":");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Secret chiffré invalide.");
  const decipher = createDecipheriv("aes-256-gcm", k, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
