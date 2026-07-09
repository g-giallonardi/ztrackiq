// src/app/pilots/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";

type PilotActionRow = {
  id: number;
  firstname: string;
  lastname: string | null;
  nickname: string | null;
  email: string | null;
  passwordHash: string | null;
  role: string | null;
  phone: string | null;
  active: boolean;
  clubId: number | null;
  createdAt: Date;
  updatedAt: Date;
};

const DEFAULT_PASSWORD_HASH =
  "sha256:e7cd9662965741e20f58915fb0eb0f52696c786c0529d02c316db538bd6ead99";

export async function savePilot(formData: FormData) {
  await requireAdmin();

  const id = emptyToNull(formData.get("id"));
  const firstname = requiredString(formData.get("firstname"));
  const lastname = optionalString(formData.get("lastname"));
  const nickname = emptyToNull(formData.get("nickname"));
  const role = optionalRole(formData.get("role"));
  const email = role ? requiredString(formData.get("email")).toLowerCase() : null;
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
    const pilotId = id ? Number(id) : null;
    const [existingEmailOwner] = data.email
      ? pilotId
        ? await tx.$queryRaw<{ id: number }[]>`
          SELECT "id"
          FROM "Pilot"
          WHERE lower("email") = lower(${data.email})
            AND "id" <> ${pilotId}
          LIMIT 1
        `
        : await tx.$queryRaw<{ id: number }[]>`
          SELECT "id"
          FROM "Pilot"
          WHERE lower("email") = lower(${data.email})
          LIMIT 1
        `
      : [];

    if (existingEmailOwner) {
      throw new Error("Cette adresse email est déjà utilisée");
    }

    if (pilotId) {
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
          "passwordHash" = CASE
            WHEN ${data.role}::text IS NULL THEN NULL
            ELSE COALESCE("passwordHash", ${DEFAULT_PASSWORD_HASH})
          END,
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
          "passwordHash",
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
          ${data.role ? DEFAULT_PASSWORD_HASH : null},
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
  await requireAdmin();

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

function optionalRole(value: FormDataEntryValue | null) {
  const role = emptyToNull(value);

  if (!role) {
    return null;
  }

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
