import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

/**
 * AES-256-GCM at-rest encryption for AiProviderSetting.apiKeyCiphertext
 * (M16, Docs/execution_plan.md). `SETTINGS_ENCRYPTION_KEY` can be any
 * string — it's SHA-256-hashed to a stable 32-byte key rather than requiring
 * the admin to generate/paste real key material. Server-only.
 */
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function encryptionKey(): Buffer {
  const secret = process.env.SETTINGS_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error(
      "SETTINGS_ENCRYPTION_KEY is not set — required to store AI provider API keys.",
    );
  }
  return createHash("sha256").update(secret).digest();
}

/** Returns a single base64 string: iv || authTag || ciphertext. */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

export function decryptSecret(encoded: string): string {
  const raw = Buffer.from(encoded, "base64");
  const iv = raw.subarray(0, IV_LENGTH);
  const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}

/** Last 4 chars of the decrypted key, for a UI hint that never ships the full value. */
export function maskedHint(plaintext: string): string {
  const last4 = plaintext.slice(-4);
  return `••••••••${last4}`;
}
