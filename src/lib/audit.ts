import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type AuditClient = Pick<Prisma.TransactionClient, "auditLog">;

export async function auditLog({
  actorId,
  actorName,
  action,
  entity,
  entityId,
  before,
  after,
}: {
  actorId?: number;
  actorName?: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "DISABLE";
  entity: string;
  entityId?: number;
  before?: unknown;
  after?: unknown;
}, client: AuditClient = prisma) {
  await client.auditLog.create({
    data: {
      actorId,
      actorName,
      action,
      entity,
      entityId,
      before: before ?? undefined,
      after: after ?? undefined,
    },
  });
}
