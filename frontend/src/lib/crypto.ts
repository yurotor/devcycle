import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
} from "crypto";

const ALGORITHM = "aes-256-gcm";

// Key must be 32 bytes. Derive from env var, fallback for dev only.
function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (raw) {
    // Accept a 64-char hex string (32 bytes) or any string we'll hash to 32 bytes
    if (/^[0-9a-fA-F]{64}$/.test(raw)) {
      return Buffer.from(raw, "hex");
    }
    // Derive 32-byte key from arbitrary string
    return createHash("sha256").update(raw).digest();
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("ENCRYPTION_KEY env var must be set in production");
  }
  // Dev fallback — not secure, but lets the app run without config
  return createHash("sha256").update("devcycle-dev-key").digest();
}

/**
 * Encrypts a plaintext string.
 * Returns `ciphertext_hex:authtag_hex` and the `iv_hex` separately.
 */
export function encryptPat(plaintext: string): {
  encryptedPat: string;
  iv: string;
} {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return {
    encryptedPat: `${ciphertext.toString("hex")}:${tag.toString("hex")}`,
    iv: iv.toString("hex"),
  };
}

/**
 * Decrypts a PAT previously encrypted with encryptPat.
 */
export function decryptPat(encryptedPat: string, iv: string): string {
  const key = getKey();
  const [ciphertextHex, tagHex] = encryptedPat.split(":");
  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(iv, "hex")
  );
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertextHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
