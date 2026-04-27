import crypto from "node:crypto";

/**
 * Cifrado simétrico AES-256-GCM para API keys en reposo.
 *
 * La clave de cifrado se deriva de AUTH_SECRET via SHA-256, así que:
 *  - No requiere variable nueva
 *  - Cambiar AUTH_SECRET en producción rota TODAS las keys cifradas
 *    (los usuarios tendrían que volver a pegarlas) — comportamiento aceptable
 *
 * Formato de salida: "<iv_hex>:<auth_tag_hex>:<ciphertext_hex>"
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // recomendado para GCM

function getKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "AUTH_SECRET no configurada. No se puede cifrar/descifrar secrets sin ella."
    );
  }
  return crypto.createHash("sha256").update(secret, "utf8").digest();
}

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(blob: string): string {
  const parts = blob.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted blob format");
  const [ivHex, tagHex, ctHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const ct = Buffer.from(ctHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(ct), decipher.final()]);
  return decrypted.toString("utf8");
}

/** Últimos 4 chars de la key, para hint en UI ("•••• abc1") */
export function hintFor(value: string): string {
  if (value.length <= 4) return "•".repeat(value.length);
  return value.slice(-4);
}
