import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const KEY_LENGTH = 64;

export default {
  async hash(value: string, saltRounds: number) {
    const salt = randomBytes(16).toString("hex");
    const derivedKey = scryptSync(value, salt, KEY_LENGTH).toString("hex");
    return `${salt}:${derivedKey}`;
  },
  async compare(value: string, hashed: string) {
    const [salt, key] = hashed.split(":");
    if (!salt || !key) return false;
    const derived = scryptSync(value, salt, KEY_LENGTH).toString("hex");
    try {
      return timingSafeEqual(Buffer.from(key, "hex"), Buffer.from(derived, "hex"));
    } catch {
      return false;
    }
  }
};
