"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RaceActionRow = {
  id: number;
  name: string;
  raceDate: Date;
  trackId: number | null;
  championshipId: number | null;
  location: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function nullableString(value: FormDataEntryValue | null) {
  const str = value?.toString().trim();
  return str ? str : null;
}

function nullableNumber(value: FormDataEntryValue | null) {
  const str = value?.toString().trim();
  if (!str) return null;

  const num = Number(str);
  if (Number.isNaN(num)) return null;

  return num;
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

function parseBestLapMs(value: FormDataEntryValue | null) {
  const str = value?.toString().trim().replace(",", ".");
  if (!str) return null;

  const parts = str.split(":");
  const seconds =
    parts.length === 1
      ? Number(parts[0])
      : parts.length === 2
        ? Number(parts[0]) * 60 + Number(parts[1])
        : Number.NaN;

  if (Number.isNaN(seconds) || seconds < 0) return null;

  return Math.round(seconds * 1000);
}

function getRaceResults(formData: FormData) {
  const usedPilotIds = new Set<number>();

  return formData
    .getAll("resultPositions")
    .map((value) => nullableNumber(value))
    .filter((position): position is number => Boolean(position))
    .map((position) => {
      const pilotId = nullableNumber(formData.get(`pilot_${position}`));
      const carId = nullableNumber(formData.get(`car_${position}`));
      const laps = nullableNumber(formData.get(`laps_${position}`));
      const bestLapMs = parseBestLapMs(formData.get(`bestLap_${position}`));

      return { position, pilotId, carId, laps, bestLapMs };
    })
    .filter((result) => {
      if (!result.pilotId || usedPilotIds.has(result.pilotId)) return false;

      usedPilotIds.add(result.pilotId);
      return true;
    })
    .map((result) => ({
      position: result.position,
      pilotId: result.pilotId as number,
      carId: result.carId,
      laps: result.laps,
      bestLapMs: result.bestLapMs,
    }));
}

async function resolveTrackId(tx: Prisma.TransactionClient, trackName: string) {
  const [track] = await tx.$queryRaw<{ id: number }[]>`
    INSERT INTO "Track" ("name", "createdAt", "updatedAt")
    VALUES (${trackName}, NOW(), NOW())
    ON CONFLICT ("name")
    DO UPDATE SET
      "name" = EXCLUDED."name",
      "updatedAt" = "Track"."updatedAt"
    RETURNING "id"
  `;

  return track.id;
}

async function resolveChampionshipId(
  tx: Prisma.TransactionClient,
  championshipId: number | null,
  raceDate: Date,
) {
  if (!championshipId) return null;

  const [championship] = await tx.$queryRaw<{ id: number }[]>`
    SELECT "id"
    FROM "Championship"
    WHERE
      "id" = ${championshipId}
      AND "startDate" <= NOW()
      AND "startDate" <= ${raceDate}
      AND ("endDate" IS NULL OR "endDate" >= ${raceDate})
  `;

  if (!championship) {
    throw new Error("Le championnat sélectionné n'est pas compatible avec cette session");
  }

  return championship.id;
}

async function replaceRaceResults(
  tx: Prisma.TransactionClient,
  raceId: number,
  results: ReturnType<typeof getRaceResults>,
) {
  await tx.$executeRaw`
    DELETE FROM "RaceResult"
    WHERE "raceId" = ${raceId}
  `;

  for (const result of results) {
    await tx.$executeRaw`
      INSERT INTO "RaceResult" (
        "raceId",
        "pilotId",
        "carId",
        "position",
        "laps",
        "bestLapMs",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${raceId},
        ${result.pilotId},
        ${result.carId},
        ${result.position},
        ${result.laps},
        ${result.bestLapMs},
        NOW(),
        NOW()
      )
    `;
  }
}

export async function saveRace(formData: FormData) {
  await requireAdmin();

  const id = nullableNumber(formData.get("id"));
  const data = {
    name: requiredString(formData.get("name"), "Le nom"),
    raceDate: requiredDate(formData.get("raceDate"), "La session"),
    trackName: requiredString(formData.get("trackName"), "Le circuit"),
    championshipId: nullableNumber(formData.get("championshipId")),
    notes: nullableString(formData.get("notes")),
  };
  const results = getRaceResults(formData);

  await prisma.$transaction(async (tx) => {
    const trackId = await resolveTrackId(tx, data.trackName);
    const championshipId = await resolveChampionshipId(
      tx,
      data.championshipId,
      data.raceDate,
    );

    if (id) {
      const [before] = await tx.$queryRaw<RaceActionRow[]>`
        SELECT
          "id",
          "name",
          "raceDate",
          "trackId",
          "championshipId",
          "location",
          "notes",
          "createdAt",
          "updatedAt"
        FROM "Race"
        WHERE "id" = ${id}
      `;

      if (!before) {
        throw new Error("Course introuvable");
      }

      const [race] = await tx.$queryRaw<RaceActionRow[]>`
        UPDATE "Race"
        SET
          "name" = ${data.name},
          "raceDate" = ${data.raceDate},
          "trackId" = ${trackId},
          "championshipId" = ${championshipId},
          "location" = ${data.trackName},
          "notes" = ${data.notes},
          "updatedAt" = NOW()
        WHERE "id" = ${id}
        RETURNING
          "id",
          "name",
          "raceDate",
          "trackId",
          "championshipId",
          "location",
          "notes",
          "createdAt",
          "updatedAt"
      `;

      await replaceRaceResults(tx, id, results);

      await tx.auditLog.create({
        data: {
          action: "UPDATE",
          entity: "Race",
          entityId: id,
          before,
          after: race,
        },
      });
    } else {
      const [race] = await tx.$queryRaw<RaceActionRow[]>`
        INSERT INTO "Race" (
          "name",
          "raceDate",
          "trackId",
          "championshipId",
          "location",
          "notes",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${data.name},
          ${data.raceDate},
          ${trackId},
          ${championshipId},
          ${data.trackName},
          ${data.notes},
          NOW(),
          NOW()
        )
        RETURNING
          "id",
          "name",
          "raceDate",
          "trackId",
          "championshipId",
          "location",
          "notes",
          "createdAt",
          "updatedAt"
      `;

      await replaceRaceResults(tx, race.id, results);

      await tx.auditLog.create({
        data: {
          action: "CREATE",
          entity: "Race",
          entityId: race.id,
          after: race,
        },
      });
    }
  });

  revalidatePath("/races");
  redirect("/races");
}

export async function deleteRace(formData: FormData) {
  await requireAdmin();

  const id = nullableNumber(formData.get("id"));

  if (!id) {
    throw new Error("Identifiant course manquant");
  }

  await prisma.$transaction(async (tx) => {
    const [before] = await tx.$queryRaw<RaceActionRow[]>`
      SELECT
        "id",
        "name",
        "raceDate",
        "trackId",
        "championshipId",
        "location",
        "notes",
        "createdAt",
        "updatedAt"
      FROM "Race"
      WHERE "id" = ${id}
    `;

    if (!before) {
      throw new Error("Course introuvable");
    }

    await tx.$executeRaw`
      DELETE FROM "Race"
      WHERE "id" = ${id}
    `;

    await tx.auditLog.create({
      data: {
        action: "DELETE",
        entity: "Race",
        entityId: id,
        before,
      },
    });
  });

  revalidatePath("/races");
  redirect("/races");
}
