import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

// Symmetric encryption for at-rest secrets we have no choice but to store
// ourselves (Garmin's login has no OAuth handshake to hold a token instead
// of a password — see 0019 migration). AES-256-GCM with a random IV per
// value; GARMIN_CREDENTIALS_KEY is a server-only secret, never sent to the
// browser, derived into a 32-byte key via scrypt so any passphrase length
// works.
const ALGORITHM = "aes-256-gcm";

function deriveKey(): Buffer {
  const secret = process.env.GARMIN_CREDENTIALS_KEY;
  if (!secret) throw new Error("GARMIN_CREDENTIALS_KEY is not set");
  return scryptSync(secret, "garmin-connect-salt", 32);
}

// Output format: base64(iv) . base64(authTag) . base64(ciphertext)
export function encryptSecret(plaintext: string): string {
  const key = deriveKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, ciphertext].map((b) => b.toString("base64")).join(".");
}

export function decryptSecret(encoded: string): string {
  const [ivB64, authTagB64, ciphertextB64] = encoded.split(".");
  if (!ivB64 || !authTagB64 || !ciphertextB64) throw new Error("Malformed encrypted value");
  const key = deriveKey();
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextB64, "base64")), decipher.final()]);
  return plaintext.toString("utf8");
}
