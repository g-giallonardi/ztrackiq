// src/app/pilots/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";

type PilotActionRow = {
  id: number;
  firstname: string;
  lastname: string | null;
  nickname: string | null;
  email: string;
  passwordHash: string;
  role: string;
  phone: string | null;
  active: boolean;
  clubId: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function savePilot(formData: FormData) {
  const id = emptyToNull(formData.get("id"));
  const firstname = requiredString(formData.get("firstname"));
  const lastname = optionalString(formData.get("lastname"));
  const nickname = emptyToNull(formData.get("nickname"));
  const email = requiredString(formData.get("email"));
  const role = requiredRole(formData.get("role"));
  const phone = emptyToNull(formData.get("phone"));
  const clubId = toNullableNumber(formData.get("clubId"));
  const active = formData.get("active") === "on";

  const data = {
    firstname,
    lastname,
    nickname,
    email,
    role,
    phone,
    clubId,
    active,
  };

  await prisma.$transaction(async (tx) => {
    if (id) {
      const pilotId = Number(id);

      const [before] = await tx.$queryRaw<PilotActionRow[]>`
        SELECT
          "id",
          "firstname",
          "lastname",
          "nickname",
          "email",
          "passwordHash",
          "role"::text AS "role",
          "phone",
          "active",
          "clubId",
          "createdAt",
          "updatedAt"
        FROM "Pilot"
        WHERE "id" = ${pilotId}
      `;

      const [updated] = await tx.$queryRaw<PilotActionRow[]>`
        UPDATE "Pilot"
        SET
          "firstname" = ${data.firstname},
          "lastname" = ${data.lastname},
          "nickname" = ${data.nickname},
          "email" = ${data.email},
          "role" = ${data.role}::"PilotRole",
          "phone" = ${data.phone},
          "clubId" = ${data.clubId},
          "active" = ${data.active},
          "updatedAt" = NOW()
        WHERE "id" = ${pilotId}
        RETURNING
          "id",
          "firstname",
          "lastname",
          "nickname",
          "email",
          "passwordHash",
          "role"::text AS "role",
          "phone",
          "active",
          "clubId",
          "createdAt",
          "updatedAt"
      `;

      await tx.auditLog.create({
        data: {
          action: "UPDATE",
          entity: "Pilot",
          entityId: updated.id,
          before: toAuditJson(before),
          after: toAuditJson(updated),
        },
      });
    } else {
      const [created] = await tx.$queryRaw<PilotActionRow[]>`
        INSERT INTO "Pilot" (
          "firstname",
          "lastname",
          "nickname",
          "email",
          "role",
          "phone",
          "clubId",
          "active",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${data.firstname},
          ${data.lastname},
          ${data.nickname},
          ${data.email},
          ${data.role}::"PilotRole",
          ${data.phone},
          ${data.clubId},
          ${data.active},
          NOW(),
          NOW()
        )
        RETURNING
          "id",
          "firstname",
          "lastname",
          "nickname",
          "email",
          "passwordHash",
          "role"::text AS "role",
          "phone",
          "active",
          "clubId",
          "createdAt",
          "updatedAt"
      `;

      await tx.auditLog.create({
        data: {
          action: "CREATE",
          entity: "Pilot",
          entityId: created.id,
          after: toAuditJson(created),
        },
      });
    }
  });

  redirect("/pilots");
}

export async function deletePilot(formData: FormData) {
  const id = toNullableNumber(formData.get("id"));

  if (!id) {
    throw new Error("Identifiant pilote invalide");
  }

  await prisma.$transaction(async (tx) => {
    const before = await tx.pilot.findUnique({
      where: { id },
    });

    await tx.pilot.delete({
      where: { id },
    });

    await tx.auditLog.create({
      data: {
        action: "DELETE",
        entity: "Pilot",
        entityId: id,
        before: toAuditJson(before),
      },
    });
  });

  redirect("/pilots");
}

function emptyToNull(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function optionalString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function requiredString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    throw new Error("Champ obligatoire manquant");
  }

  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error("Champ obligatoire vide");
  }

  return trimmed;
}

function requiredRole(value: FormDataEntryValue | null) {
  const role = requiredString(value);
  if (role !== "admin" && role !== "adherent" && role !== "visiteur") {
    throw new Error("Rôle invalide");
  }

  return role;
}

function toAuditJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === null || value === undefined) return undefined;

  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function toNullableNumber(value: FormDataEntryValue | null) {
  const normalized = emptyToNull(value);
  return normalized ? Number(normalized) : null;
}
