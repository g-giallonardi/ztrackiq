import Link from "next/link";
import type { ReactNode } from "react";
import {
  DismissibleDrawer,
  DrawerCloseButton,
} from "@/components/DismissibleDrawer";
import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  CalendarDays,
  Clock,
  MapPin,
  Plus,
  Trophy,
} from "lucide-react";
import { deleteRace, saveRace } from "./actions";
import { RaceChampionshipFields } from "./RaceChampionshipFields";
import { RaceResultsFields } from "./RaceResultsFields";
import { RacesTable, type RaceTableRow } from "./RacesTable";

type RaceRow = {
  id: number;
  name: string;
  raceDate: Date;
  trackId: number | null;
  championshipId: number | null;
  championshipName: string | null;
  trackName: string | null;
  location: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type TrackRow = {
  id: number;
  name: string;
};

type ChampionshipRow = {
  id: number;
  name: string;
  startDate: Date;
  endDate: Date | null;
};

type RaceResultRow = {
  id: number;
  raceId: number;
  pilotId: number;
  carId: number | null;
  position: number;
  laps: number | null;
  bestLapMs: number | null;
  createdAt: Date;
  updatedAt: Date;
};

type CarWithPiSpecs = {
  id: number;
  name: string;
  pilotId: number;
  specs: { spec: { piValue: number } }[];
};

function formatPiClass(value: number) {
  const pi = Math.min(999, Math.round(value));

  const rank =
    pi > 500 ? "X" :
    pi > 400 ? "S" :
    pi > 300 ? "A" :
    pi > 200 ? "B" :
    "C";

  return rank;
}

function getCarTotalPi(car: { specs: { spec: { piValue: number } }[] }) {
  return car.specs.reduce((sum, carSpec) => sum + carSpec.spec.piValue, 0);
}

function formatRaceDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatRaceDateForInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatSessionDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return formatRaceDate(new Date(year, month - 1, day));
}

function formatBestLap(bestLapMs: number | null | undefined) {
  if (!bestLapMs) return "—";

  const totalSeconds = bestLapMs / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds - minutes * 60;

  return minutes > 0
    ? `${minutes}:${seconds.toFixed(3).padStart(6, "0")}`
    : seconds.toFixed(3);
}

function getRaceBestLap(results: { bestLapMs: number | null }[]) {
  const bestLaps = results
    .map((result) => result.bestLapMs)
    .filter((bestLapMs): bestLapMs is number => bestLapMs !== null);

  return bestLaps.length > 0 ? Math.min(...bestLaps) : null;
}

