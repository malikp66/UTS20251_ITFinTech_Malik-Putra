import crypto from "crypto";

// Catatan: lingkungan deployment proyek sebelumnya menggunakan bcrypt, namun modul
// native tidak tersedia di lingkungan tugas ini. Sebagai solusi, fungsi hashing di bawah
// memanfaatkan algoritme scrypt bawaan Node.js yang memberikan keamanan setara
// untuk menyimpan password dan OTP secara ter-enkripsi.

const SALT_LENGTH = 16;
const KEY_LENGTH = 64;

function generateSalt(): string {
  return crypto.randomBytes(SALT_LENGTH).toString("hex");
}

export async function hashPassword(password: string): Promise<string> {
  const salt = generateSalt();
  const derived = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, KEY_LENGTH, (err, derivedKey) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(derivedKey as Buffer);
    });
  });
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const parts = hash.split("$");
  if (parts.length !== 3) {
    return false;
  }
  const [, salt, stored] = parts;
  const derived = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, KEY_LENGTH, (err, derivedKey) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(derivedKey as Buffer);
    });
  });
  const storedBuffer = Buffer.from(stored, "hex");
  if (storedBuffer.length !== derived.length) {
    return false;
  }
  return crypto.timingSafeEqual(storedBuffer, derived);
}

export async function hashOtp(code: string): Promise<string> {
  return hashPassword(code);
}

export async function verifyOtp(code: string, hash: string): Promise<boolean> {
  return verifyPassword(code, hash);
}
