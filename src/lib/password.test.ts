import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password helpers", () => {
  it("hashes passwords with the sha256 prefix", () => {
    expect(hashPassword("miniz")).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it("verifies matching passwords", () => {
    const passwordHash = hashPassword("dump-valve-13");

    expect(verifyPassword("dump-valve-13", passwordHash)).toBe(true);
    expect(verifyPassword("wrong-password", passwordHash)).toBe(false);
  });

  it("rejects unsupported hash formats", () => {
    expect(verifyPassword("miniz", "bcrypt:anything")).toBe(false);
    expect(verifyPassword("miniz", "")).toBe(false);
  });
});