function getAverage(values: number[]) {
  if (values.length === 0) return null;

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatBestLapDiff(
  bestLapMs: number | null | undefined,
  referenceBestLapMs: number | null,
) {
  if (!bestLapMs || !referenceBestLapMs) return "";

  const diffSeconds = (bestLapMs - referenceBestLapMs) / 1000;
  return `+${diffSeconds.toFixed(3)}`;
}

function getPilotFullName(pilot: { firstname: string; lastname: string | null }) {
  return [pilot.firstname, pilot.lastname].filter(Boolean).join(" ");
}

function getPilotDisplayName(pilot: {
  firstname: string;
  lastname: string | null;
  nickname: string | null;
}) {
  return pilot.nickname || getPilotFullName(pilot);
}

function getResultCar(
  result: { carId: number | null; pilotId: number },
  carById: Map<number, CarWithPiSpecs>,
  carByPilotId: Map<number, CarWithPiSpecs>,
) {
  return result.carId
    ? carById.get(result.carId) ?? carByPilotId.get(result.pilotId)
    : carByPilotId.get(result.pilotId);
}

export default async function RacesPage({
  searchParams,
}: {
  searchParams?: Promise<{
    drawer?: string;
    raceId?: string;
    detailsRaceId?: string;
    sessionDate?: string;
    date?: string;
    trackId?: string;
    confirmDelete?: string;
  }>;
}) {
  const currentUser = await requireCurrentUser();
  const canManage = currentUser.role === "admin";

  const params = await searchParams;

  const [baseRaces, pilots, tracks, championships, cars, raceResults] = await Promise.all([
    prisma.$queryRaw<RaceRow[]>`
      SELECT
        "Race"."id",
        "Race"."name",
        "Race"."raceDate",
        "Race"."trackId",
        "Race"."championshipId",
        "Championship"."name" AS "championshipName",
        "Track"."name" AS "trackName",
        "Race"."location",
        "Race"."notes",
        "Race"."createdAt",
        "Race"."updatedAt"
      FROM "Race"
      LEFT JOIN "Track" ON "Track"."id" = "Race"."trackId"
      LEFT JOIN "Championship" ON "Championship"."id" = "Race"."championshipId"
      ORDER BY "Race"."raceDate" DESC, "Race"."id" ASC
    `,
    prisma.pilot.findMany({
      where: { active: true },
      orderBy: [{ lastname: "asc" }, { firstname: "asc" }],
    }),
    prisma.$queryRaw<TrackRow[]>`
      SELECT "id", "name"
      FROM "Track"
      ORDER BY "name" ASC
    `,
    prisma.$queryRaw<ChampionshipRow[]>`
      SELECT "id", "name", "startDate", "endDate"
      FROM "Championship"
      ORDER BY "startDate" DESC, "createdAt" ASC
    `,
    prisma.car.findMany({
      include: {
        pilot: true,
        specs: {
          include: {
            spec: true,
          },
        },
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }),
    prisma.$queryRaw<RaceResultRow[]>`
      SELECT
        "id",
        "raceId",
        "pilotId",
        "carId",
        "position",
        "laps",
        "bestLapMs",
        "createdAt",
        "updatedAt"
      FROM "RaceResult"
      ORDER BY "position" ASC
    `,
  ]);
  const resultsByRace = new Map<number, typeof raceResults>();

  for (const result of raceResults) {
    const results = resultsByRace.get(result.raceId) ?? [];
    results.push(result);
    resultsByRace.set(result.raceId, results);
  }

  const races = baseRaces.map((race) => ({
    ...race,
    results: resultsByRace.get(race.id) ?? [],
  }));
  const pilotsById = new Map(pilots.map((pilot) => [pilot.id, pilot]));
  const carById = new Map<number, CarWithPiSpecs>(
    cars.map((car) => [car.id, car]),
  );
  const carByPilotId = new Map<number, CarWithPiSpecs>();

  for (const car of cars) {
    if (!carByPilotId.has(car.pilotId)) {
      carByPilotId.set(car.pilotId, car);
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const raceTableRows: RaceTableRow[] = races.map((race) => ({
    id: race.id,
    name: race.name,
    notes: race.notes,
    raceDate: formatRaceDateForInput(race.raceDate),
    raceDateLabel: formatRaceDate(race.raceDate),
    trackId: race.trackId,
    trackName: race.trackName,
    championshipName: race.championshipName,
    pilotCount: race.results.length,
    bestLap: formatBestLap(getRaceBestLap(race.results)),
  }));
  const upcomingCount = races.filter(
    (race) => race.raceDate >= today,
  ).length;

  const drawerMode = params?.drawer;
  const selectedRaceId = params?.raceId ? Number(params.raceId) : null;
  const detailsRaceId = params?.detailsRaceId
    ? Number(params.detailsRaceId)
    : null;
  const sessionDate = params?.sessionDate?.trim() ?? "";
  const selectedRace = selectedRaceId
    ? races.find((race) => race.id === selectedRaceId)
    : null;
  const detailsRace = detailsRaceId
    ? races.find((race) => race.id === detailsRaceId)
    : null;
  const sessionRaces = sessionDate
    ? races
        .filter((race) => formatRaceDateForInput(race.raceDate) === sessionDate)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    : [];

  const isDrawerOpen = drawerMode === "add" || drawerMode === "edit";
  const isDeleteModalOpen =
    drawerMode === "edit" && params?.confirmDelete === "1";

  return (
    <div className="m-2 rounded bg-white p-2 text-gray-900">
      <div className="flex flex-row items-start justify-between gap-4">
        <div>
          <div className="my-2 flex flex-row gap-2 text-5xl">
            <p className="rounded bg-pink-200 p-2 text-pink-500">
              <Trophy size="30" />
            </p>
            <p className="self-end">Courses</p>
          </div>
          <p>Planifier et suivre les courses Mini-Z</p>
        </div>

        {canManage && (
          <Link
            href="/races?drawer=add"
            className="inline-flex h-fit shrink-0 items-center gap-2 rounded-md bg-gradient-to-r from-pink-500 to-yellow-400 px-5 py-3 font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
          >
            <Plus />
            Ajouter une course
          </Link>
        )}
      </div>

      <div className="mb-6 flex flex-row flex-wrap gap-3">
        <QuickViewCard
          icon={<CalendarDays />}
          color="text-pink-500"
          bgColor="bg-pink-100"
          value={races.length.toString()}
          label="Courses"
        />
        <QuickViewCard
          icon={<Clock />}
          color="text-blue-500"
          bgColor="bg-blue-100"
          value={upcomingCount.toString()}
          label="À venir"
        />
        <QuickViewCard
          icon={<MapPin />}
          color="text-cyan-500"
          bgColor="bg-cyan-100"
          value={tracks.length.toString()}
          label="Circuits"
        />
      </div>

      <RacesTable races={raceTableRows} tracks={tracks} canManage={canManage} />

      {canManage && isDrawerOpen && (
        <RaceDrawer
          key={`${drawerMode}-${selectedRaceId ?? "new"}`}
          mode={drawerMode}
          race={selectedRace}
          pilots={pilots}
          cars={cars}
          tracks={tracks}
          championships={championships}
          showDeleteModal={isDeleteModalOpen}
        />
      )}

      {detailsRace && (
        <RaceResultsModal
          race={detailsRace}
          pilotsById={pilotsById}
          carById={carById}
          carByPilotId={carByPilotId}
        />
      )}

      {sessionRaces.length > 0 && (
        <RaceSessionModal
          date={sessionDate}
          races={sessionRaces}
          pilotsById={pilotsById}
          carById={carById}
          carByPilotId={carByPilotId}
        />
      )}
    </div>
  );
}

function QuickViewCard({
  icon,
  color,
  bgColor,
  value,
  label,
}: {
  icon: ReactNode;
  color: string;
  bgColor: string;
  value: string;
  label: string;
}) {
  return (
    <div className="group flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-pink-500 hover:shadow-lg">
      <div
        className={`${color} ${bgColor} flex h-14 w-14 items-center justify-center rounded-md`}
      >
        {icon}
      </div>
      <div>
        <p className="text-3xl font-bold leading-none text-zinc-900">{value}</p>
        <p className="mt-1 text-sm text-zinc-500">{label}</p>
      </div>
    </div>
  );
}

function RaceDrawer({
  mode,
  race,
  pilots,
  cars,
  tracks,
  championships,
  showDeleteModal,
}: {
  mode: string | undefined;
  race?: {
    id: number;
    name: string;
    raceDate: Date;
    trackId: number | null;
    championshipId: number | null;
    trackName: string | null;
    location: string | null;
    notes: string | null;
    results: {
      pilotId: number;
      position: number;
      laps: number | null;
      bestLapMs: number | null;
      carId: number | null;
    }[];
  } | null;
  pilots: {
    id: number;
    firstname: string;
    lastname: string | null;
    nickname: string | null;
  }[];
  cars: {
    id: number;
    name: string;
    pilotId: number;
    pilot: {
      firstname: string;
      lastname: string | null;
      nickname: string | null;
    };
  }[];
  tracks: TrackRow[];
  championships: ChampionshipRow[];
  showDeleteModal: boolean;
}) {
  const isEdit = mode === "edit";
  const slotCount = Math.max(8, pilots.length, race?.results.length ?? 0);
  const resultSlots = Array.from({ length: slotCount }, (_, index) => {
    const position = index + 1;
    const result = race?.results.find(
      (raceResult) => raceResult.position === position,
    );

    return {
      position,
      result: result
        ? {
            pilotId: result.pilotId,
            carId: result.carId,
            laps: result.laps,
            bestLap: result.bestLapMs ? formatBestLap(result.bestLapMs) : "",
          }
        : undefined,
    };
  });
  return (
    <DismissibleDrawer>
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm">
      <DrawerCloseButton className="flex-1" ariaLabel="Fermer le volet" />

      <aside className="h-full w-full max-w-4xl overflow-y-auto bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-pink-500">
              {isEdit ? "Modification" : "Création"}
            </p>
            <h2 className="mt-1 text-2xl font-black text-zinc-900">
              {isEdit ? "Modifier la course" : "Ajouter une course"}
            </h2>
          </div>

          <DrawerCloseButton
            className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:border-pink-500 hover:text-pink-600"
          >
            Fermer
          </DrawerCloseButton>
        </div>

        {isEdit && !race ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Course introuvable.
          </div>
        ) : (
          <form action={saveRace} className="space-y-5">
            <RaceField label="Nom" name="name" defaultValue={race?.name} required />

            <RaceChampionshipFields
              defaultRaceDate={
                race ? formatRaceDateForInput(race.raceDate) : undefined
              }
              defaultChampionshipId={race?.championshipId ?? null}
              championships={championships.map((championship) => ({
                id: championship.id,
                name: championship.name,
                startDate: formatRaceDateForInput(championship.startDate),
                endDate: championship.endDate
                  ? formatRaceDateForInput(championship.endDate)
                  : null,
              }))}
            />

            <RaceField
              label="Circuit"
              name="trackName"
              defaultValue={race?.trackName ?? race?.location ?? undefined}
              placeholder="Mini-Z Arena"
              list="track-options"
              required
            />
            <datalist id="track-options">
              {tracks.map((track) => (
                <option key={track.id} value={track.name} />
              ))}
            </datalist>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-zinc-700">
                Notes
              </span>
              <textarea
                name="notes"
                defaultValue={race?.notes ?? undefined}
                rows={4}
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
              />
            </label>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="mb-3">
                <p className="text-sm font-bold text-zinc-900">
                  Pilotes, temps et tours
                </p>
                <p className="text-xs text-zinc-500">
                  Sélectionne un pilote et une voiture par place. Les voitures du pilote sont proposées en premier, puis les voitures prêtées.
                </p>
              </div>

              {pilots.length === 0 ? (
                <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-4 text-sm text-zinc-500">
                  Aucun pilote actif disponible.
                </div>
              ) : (
                <RaceResultsFields
                  pilots={pilots.map((pilot) => ({
                    id: pilot.id,
                    label: `${getPilotDisplayName(pilot)}${
                      pilot.nickname ? ` - ${getPilotFullName(pilot)}` : ""
                    }`,
                  }))}
                  cars={cars.map((car) => ({
                    id: car.id,
                    name: car.name,
                    pilotId: car.pilotId,
                    pilotLabel: getPilotDisplayName(car.pilot),
                  }))}
                  resultSlots={resultSlots}
                />
              )}
            </div>

            {race && <input type="hidden" name="id" value={race.id} />}

            <div className="flex items-center justify-between gap-3 border-t border-zinc-100 pt-5">
              {race ? (
                <Link
                  href={`/races?drawer=edit&raceId=${race.id}&confirmDelete=1`}
                  className="rounded-md border border-red-200 bg-red-50 px-4 py-2 font-semibold text-red-600 transition hover:bg-red-100"
                >
                  Supprimer
                </Link>
              ) : (
                <span />
              )}

              <div className="flex gap-3">
                <Link
                  href="/races"
                  className="rounded-md border border-zinc-200 px-4 py-2 font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
                >
                  Annuler
                </Link>
                <button
                  type="submit"
                  className="rounded-md bg-gradient-to-r from-pink-500 to-yellow-400 px-4 py-2 font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  {isEdit ? "Enregistrer" : "Créer la course"}
                </button>
              </div>
            </div>
          </form>
        )}
      </aside>

      {showDeleteModal && race && <DeleteRaceModal race={race} />}
    </div>
    </DismissibleDrawer>
  );
}

function RaceField({
  label,
  name,
  type = "text",
  defaultValue,
  required = false,
  placeholder,
  list,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
  list?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-zinc-700">
        {label}
        {required && <span className="text-pink-500"> *</span>}
      </span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        list={list}
        className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
      />
    </label>
  );
}

function RaceSessionModal({
  date,
  races,
  pilotsById,
  carById,
  carByPilotId,
}: {
  date: string;
  races: (RaceRow & { results: RaceResultRow[] })[];
  pilotsById: Map<
    number,
    {
      id: number;
      firstname: string;
      lastname: string | null;
      nickname: string | null;
    }
  >;
  carById: Map<number, CarWithPiSpecs>;
  carByPilotId: Map<number, CarWithPiSpecs>;
}) {
  const sessionResults = races.flatMap((race) => race.results);
  const sessionLaps = sessionResults
    .map((result) => result.laps)
    .filter((laps): laps is number => laps !== null);
  const sessionBestLaps = sessionResults
    .map((result) => result.bestLapMs)
    .filter((bestLapMs): bestLapMs is number => bestLapMs !== null);
  const averageLaps = getAverage(sessionLaps);
  const highestLaps = sessionLaps.length > 0 ? Math.max(...sessionLaps) : null;
  const highestLapsPilot =
    highestLaps === null
      ? null
      : pilotsById.get(
          sessionResults.find((result) => result.laps === highestLaps)
            ?.pilotId ?? 0,
        );
  const averageBestLap = getAverage(sessionBestLaps);
  const sessionBestLap =
    sessionBestLaps.length > 0 ? Math.min(...sessionBestLaps) : null;
  const sessionBestLapPilot =
    sessionBestLap === null
      ? null
      : pilotsById.get(
          sessionResults.find((result) => result.bestLapMs === sessionBestLap)
            ?.pilotId ?? 0,
        );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <Link href="/races" className="absolute inset-0" aria-label="Fermer" />

      <div className="relative w-full max-w-[92rem] overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 p-6">
          <div>
            <h3 className="flex items-center gap-2 text-2xl font-black text-pink-500">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-pink-100 text-pink-600">
                <CalendarDays size="20" />
              </span>
              Session {formatSessionDate(date)}
            </h3>
          </div>

          <Link
            href="/races"
            className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:border-pink-500 hover:text-pink-600"
          >
            Fermer
          </Link>
        </div>

        <div className="max-h-[78vh] overflow-y-auto p-6">
          <div className="mb-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
            <SessionStat
              label="Tours moyens"
              value={averageLaps === null ? "—" : String(Math.floor(averageLaps))}
            />
            <SessionStat
              label="Tours max."
              value={highestLaps === null ? "—" : String(highestLaps)}
              detail={
                highestLapsPilot ? getPilotDisplayName(highestLapsPilot) : undefined
              }
            />
            <SessionStat
              label="Temps moyen"
              value={formatBestLap(
                averageBestLap === null ? null : Math.round(averageBestLap),
              )}
            />
            <SessionStat
              label="Meilleur temps"
              value={formatBestLap(sessionBestLap)}
              detail={
                sessionBestLapPilot
                  ? getPilotDisplayName(sessionBestLapPilot)
                  : undefined
              }
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {races.map((race) => {
              const sortedResults = [...race.results].sort(
                (a, b) => a.position - b.position,
              );
              const raceBestLap = getRaceBestLap(sortedResults);

              return (
                <section
                  key={race.id}
                  className="overflow-hidden rounded-xl border border-zinc-200"
                >
                  <div className="border-b border-zinc-100 bg-zinc-50 px-3 py-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <Link
                          href={`/races?detailsRaceId=${race.id}`}
                          className="font-bold text-zinc-900 transition hover:text-pink-600 hover:underline"
                        >
                          {race.name}
                        </Link>
                        {race.trackName && (
                          <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-zinc-500">
                            <MapPin size="14" />
                            {race.trackName}
                          </p>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-zinc-600">
                        {race.results.length} pilote
                        {race.results.length > 1 ? "s" : ""}
                      </p>
                    </div>
                    {race.notes && (
                      <p className="mt-2 whitespace-pre-line text-xs text-zinc-600">
                        {race.notes}
                      </p>
                    )}
                  </div>

                  {sortedResults.length === 0 ? (
                    <div className="p-3 text-xs text-zinc-500">
                      Aucun résultat enregistré pour cette course.
                    </div>
                  ) : (
                    <table className="w-full table-fixed text-left text-xs">
                      <colgroup>
                        <col className="w-[12%]" />
                        <col className="w-[32%]" />
                        <col className="w-[16%]" />
                        <col className="w-[14%]" />
                        <col className="w-[26%]" />
                      </colgroup>
                      <thead className="bg-white text-xs uppercase tracking-wide text-zinc-500">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Place</th>
                          <th className="px-3 py-2 font-semibold">Pilote</th>
                          <th className="px-3 py-2 font-semibold">Classe</th>
                          <th className="px-3 py-2 font-semibold">Tours</th>
                          <th className="px-3 py-2 font-semibold">
                            Meilleur temps
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {sortedResults.map((result) => {
                          const pilot = pilotsById.get(result.pilotId);
                          const car = getResultCar(
                            result,
                            carById,
                            carByPilotId,
                          );
                          const isBestLap =
                            result.bestLapMs !== null &&
                            result.bestLapMs === raceBestLap;
                          const isUnderSessionAverage =
                            result.bestLapMs !== null &&
                            averageBestLap !== null &&
                            result.bestLapMs < averageBestLap;

                          return (
                            <tr key={result.id}>
                              <td className="px-3 py-2 font-semibold text-zinc-900">
                                #{result.position}
                              </td>
                              <td className="px-3 py-2">
                                {pilot ? (
                                  <div className="min-w-0">
                                    <p className="truncate font-semibold text-zinc-900">
                                      {getPilotDisplayName(pilot)}
                                    </p>
                                  </div>
                                ) : (
                                  <span className="text-zinc-500">
                                    Pilote supprimé
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {car ? (
                                  <PiTag
                                    piClass={formatPiClass(getCarTotalPi(car))}
                                    piValue={getCarTotalPi(car)}
                                    compact
                                  />
                                ) : (
                                  <span className="text-zinc-400">—</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-zinc-600">
                                {result.laps ?? "—"}
                              </td>
                              <td
                                className={`px-3 py-2 ${
                                  isBestLap
                                    ? "font-bold text-green-600"
                                    : isUnderSessionAverage
                                      ? "font-bold text-zinc-900"
                                    : "text-zinc-600"
                                }`}
                              >
                                {formatBestLap(result.bestLapMs)}
                                {result.bestLapMs && raceBestLap && !isBestLap && (
                                  <span className="ml-2 text-xs font-semibold text-zinc-500">
                                    {formatBestLapDiff(
                                      result.bestLapMs,
                                      raceBestLap,
                                    )}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function SessionStat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="mt-0.5 text-base font-black text-zinc-900">
        {value}
        {detail && (
          <span className="ml-1 text-xs font-medium text-zinc-500">
            ({detail})
          </span>
        )}
      </p>
    </div>
  );
}

function PiTag({
  piClass,
  piValue,
  compact = false,
}: {
  piClass: string;
  piValue: number;
  compact?: boolean;
}) {
  const colors =
    piClass === "S" || piClass === "X"
      ? {
          className: "bg-purple-50 text-purple-700",
          border: "border-purple-200",
        }
      : piClass === "A"
        ? {
            className: "bg-red-50 text-red-700",
            border: "border-red-200",
          }
        : piClass === "B"
          ? {
              className: "bg-blue-50 text-blue-700",
              border: "border-blue-200",
            }
          : {
              className: "bg-yellow-50 text-yellow-700",
              border: "border-yellow-200",
            };
  const sizeClass = compact ? "text-[11px]" : "text-sm";
  const paddingClass = compact ? "px-1.5 py-0.5" : "px-2.5 py-0.5";

  return (
    <span
      className={`${colors.className} ${colors.border} inline-flex shrink-0 overflow-hidden rounded-md border ${sizeClass} font-black`}
    >
      <span className={paddingClass}>{piClass}</span>
      <span className={`bg-white ${paddingClass} text-zinc-900`}>
        {piValue}
      </span>
    </span>
  );
}

function RaceResultsModal({
  race,
  pilotsById,
  carById,
  carByPilotId,
}: {
  race: RaceRow & { results: RaceResultRow[] };
  pilotsById: Map<
    number,
    {
      id: number;
      firstname: string;
      lastname: string | null;
      nickname: string | null;
    }
  >;
  carById: Map<number, CarWithPiSpecs>;
  carByPilotId: Map<number, CarWithPiSpecs>;
}) {
  const sortedResults = [...race.results].sort(
    (a, b) => a.position - b.position,
  );
  const raceBestLap = getRaceBestLap(sortedResults);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <Link href="/races" className="absolute inset-0" aria-label="Fermer" />

      <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 p-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-pink-500">
              Résultats
            </p>
            <h3 className="mt-1 text-2xl font-black text-zinc-900">
              {race.name}
            </h3>
            <div className="mt-2 flex flex-wrap gap-3 text-sm text-zinc-500">
              <span>{formatRaceDate(race.raceDate)}</span>
              {race.trackName && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size="14" />
                  {race.trackName}
                </span>
              )}
            </div>
          </div>

          <Link
            href="/races"
            className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:border-pink-500 hover:text-pink-600"
          >
            Fermer
          </Link>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-6">
          {race.notes && (
            <div className="mb-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Commentaire
              </p>
              <p className="mt-1 whitespace-pre-line text-sm text-zinc-700">
                {race.notes}
              </p>
            </div>
          )}

          {sortedResults.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center text-sm text-zinc-500">
              Aucun résultat enregistré pour cette course.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-zinc-200">
              <table className="w-full table-fixed text-left text-sm">
                <colgroup>
                  <col className="w-[12%]" />
                  <col className="w-[34%]" />
                  <col className="w-[16%]" />
                  <col className="w-[14%]" />
                  <col className="w-[24%]" />
                </colgroup>
                <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Place</th>
                    <th className="px-4 py-3 font-semibold">Pilote</th>
                    <th className="px-4 py-3 font-semibold">Classe</th>
                    <th className="px-4 py-3 font-semibold">Tours</th>
                    <th className="px-4 py-3 font-semibold">Meilleur temps</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {sortedResults.map((result) => {
                    const pilot = pilotsById.get(result.pilotId);
                    const car = getResultCar(result, carById, carByPilotId);
                    const isBestLap =
                      result.bestLapMs !== null && result.bestLapMs === raceBestLap;

                    return (
                      <tr key={result.id}>
                        <td className="px-4 py-3 font-semibold text-zinc-900">
                          #{result.position}
                        </td>
                        <td className="px-4 py-3">
                          {pilot ? (
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-zinc-900">
                                {getPilotDisplayName(pilot)}
                              </p>
                            </div>
                          ) : (
                            <span className="text-zinc-500">Pilote supprimé</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {car ? (
                            <PiTag
                              piClass={formatPiClass(getCarTotalPi(car))}
                              piValue={getCarTotalPi(car)}
                            />
                          ) : (
                            <span className="text-zinc-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-zinc-600">
                          {result.laps ?? "—"}
                        </td>
                        <td
                          className={`px-4 py-3 ${
                            isBestLap
                              ? "font-bold text-green-600"
                              : "text-zinc-600"
                          }`}
                        >
                          {formatBestLap(result.bestLapMs)}
                          {result.bestLapMs && raceBestLap && !isBestLap && (
                            <span className="ml-2 text-xs font-semibold text-zinc-500">
                              {formatBestLapDiff(result.bestLapMs, raceBestLap)}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DeleteRaceModal({ race }: { race: { id: number; name: string } }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-red-500">
          Suppression
        </p>
        <h3 className="mt-1 text-2xl font-black text-zinc-900">
          Supprimer cette course ?
        </h3>
        <p className="mt-3 text-sm text-zinc-600">
          Tu vas supprimer définitivement la course{" "}
          <span className="font-semibold text-zinc-900">{race.name}</span>.
          Cette action sera enregistrée dans les logs.
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <Link
            href={`/races?drawer=edit&raceId=${race.id}`}
            className="rounded-md border border-zinc-200 px-4 py-2 font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
          >
            Annuler
          </Link>

          <form action={deleteRace}>
            <input type="hidden" name="id" value={race.id} />
            <button
              type="submit"
              className="rounded-md bg-red-600 px-4 py-2 font-semibold text-white shadow-sm transition hover:bg-red-700"
            >
              Confirmer la suppression
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
