import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  redirect: vi.fn(),
  verifyJwtToken: vi.fn(),
  createJwtToken: vi.fn(),
  pilotFindUnique: vi.fn(),
}));

vi.mock("react", () => ({
  cache: <T extends (...args: never[]) => unknown>(callback: T) => callback,
}));

vi.mock("next/headers", () => ({
  cookies: mocks.cookies,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/lib/jwt", () => ({
  verifyJwtToken: mocks.verifyJwtToken,
  createJwtToken: mocks.createJwtToken,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    pilot: {
      findUnique: mocks.pilotFindUnique,
    },
  },
}));

vi.mock("@/lib/authConstants", () => ({
  AUTH_COOKIE_NAME: "ztrackiq_auth",
}));

import { getCurrentUser, requireAdmin, requireCurrentUser } from "./auth";

const activePilot = {
  id: 7,
  firstname: "Alice",
  lastname: "Martin",
  nickname: "Turbo",
  email: "alice@example.com",
  role: "adherent",
  active: true,
};

describe("authentication data access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cookies.mockResolvedValue({
      get: vi.fn(() => ({ value: "valid-token" })),
    });
    mocks.verifyJwtToken.mockResolvedValue({ userId: 7, role: "adherent" });
    mocks.pilotFindUnique.mockResolvedValue(activePilot);
    mocks.redirect.mockImplementation((path: string) => {
      throw new Error(`REDIRECT:${path}`);
    });
  });

  it("returns null without a session cookie", async () => {
    mocks.cookies.mockResolvedValue({ get: vi.fn(() => undefined) });

    await expect(getCurrentUser()).resolves.toBeNull();
    expect(mocks.verifyJwtToken).not.toHaveBeenCalled();
    expect(mocks.pilotFindUnique).not.toHaveBeenCalled();
  });

  it("returns null for an invalid token", async () => {
    mocks.verifyJwtToken.mockResolvedValue(null);

    await expect(getCurrentUser()).resolves.toBeNull();
    expect(mocks.pilotFindUnique).not.toHaveBeenCalled();
  });

  it("loads only the safe authenticated-user fields", async () => {
    await expect(getCurrentUser()).resolves.toEqual({
      id: 7,
      firstname: "Alice",
      lastname: "Martin",
      nickname: "Turbo",
      email: "alice@example.com",
      role: "adherent",
    });
    expect(mocks.pilotFindUnique).toHaveBeenCalledWith({
      where: { id: 7 },
      select: {
        id: true,
        firstname: true,
        lastname: true,
        nickname: true,
        email: true,
        role: true,
        active: true,
      },
    });
  });

  it("rejects inactive or incomplete pilot accounts", async () => {
    mocks.pilotFindUnique.mockResolvedValueOnce({
      ...activePilot,
      active: false,
    });
    await expect(getCurrentUser()).resolves.toBeNull();

    mocks.pilotFindUnique.mockResolvedValueOnce({
      ...activePilot,
      email: null,
    });
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("redirects anonymous users to login", async () => {
    mocks.cookies.mockResolvedValue({ get: vi.fn(() => undefined) });

    await expect(requireCurrentUser()).rejects.toThrow("REDIRECT:/login");
  });

  it("allows admins and redirects other roles", async () => {
    mocks.pilotFindUnique.mockResolvedValueOnce({
      ...activePilot,
      role: "admin",
    });
    await expect(requireAdmin()).resolves.toEqual(
      expect.objectContaining({ id: 7, role: "admin" }),
    );

    mocks.pilotFindUnique.mockResolvedValueOnce(activePilot);
    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/");
  });
});
