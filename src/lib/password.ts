import { createHash } from "node:crypto";

export function hashPassword(password: string) {
  return `sha256:${createHash("sha256").update(password).digest("hex")}`;
}

export function verifyPassword(password: string, passwordHash: string) {
  if (passwordHash.startsWith("sha256:")) {
    return hashPassword(password) === passwordHash;
  }

  return false;
}
