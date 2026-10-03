import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

// scrypt é um algoritmo feito para senhas: lento de propósito, o que dificulta ataques de força bruta.
// Já vem no Node, sem precisar de biblioteca extra.
const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keyLength: number,
) => Promise<Buffer>;

const KEY_LENGTH = 64;

// Salva no formato "salt:hash" (base64). O salt é aleatório para cada usuário,
// então duas pessoas com a mesma senha têm hashes diferentes.
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, KEY_LENGTH);
  return `${salt.toString("base64")}:${hash.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltBase64, hashBase64] = stored.split(":");
  if (!saltBase64 || !hashBase64) return false;

  const expected = Buffer.from(hashBase64, "base64");
  const actual = await scrypt(password, Buffer.from(saltBase64, "base64"), expected.length);

  // Comparação em tempo constante: não revela quantos caracteres "acertaram"
  return timingSafeEqual(actual, expected);
}
