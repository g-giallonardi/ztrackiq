import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  redirect: vi.fn(),
  transaction: vi.fn(),
  pilotFindFirst: vi.fn(),
  pilotFindUnique: vi.fn(),
  pilotCreate: vi.fn(),
  pilotUpdate: vi.fn(),
  pilotDelete: vi.fn(),
  auditCreate: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireAdmin: mocks.requireAdmin,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
  },
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

import { deletePilot, savePilot } from "./actions";

const transactionClient = {
  pilot: {
    findFirst: mocks.pilotFindFirst,
    findUnique: mocks.pilotFindUnique,
    create: mocks.pilotCreate,
    update: mocks.pilotUpdate,
    delete: mocks.pilotDelete,
  },
  auditLog: {
    create: mocks.auditCreate,
  },
};

const pilotSnapshot = {
  id: 7,
  firstname: "Alice",
  lastname: "Martin",
  nickname: "Turbo",
  email: "alice@example.com",
  role: "admin",
  phone: null,
  active: true,
  clubId: 2,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
};

function pilotFormData(
  values: Partial<{
    id: string;
    firstname: string;
    lastname: string;
    nickname: string;
    email: string;
    role: string;
    phone: string;
    clubId: string;
    active: string;
  }> = {},
) {
  const formData = new FormData();
  const defaults = {
    firstname: " Alice ",
    lastname: " Martin ",
    nickname: " Turbo ",
    email: " ALICE@EXAMPLE.COM ",
    role: "admin",
    phone: "",
    clubId: "2",
    active: "on",
    ...values,
  };

  for (const [key, value] of Object.entries(defaults)) {
    formData.set(key, value);
  }

  return formData;
}

describe("pilot server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({ id: 1, role: "admin" });
    mocks.transaction.mockImplementation(
      async (callback: (client: typeof transactionClient) => unknown) =>
        callback(transactionClient),
    );
    mocks.pilotFindFirst.mockResolvedValue(null);
    mocks.auditCreate.mockResolvedValue({ id: 1 });
    mocks.redirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
  });

  it("authorizes, normalizes, creates, audits, and redirects", async () => {
    mocks.pilotCreate.mockResolvedValue(pilotSnapshot);

    await expect(savePilot(pilotFormData())).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.requireAdmin).toHaveBeenCalledOnce();
    expect(mocks.pilotCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          firstname: "Alice",
          lastname: "Martin",
          nickname: "Turbo",
          email: "alice@example.com",
          role: "admin",
          clubId: 2,
          active: true,
          passwordHash: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
        }),
        select: expect.not.objectContaining({ passwordHash: true }),
      }),
    );
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "CREATE",
        entity: "Pilot",
        entityId: 7,
        after: expect.not.objectContaining({ passwordHash: expect.anything() }),
      }),
    });
    expect(mocks.redirect).toHaveBeenCalledWith("/pilots");
  });

  it("preserves the password hash while excluding it from update audits", async () => {
    const passwordHash = `sha256:${"a".repeat(64)}`;
    mocks.pilotFindUnique.mockResolvedValue({
      ...pilotSnapshot,
      passwordHash,
    });
    mocks.pilotUpdate.mockResolvedValue({
      ...pilotSnapshot,
      firstname: "Alicia",
    });

    await expect(
      savePilot(pilotFormData({ id: "7", firstname: " Alicia " })),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.pilotUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 7 },
        data: expect.objectContaining({
          firstname: "Alicia",
          passwordHash,
        }),
        select: expect.not.objectContaining({ passwordHash: true }),
      }),
    );

    const auditData = mocks.auditCreate.mock.calls[0][0].data;
    expect(auditData.before).not.toHaveProperty("passwordHash");
    expect(auditData.after).not.toHaveProperty("passwordHash");
  });

  it("accepts the honorary member role for a pilot account", async () => {
    mocks.pilotCreate.mockResolvedValue({
      ...pilotSnapshot,
      role: "membre_honneur",
    });

    await expect(
      savePilot(pilotFormData({ role: "membre_honneur" })),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.pilotCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: "membre_honneur",
          email: "alice@example.com",
          passwordHash: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
        }),
      }),
    );
  });

  it("updates an existing pilot to honorary member", async () => {
    mocks.pilotFindUnique.mockResolvedValue({
      ...pilotSnapshot,
      role: "adherent",
      passwordHash: null,
    });
    mocks.pilotUpdate.mockResolvedValue({
      ...pilotSnapshot,
      role: "membre_honneur",
    });

    await expect(
      savePilot(pilotFormData({ id: "7", role: "membre_honneur" })),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.pilotUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 7 },
        data: expect.objectContaining({ role: "membre_honneur" }),
      }),
    );
    expect(mocks.auditCreate.mock.calls[0][0].data.after.role).toBe(
      "membre_honneur",
    );
  });

  it("creates a pilot with a role and no email", async () => {
    mocks.pilotCreate.mockResolvedValue({
      ...pilotSnapshot,
      email: null,
    });

    await expect(
      savePilot(pilotFormData({ email: "   ", role: "adherent" })),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.pilotFindFirst).not.toHaveBeenCalled();
    expect(mocks.pilotCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: null,
          role: "adherent",
          passwordHash: null,
        }),
      }),
    );
  });

  it("keeps an optional email for a pilot without a role", async () => {
    mocks.pilotCreate.mockResolvedValue({
      ...pilotSnapshot,
      role: null,
    });

    await expect(
      savePilot(pilotFormData({ role: "" })),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.pilotCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "alice@example.com",
          role: null,
          passwordHash: null,
        }),
      }),
    );
  });

  it("updates a pilot without email without creating login credentials", async () => {
    mocks.pilotFindUnique.mockResolvedValue({
      ...pilotSnapshot,
      email: null,
      passwordHash: null,
    });
    mocks.pilotUpdate.mockResolvedValue({
      ...pilotSnapshot,
      email: null,
    });

    await expect(
      savePilot(pilotFormData({ id: "7", email: "", role: "adherent" })),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.pilotUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: null, passwordHash: null }),
      }),
    );
  });

  it("rejects an email already owned by another pilot", async () => {
    mocks.pilotFindFirst.mockResolvedValue({ id: 99 });

    await expect(savePilot(pilotFormData())).rejects.toThrow(
      "Cette adresse email est déjà utilisée",
    );

    expect(mocks.pilotCreate).not.toHaveBeenCalled();
    expect(mocks.auditCreate).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("rejects invalid roles before opening a transaction", async () => {
    await expect(
      savePilot(pilotFormData({ role: "super-admin" })),
    ).rejects.toThrow("Rôle invalide");

    expect(mocks.requireAdmin).toHaveBeenCalledOnce();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("deletes and audits only non-sensitive pilot fields", async () => {
    mocks.pilotFindUnique.mockResolvedValue(pilotSnapshot);
    mocks.pilotDelete.mockResolvedValue(pilotSnapshot);
    const formData = new FormData();
    formData.set("id", "7");

    await expect(deletePilot(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.pilotDelete).toHaveBeenCalledWith({ where: { id: 7 } });
    expect(mocks.pilotFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 7 },
        select: expect.not.objectContaining({ passwordHash: true }),
      }),
    );
    expect(mocks.auditCreate.mock.calls[0][0].data.before).not.toHaveProperty(
      "passwordHash",
    );
  });

  it("stops before database access when authorization fails", async () => {
    mocks.requireAdmin.mockRejectedValue(new Error("forbidden"));

    await expect(savePilot(pilotFormData())).rejects.toThrow("forbidden");

    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
