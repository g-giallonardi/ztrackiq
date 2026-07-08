"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const DEFAULT_POINTS = {
  1: 25,
  2: 18,
  3: 15,
  4: 12,
  5: 10,
  6: 8,
  7: 6,
  8: 4,
  9: 2,
  10: 1,
};

type ChampionshipActionRow = {
  id: number;
  name: string;
  startDate: Date;
  endDate: Date | null;
  scoringMode: string;
  bestRaceCount: number | null;
  pointsByPosition: unknown;
  createdAt: Date;
  updatedAt: Date;
};

function nullableNumber(value: FormDataEntryValue | null) {
  const str = value?.toString().trim();
  if (!str) return null;

  const num = Number(str);
  return Number.isFinite(num) ? num : null;
}

function requiredString(value: FormDataEntryValue | null, field: string) {
  const str = value?.toString().trim();

  if (!str) {
    throw new Error(`${field} est obligatoire`);
  }

  return str;
}

function requiredDate(value: FormDataEntryValue | null, field: string) {
  const str = requiredString(value, field);
  const date = new Date(str);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${field} est invalide`);
  }

  return date;
}

function nullableDate(value: FormDataEntryValue | null) {
  const str = value?.toString().trim();
  if (!str) return null;

  const date = new Date(str);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getPointsByPosition(formData: FormData) {
  const points: Record<number, number> = {};

  for (let position = 1; position <= 10; position += 1) {
    const value = nullableNumber(formData.get(`points_${position}`));

    if (value !== null && value >= 0) {
      points[position] = Math.floor(value);
    }
  }

  return Object.keys(points).length > 0 ? points : DEFAULT_POINTS;
}

function toAuditJson(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function saveChampionship(formData: FormData) {
  const id = nullableNumber(formData.get("id"));
  const startDate = requiredDate(formData.get("startDate"), "La date de début");
  const endDate = nullableDate(formData.get("endDate"));

  if (endDate && endDate < startDate) {
    throw new Error("La date de fin doit être après la date de début");
  }

  const scoringMode =
    formData.get("scoringMode")?.toString() === "BEST" ? "BEST" : "ALL";
  const bestRaceCount =
    scoringMode === "BEST"
      ? Math.max(1, nullableNumber(formData.get("bestRaceCount")) ?? 1)
      : null;
  const pointsJson = JSON.stringify(getPointsByPosition(formData));
  const data = {
    name: requiredString(formData.get("name"), "Le nom"),
    startDate,
    endDate,
    scoringMode,
    bestRaceCount,
  };

  await prisma.$transaction(async (tx) => {
    if (id) {
      const [before] = await tx.$queryRaw<ChampionshipActionRow[]>`
        SELECT
          "id",
          "name",
          "startDate",
          "endDate",
          "scoringMode",
          "bestRaceCount",
          "pointsByPosition",
          "createdAt",
          "updatedAt"
        FROM "Championship"
        WHERE "id" = ${id}
      `;

      if (!before) {
        throw new Error("Championnat introuvable");
      }

      const [championship] = await tx.$queryRaw<ChampionshipActionRow[]>`
        UPDATE "Championship"
        SET
          "name" = ${data.name},
          "startDate" = ${data.startDate},
          "endDate" = ${data.endDate},
          "scoringMode" = ${data.scoringMode},
          "bestRaceCount" = ${data.bestRaceCount},
          "pointsByPosition" = ${pointsJson}::jsonb,
          "updatedAt" = NOW()
        WHERE "id" = ${id}
        RETURNING
          "id",
          "name",
          "startDate",
          "endDate",
          "scoringMode",
          "bestRaceCount",
          "pointsByPosition",
          "createdAt",
          "updatedAt"
      `;

      await tx.auditLog.create({
        data: {
          action: "UPDATE",
          entity: "Championship",
          entityId: id,
          before: toAuditJson(before),
          after: toAuditJson(championship),
        },
      });
    } else {
      const [championship] = await tx.$queryRaw<ChampionshipActionRow[]>`
        INSERT INTO "Championship" (
          "name",
          "startDate",
          "endDate",
          "scoringMode",
          "bestRaceCount",
          "pointsByPosition",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${data.name},
          ${data.startDate},
          ${data.endDate},
          ${data.scoringMode},
          ${data.bestRaceCount},
          ${pointsJson}::jsonb,
          NOW(),
          NOW()
        )
        RETURNING
          "id",
          "name",
          "startDate",
          "endDate",
          "scoringMode",
          "bestRaceCount",
          "pointsByPosition",
          "createdAt",
          "updatedAt"
      `;

      await tx.auditLog.create({
        data: {
          action: "CREATE",
          entity: "Championship",
          entityId: championship.id,
          after: toAuditJson(championship),
        },
      });
    }
  });

  revalidatePath("/championships");
  redirect("/championships");
}

export async function deleteChampionship(formData: FormData) {
  const id = nullableNumber(formData.get("id"));

  if (!id) {
    throw new Error("Identifiant championnat manquant");
  }

  await prisma.$transaction(async (tx) => {
    const [before] = await tx.$queryRaw<ChampionshipActionRow[]>`
      SELECT
        "id",
        "name",
        "startDate",
        "endDate",
        "scoringMode",
        "bestRaceCount",
        "pointsByPosition",
        "createdAt",
        "updatedAt"
      FROM "Championship"
      WHERE "id" = ${id}
    `;

    if (!before) {
      throw new Error("Championnat introuvable");
    }

    await tx.$executeRaw`
      DELETE FROM "Championship"
      WHERE "id" = ${id}
    `;

    await tx.auditLog.create({
      data: {
        action: "DELETE",
        entity: "Championship",
        entityId: id,
        before: toAuditJson(before),
      },
    });
  });

  revalidatePath("/championships");
  redirect("/championships");
}
