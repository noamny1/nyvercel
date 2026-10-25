import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function key() {
  return createHash("sha256").update(process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "nymedia-totp").digest();
}

export function seal(text: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), enc]).toString("base64");
}

export function open(payload: string) {
  try {
    const raw = Buffer.from(payload, "base64");
    const decipher = createDecipheriv("aes-256-gcm", key(), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
  } catch {
    return "";
  }
}

export function randomSecret() {
  const bytes = randomBytes(20);
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

function decodeBase32(input: string) {
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const char of input.toUpperCase()) {
    const idx = ALPHABET.indexOf(char);
    if (idx < 0) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

function hotp(secret: Buffer, counter: number) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", secret).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 15;
  const bin = ((hmac[offset] & 127) << 24) | (hmac[offset + 1] << 16) | (hmac[offset + 2] << 8) | hmac[offset + 3];
  return String(bin % 1000000).padStart(6, "0");
}

export function verifyTotp(secret: string, code: string, now = Date.now()) {
  const token = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(token)) return false;
  const keyBytes = decodeBase32(secret);
  const counter = Math.floor(now / 1000 / 30);
  for (let drift = -1; drift <= 1; drift += 1) {
    if (hotp(keyBytes, counter + drift) === token) return true;
  }
  return false;
}

export function otpauth(email: string, secret: string) {
  return `otpauth://totp/NYmedia:${encodeURIComponent(email)}?secret=${secret}&issuer=NYmedia&digits=6&period=30`;
}
