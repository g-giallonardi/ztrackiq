import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const cachedPrisma = globalForPrisma.prisma as
  | (PrismaClient & { race?: unknown; raceResult?: unknown })
  | undefined;

export const prisma =
  cachedPrisma && "race" in cachedPrisma && "raceResult" in cachedPrisma
    ? cachedPrisma
    : new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
