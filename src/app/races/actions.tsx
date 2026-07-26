"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseBestLapMs } from "@/lib/racing";

type RaceMode = "solo" | "team";

function toAuditJson(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

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

function nullablePositiveInteger(value: FormDataEntryValue | null) {
  const num = nullableNumber(value);

  return num !== null && Number.isInteger(num) && num > 0 ? num : null;
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

function getRaceResults(formData: FormData) {
  const usedPilotIds = new Set<number>();

  return formData
    .getAll("resultPositions")
    .map((value) => nullableNumber(value))
    .filter((position): position is number => Boolean(position))
    .map((position) => {
      const pilotId = nullableNumber(formData.get(`pilot_${position}`));
      const carId = nullableNumber(formData.get(`car_${position}`));
      const laps = nullablePositiveInteger(formData.get(`laps_${position}`));
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

function getRaceMode(formData: FormData): RaceMode {
  return formData.get("raceMode")?.toString() === "team" ? "team" : "solo";
}

function getTeamRaceResults(formData: FormData) {
  const usedTeamNames = new Set<string>();

  return formData
    .getAll("teamResultPositions")
    .map((value) => nullableNumber(value))
    .filter((position): position is number => Boolean(position))
    .map((position) => {
      const rawTeamName = nullableString(formData.get(`teamName_${position}`));
      const teamName = rawTeamName ?? `Équipe ${position}`;
      const memberIds = formData
        .getAll(`teamMembers_${position}`)
        .map((value) => nullableNumber(value))
        .filter((pilotId): pilotId is number => pilotId !== null);
      const laps = nullablePositiveInteger(formData.get(`teamLaps_${position}`));
      const bestLapMs = parseBestLapMs(formData.get(`teamBestLap_${position}`));

      return { position, teamName, memberIds, laps, bestLapMs };
    })
    .filter((result) => {
      const normalizedName = result.teamName.trim().toLowerCase();
      if (result.memberIds.length === 0 || usedTeamNames.has(normalizedName)) {
        return false;
      }

      usedTeamNames.add(normalizedName);
      return true;
    });
}

async function resolveTrackId(tx: Prisma.TransactionClient, trackName: string) {
  const existingTrack = await tx.track.findUnique({
    where: { name: trackName },
    select: { id: true },
  });

  if (existingTrack) {
    return existingTrack.id;
  }

  const track = await tx.track.create({
    data: { name: trackName },
    select: { id: true },
  });

  return track.id;
}

async function resolveChampionshipId(
  tx: Prisma.TransactionClient,
  championshipId: number | null,
  raceDate: Date,
  raceMode: RaceMode,
) {
  if (!championshipId) return null;

  const championship = await tx.championship.findFirst({
    where: {
      id: championshipId,
      mode: raceMode,
      startDate: { lte: new Date() },
      AND: [
        { startDate: { lte: raceDate } },
        {
          OR: [{ endDate: null }, { endDate: { gte: raceDate } }],
        },
      ],
    },
    select: { id: true },
  });

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
  await tx.raceResult.deleteMany({ where: { raceId } });
  await tx.raceTeam.deleteMany({ where: { raceId } });

  if (results.length > 0) {
    await tx.raceResult.createMany({
      data: results.map((result) => ({
        raceId,
        pilotId: result.pilotId,
        carId: result.carId,
        position: result.position,
        laps: result.laps,
        bestLapMs: result.bestLapMs,
      })),
    });
  }
}

async function replaceTeamRaceResults(
  tx: Prisma.TransactionClient,
  raceId: number,
  results: ReturnType<typeof getTeamRaceResults>,
) {
  await tx.raceResult.deleteMany({ where: { raceId } });
  await tx.raceTeam.deleteMany({ where: { raceId } });

  for (const result of results) {
    const team = await tx.raceTeam.create({
      data: {
        raceId,
        name: result.teamName,
        members: {
          createMany: {
            data: result.memberIds.map((pilotId) => ({ pilotId })),
            skipDuplicates: true,
          },
        },
      },
      select: { id: true },
    });

    await tx.raceResult.create({
      data: {
        raceId,
        teamId: team.id,
        position: result.position,
        laps: result.laps,
        bestLapMs: result.bestLapMs,
      },
    });
  }
}

export async function saveRace(formData: FormData) {
  await requireAdmin();

  const id = nullableNumber(formData.get("id"));
  const raceMode = getRaceMode(formData);
  const data = {
    name: requiredString(formData.get("name"), "Le nom"),
    mode: raceMode,
    raceDate: requiredDate(formData.get("raceDate"), "La session"),
    trackName: requiredString(formData.get("trackName"), "Le circuit"),
    championshipId: nullableNumber(formData.get("championshipId")),
    notes: nullableString(formData.get("notes")),
  };
  const results =
    raceMode === "team" ? getTeamRaceResults(formData) : getRaceResults(formData);

  await prisma.$transaction(async (tx) => {
    const trackId = await resolveTrackId(tx, data.trackName);
    const championshipId = await resolveChampionshipId(
      tx,
      data.championshipId,
      data.raceDate,
      data.mode,
    );

    if (id) {
      const before = await tx.race.findUnique({
        where: { id },
      });

      if (!before) {
        throw new Error("Course introuvable");
      }

      const race = await tx.race.update({
        where: { id },
        data: {
          name: data.name,
          mode: data.mode,
          raceDate: data.raceDate,
          trackId,
          championshipId,
          location: data.trackName,
          notes: data.notes,
        },
      });

      if (data.mode === "team") {
        await replaceTeamRaceResults(
          tx,
          id,
          results as ReturnType<typeof getTeamRaceResults>,
        );
      } else {
        await replaceRaceResults(
          tx,
          id,
          results as ReturnType<typeof getRaceResults>,
        );
      }

      await tx.auditLog.create({
        data: {
          action: "UPDATE",
          entity: "Race",
          entityId: id,
          before: toAuditJson(before),
          after: toAuditJson(race),
        },
      });
    } else {
      const race = await tx.race.create({
        data: {
          name: data.name,
          mode: data.mode,
          raceDate: data.raceDate,
          trackId,
          championshipId,
          location: data.trackName,
          notes: data.notes,
        },
      });

      if (data.mode === "team") {
        await replaceTeamRaceResults(
          tx,
          race.id,
          results as ReturnType<typeof getTeamRaceResults>,
        );
      } else {
        await replaceRaceResults(
          tx,
          race.id,
          results as ReturnType<typeof getRaceResults>,
        );
      }

      await tx.auditLog.create({
        data: {
          action: "CREATE",
          entity: "Race",
          entityId: race.id,
          after: toAuditJson(race),
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
    const before = await tx.race.findUnique({
      where: { id },
    });

    if (!before) {
      throw new Error("Course introuvable");
    }

    await tx.race.delete({
      where: { id },
    });

    await tx.auditLog.create({
      data: {
        action: "DELETE",
        entity: "Race",
        entityId: id,
        before: toAuditJson(before),
      },
    });
  });

  revalidatePath("/races");
  redirect("/races");
}
