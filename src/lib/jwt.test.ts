import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createJwtToken, verifyJwtToken } from "./jwt";

describe("JWT helpers", () => {
  beforeEach(() => {
    vi.stubEnv("JWT_SECRET", "test-secret-with-enough-entropy");
    vi.stubEnv("AUTH_SECRET", "");
    vi.stubEnv("NODE_ENV", "test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("creates and verifies a token with its user and role", async () => {
    const token = await createJwtToken({ id: 42, role: "admin" });

    await expect(verifyJwtToken(token)).resolves.toEqual({
      userId: 42,
      role: "admin",
    });
  });

  it("rejects a token signed with another secret", async () => {
    const token = await createJwtToken({ id: 42, role: "adherent" });
    vi.stubEnv("JWT_SECRET", "a-different-test-secret");

    await expect(verifyJwtToken(token)).resolves.toBeNull();
  });

  it("rejects malformed tokens", async () => {
    await expect(verifyJwtToken("not-a-jwt")).resolves.toBeNull();
  });

  it("rejects invalid user identifiers", async () => {
    const token = await createJwtToken({ id: 0, role: "admin" });

    await expect(verifyJwtToken(token)).resolves.toBeNull();
  });

  it("requires a secret in production", async () => {
    vi.stubEnv("JWT_SECRET", "");
    vi.stubEnv("AUTH_SECRET", "");
    vi.stubEnv("NODE_ENV", "production");

    await expect(
      createJwtToken({ id: 1, role: "admin" }),
    ).rejects.toThrow("JWT_SECRET manquant");
    await expect(verifyJwtToken("not-a-jwt")).resolves.toBeNull();
  });
});
