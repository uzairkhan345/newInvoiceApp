import { afterEach, describe, expect, it, vi } from "vitest";
import {
  decryptSecret,
  encryptSecret,
  maskedHint,
} from "@/lib/crypto/settingsEncryption";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("settingsEncryption", () => {
  it("round-trips a plaintext value through encrypt/decrypt", () => {
    const ciphertext = encryptSecret("sk-super-secret-key-12345");
    expect(ciphertext).not.toContain("sk-super-secret-key-12345");
    expect(decryptSecret(ciphertext)).toBe("sk-super-secret-key-12345");
  });

  it("produces a different ciphertext each time (random IV) for the same plaintext", () => {
    const a = encryptSecret("same-value");
    const b = encryptSecret("same-value");
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe("same-value");
    expect(decryptSecret(b)).toBe("same-value");
  });

  it("throws when SETTINGS_ENCRYPTION_KEY is unset", () => {
    vi.stubEnv("SETTINGS_ENCRYPTION_KEY", "");
    expect(() => encryptSecret("anything")).toThrow(/SETTINGS_ENCRYPTION_KEY/);
  });

  it("fails to decrypt (auth tag mismatch) if the ciphertext is tampered with", () => {
    const ciphertext = encryptSecret("sk-super-secret-key-12345");
    const tampered =
      ciphertext.slice(0, -4) +
      (ciphertext.slice(-4) === "AAAA" ? "BBBB" : "AAAA");
    expect(() => decryptSecret(tampered)).toThrow();
  });
});

describe("maskedHint", () => {
  it("shows only the last 4 characters", () => {
    expect(maskedHint("sk-abcdEFGH1234")).toBe("••••••••1234");
  });
});
