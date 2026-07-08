import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarDays, Medal, Pencil, Plus, Trophy } from "lucide-react";
import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteChampionship, saveChampionship } from "./actions";

const DEFAULT_POINTS: Record<number, number> = {
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
const PI_CLASSES = ["X", "S", "A", "B", "C"] as const;

type ChampionshipRow = {
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

type ChampionshipRaceResultRow = {
  raceId: number;
  championshipId: number | null;
  raceName: string;
  raceDate: Date;
  raceCreatedAt: Date;
  pilotId: number;
  carId: number | null;
  firstname: string;
  lastname: string | null;
  nickname: string | null;
  position: number;
};

type CarWithPiSpecs = {
  id: number;
  pilotId: number;
  specs: { spec: { piValue: number } }[];
};

type StandingRow = {
  pilotId: number;
  pilotName: string;
  points: number;
  races: number;
  countedRaces: number;
  polePositions: number;
  bestPosition: number | null;
  scores: number[];
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

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateForInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatChampionshipPeriod(championship: {
  startDate: Date;
  endDate: Date | null;
}) {
  return `${formatDate(championship.startDate)} - ${
    championship.endDate ? formatDate(championship.endDate) : "EN COURS"
  }`;
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

function getPointsByPosition(value: unknown) {
  if (!value || typeof value !== "object") return DEFAULT_POINTS;

  return Object.entries(value as Record<string, unknown>).reduce<
    Record<number, number>
  >((points, [position, rawPoints]) => {
    const numericPosition = Number(position);
    const numericPoints = Number(rawPoints);

    if (Number.isFinite(numericPosition) && Number.isFinite(numericPoints)) {
      points[numericPosition] = numericPoints;
    }

    return points;
  }, {});
}

function getRacePoints(
  result: ChampionshipRaceResultRow,
  pointsByPosition: Record<number, number>,
) {
  return pointsByPosition[result.position] ?? 0;
}

function getChampionshipResults(
  championship: ChampionshipRow,
  raceResults: ChampionshipRaceResultRow[],
) {
  return raceResults.filter(
    (result) => result.championshipId === championship.id,
  );
}

function getStandings(
  championship: ChampionshipRow,
  raceResults: ChampionshipRaceResultRow[],
  carById: Map<number, CarWithPiSpecs>,
  carByPilotId: Map<number, CarWithPiSpecs>,
  piClass?: string,
) {
  const pointsByPosition = getPointsByPosition(championship.pointsByPosition);
  const rows = new Map<number, StandingRow>();

  for (const result of getChampionshipResults(championship, raceResults)) {
    if (piClass) {
      const car = getResultCar(result, carById, carByPilotId);
      if (!car || formatPiClass(getCarTotalPi(car)) !== piClass) continue;
    }

    const score = getRacePoints(result, pointsByPosition);
    const current = rows.get(result.pilotId) ?? {
      pilotId: result.pilotId,
      pilotName: getPilotDisplayName(result),
      points: 0,
      races: 0,
      countedRaces: 0,
      polePositions: 0,
      bestPosition: null,
      scores: [],
    };

    current.races += 1;
    current.polePositions += result.position <= 3 ? 1 : 0;
    current.bestPosition =
      current.bestPosition === null
        ? result.position
        : Math.min(current.bestPosition, result.position);
    current.scores.push(score);
    rows.set(result.pilotId, current);
  }

  return [...rows.values()]
    .map((standing) => {
      const countedScores =
        championship.scoringMode === "BEST"
          ? [...standing.scores]
              .sort((a, b) => b - a)
              .slice(0, championship.bestRaceCount ?? 1)
          : standing.scores;

      return {
        ...standing,
        countedRaces: countedScores.length,
        points: countedScores.reduce((sum, score) => sum + score, 0),
      };
    })
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.polePositions !== a.polePositions) {
        return b.polePositions - a.polePositions;
      }

      return (a.bestPosition ?? 999) - (b.bestPosition ?? 999);
    });
}

export default async function ChampionshipsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    drawer?: string;
    championshipId?: string;
    detailsChampionshipId?: string;
    confirmDelete?: string;
  }>;
}) {
  await requireCurrentUser();

  const [championships, raceResults, cars] = await Promise.all([
    prisma.$queryRaw<ChampionshipRow[]>`
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
      ORDER BY "startDate" DESC, "createdAt" ASC
    `,
    prisma.$queryRaw<ChampionshipRaceResultRow[]>`
      SELECT
        "Race"."id" AS "raceId",
        "Race"."championshipId",
        "Race"."name" AS "raceName",
        "Race"."raceDate",
        "Race"."createdAt" AS "raceCreatedAt",
        "RaceResult"."pilotId",
        "RaceResult"."carId",
        "Pilot"."firstname",
        "Pilot"."lastname",
        "Pilot"."nickname",
        "RaceResult"."position"
      FROM "RaceResult"
      INNER JOIN "Race" ON "Race"."id" = "RaceResult"."raceId"
      INNER JOIN "Pilot" ON "Pilot"."id" = "RaceResult"."pilotId"
      ORDER BY "Race"."raceDate" ASC, "Race"."createdAt" ASC, "RaceResult"."position" ASC
    `,
    prisma.car.findMany({
      include: {
        specs: {
          include: {
            spec: true,
          },
        },
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }),
  ]);
  const carById = new Map<number, CarWithPiSpecs>(
    cars.map((car) => [car.id, car]),
  );
  const carByPilotId = new Map<number, CarWithPiSpecs>();

  for (const car of cars) {
    if (!carByPilotId.has(car.pilotId)) {
      carByPilotId.set(car.pilotId, car);
    }
  }

  const params = await searchParams;
  const drawerMode = params?.drawer;
  const selectedChampionshipId = params?.championshipId
    ? Number(params.championshipId)
    : null;
  const detailsChampionshipId = params?.detailsChampionshipId
    ? Number(params.detailsChampionshipId)
    : null;
  const selectedChampionship = selectedChampionshipId
    ? championships.find(
        (championship) => championship.id === selectedChampionshipId,
      )
    : null;
  const detailsChampionship = detailsChampionshipId
    ? championships.find(
        (championship) => championship.id === detailsChampionshipId,
      )
    : null;
  const isDrawerOpen = drawerMode === "add" || drawerMode === "edit";
  const isDeleteModalOpen =
    drawerMode === "edit" && params?.confirmDelete === "1";
  const activeCount = championships.filter(
    (championship) =>
      championship.startDate <= new Date() &&
      (!championship.endDate || championship.endDate >= new Date()),
  ).length;

  return (
    <div className="m-2 rounded bg-white p-2 text-gray-900">
      <div className="flex flex-row items-start justify-between gap-4">
        <div>
          <div className="my-2 flex flex-row gap-2 text-5xl">
            <p className="rounded bg-purple-100 p-2 text-purple-600">
              <Trophy size="30" />
            </p>
            <p className="self-end">Championnats</p>
          </div>
          <p>Classements calculés depuis les courses et leurs résultats.</p>
        </div>

        <Link
          href="/championships?drawer=add"
          className="inline-flex h-fit shrink-0 items-center gap-2 rounded-md bg-gradient-to-r from-pink-500 to-yellow-400 px-5 py-3 font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
        >
          <Plus />
          Ajouter un championnat
        </Link>
      </div>

      <div className="mb-6 flex flex-row flex-wrap gap-3">
        <QuickViewCard
          icon={<Trophy />}
          color="text-purple-600"
          bgColor="bg-purple-100"
          value={championships.length.toString()}
          label="Championnats"
        />
        <QuickViewCard
          icon={<CalendarDays />}
          color="text-green-600"
          bgColor="bg-green-100"
          value={activeCount.toString()}
          label="En cours"
        />
      </div>

      <div className="space-y-4">
        {championships.map((championship) => {
          const standings = getStandings(
            championship,
            raceResults,
            carById,
            carByPilotId,
          );

          return (
            <section
              key={championship.id}
              className="grid gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(260px,1fr)_minmax(320px,0.9fr)]"
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/championships?detailsChampionshipId=${championship.id}`}
                    className="flex min-w-0 items-center gap-2 text-lg font-black text-zinc-900 transition hover:text-purple-600 hover:underline"
                  >
                    <Medal className="shrink-0 text-purple-600" size="18" />
                    <span className="truncate">{championship.name}</span>
                  </Link>
                  <p className="mt-1 text-xs text-zinc-500">
                    {formatChampionshipPeriod(championship)}
                  </p>
                </div>

                <Link
                  href={`/championships?drawer=edit&championshipId=${championship.id}`}
                  className="shrink-0 rounded-md border border-zinc-200 px-2.5 py-1.5 text-sm font-medium text-zinc-700 transition hover:border-purple-500 hover:text-purple-600"
                  aria-label={`Modifier ${championship.name}`}
                >
                  <Pencil size="15" />
                </Link>
              </div>

              <ChampionshipPodium standings={standings} />
            </section>
          );
        })}

        {championships.length === 0 && (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-10 text-center text-sm text-zinc-500">
            Aucun championnat créé.
          </div>
        )}
      </div>

      {isDrawerOpen && (
        <ChampionshipDrawer
          mode={drawerMode}
          championship={selectedChampionship}
          showDeleteModal={isDeleteModalOpen}
        />
      )}

      {detailsChampionship && (
        <ChampionshipDetailsModal
          championship={detailsChampionship}
          standings={getStandings(
            detailsChampionship,
            raceResults,
            carById,
            carByPilotId,
          )}
          classStandings={PI_CLASSES.map((piClass) => ({
            piClass,
            standings: getStandings(
              detailsChampionship,
              raceResults,
              carById,
              carByPilotId,
              piClass,
            ),
          }))}
          raceCount={
            new Set(
              getChampionshipResults(detailsChampionship, raceResults).map(
                (result) => result.raceId,
              ),
            ).size
          }
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
        <p className="text-3xl font-bold leading-none text-zinc-900">
          {value}
        </p>
        <p className="mt-1 text-sm text-zinc-500">{label}</p>
      </div>
    </div>
  );
}

function ChampionshipPodium({ standings }: { standings: StandingRow[] }) {
  const podium = standings.slice(0, 3);

  if (podium.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-3 text-center text-sm text-zinc-500">
        Aucun résultat de course dans cette période.
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center gap-1.5">
      {podium.map((standing, index) => (
        <PodiumPlace key={standing.pilotId} standing={standing} place={index + 1} />
      ))}
    </div>
  );
}

function PodiumPlace({
  standing,
  place,
}: {
  standing: StandingRow;
  place: number;
}) {
  const medalStyle =
    place === 1
      ? "bg-yellow-100 text-yellow-700 border-yellow-200"
      : place === 2
        ? "bg-zinc-100 text-zinc-500 border-zinc-200"
        : "bg-orange-100 text-orange-700 border-orange-200";

  return (
    <div className="flex min-w-0 items-center gap-2 rounded-md bg-zinc-50 px-2.5 py-1.5">
      <span
        className={`${medalStyle} flex h-6 w-6 shrink-0 items-center justify-center rounded-full border`}
      >
        <Medal size="13" />
      </span>
      <p className="min-w-0 truncate text-sm font-semibold text-zinc-900">
        {standing.pilotName}
      </p>
    </div>
  );
}

function ChampionshipDetailsModal({
  championship,
  standings,
  classStandings,
  raceCount,
}: {
  championship: ChampionshipRow;
  standings: StandingRow[];
  classStandings: { piClass: string; standings: StandingRow[] }[];
  raceCount: number;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <Link href="/championships" className="absolute inset-0" aria-label="Fermer" />

      <div className="relative w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 p-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-purple-600">
              Championnat
            </p>
            <h3 className="mt-1 text-2xl font-black text-zinc-900">
              {championship.name}
            </h3>
            <p className="mt-2 text-sm text-zinc-500">
              {formatChampionshipPeriod(championship)}
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {championship.scoringMode === "BEST"
                ? `${championship.bestRaceCount ?? 1} meilleurs résultats`
                : "Toutes les courses comptent"}{" "}
              · {raceCount} course{raceCount > 1 ? "s" : ""}
            </p>
          </div>

          <Link
            href="/championships"
            className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:border-purple-500 hover:text-purple-600"
          >
            Fermer
          </Link>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-6">
          <h4 className="mb-3 text-sm font-black uppercase tracking-wide text-zinc-700">
            Classement général
          </h4>
          {standings.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center text-sm text-zinc-500">
              Aucun résultat de course dans cette période.
            </div>
          ) : (
            <StandingsTable championship={championship} standings={standings} />
          )}

          <div className="mt-6">
            <h4 className="mb-3 text-sm font-black uppercase tracking-wide text-zinc-700">
              Classements par classe
            </h4>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {classStandings.map(({ piClass, standings }) => (
                <section
                  key={piClass}
                  className="overflow-hidden rounded-xl border border-zinc-200"
                >
                  <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-2">
                    <p className="text-sm font-black text-zinc-900">
                      Classe {piClass}
                    </p>
                  </div>
                  {standings.length === 0 ? (
                    <div className="p-4 text-sm text-zinc-500">
                      Aucun pilote classé.
                    </div>
                  ) : (
                    <StandingsTable
                      championship={championship}
                      standings={standings}
                      compact
                    />
                  )}
                </section>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StandingsTable({
  championship,
  standings,
  compact = false,
}: {
  championship: ChampionshipRow;
  standings: StandingRow[];
  compact?: boolean;
}) {
  const cellClass = compact ? "px-3 py-2" : "px-5 py-2";

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200">
      <table className="w-full text-left text-sm">
        <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            <th className={`${cellClass} font-semibold`}>#</th>
            <th className={`${cellClass} font-semibold`}>Pilote</th>
            <th className={`${cellClass} font-semibold`}>Points</th>
            <th className={`${cellClass} font-semibold`}>Courses</th>
            <th className={`${cellClass} font-semibold`}>Poles</th>
            <th className={`${cellClass} font-semibold`}>Meilleure place</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {standings.map((standing, index) => (
            <tr key={standing.pilotId} className="hover:bg-zinc-50">
              <td className={`${cellClass} font-black text-zinc-900`}>
                {index + 1}
              </td>
              <td className={`${cellClass} font-semibold text-zinc-900`}>
                {standing.pilotName}
              </td>
              <td className={`${cellClass} text-base font-black text-purple-600`}>
                {standing.points}
              </td>
              <td className={`${cellClass} text-zinc-600`}>
                {standing.countedRaces}
                {championship.scoringMode === "BEST" && (
                  <span className="text-zinc-400"> / {standing.races}</span>
                )}
              </td>
              <td className={`${cellClass} text-zinc-600`}>
                {standing.polePositions}
              </td>
              <td className={`${cellClass} text-zinc-600`}>
                {standing.bestPosition ? `#${standing.bestPosition}` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChampionshipDrawer({
  mode,
  championship,
  showDeleteModal,
}: {
  mode: string | undefined;
  championship?: ChampionshipRow | null;
  showDeleteModal: boolean;
}) {
  const isEdit = mode === "edit";
  const points = getPointsByPosition(championship?.pointsByPosition);

  return (
    <div className="fixed inset-0 z-50 flex">
      <Link
        href="/championships"
        className="flex-1 bg-black/40 backdrop-blur-sm"
        aria-label="Fermer le volet"
      />

      <aside className="relative h-full w-full max-w-2xl overflow-y-auto bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-purple-600">
              {isEdit ? "Modifier" : "Nouveau"}
            </p>
            <h2 className="text-3xl font-black text-zinc-900">
              {isEdit ? "Championnat" : "Créer un championnat"}
            </h2>
          </div>

          <Link
            href="/championships"
            className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:border-purple-500 hover:text-purple-600"
          >
            Fermer
          </Link>
        </div>

        {isEdit && !championship ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            Championnat introuvable.
          </div>
        ) : (
          <form action={saveChampionship} className="space-y-5">
            <ChampionshipField
              label="Nom"
              name="name"
              defaultValue={championship?.name}
              required
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <ChampionshipField
                label="Date de début"
                name="startDate"
                type="date"
                defaultValue={
                  championship
                    ? formatDateForInput(championship.startDate)
                    : undefined
                }
                required
              />
              <ChampionshipField
                label="Date de fin"
                name="endDate"
                type="date"
                defaultValue={
                  championship
                    ? championship.endDate
                      ? formatDateForInput(championship.endDate)
                      : undefined
                    : undefined
                }
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_160px]">
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-zinc-700">
                  Mode de calcul
                </span>
                <select
                  name="scoringMode"
                  defaultValue={championship?.scoringMode ?? "ALL"}
                  className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                >
                  <option value="ALL">Toutes les courses</option>
                  <option value="BEST">Les X meilleurs résultats</option>
                </select>
              </label>

              <ChampionshipField
                label="X meilleurs"
                name="bestRaceCount"
                type="number"
                min="1"
                defaultValue={String(championship?.bestRaceCount ?? 5)}
              />
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-zinc-700">
                Barème
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {Array.from({ length: 10 }, (_, index) => {
                  const position = index + 1;

                  return (
                    <label key={position} className="block">
                      <span className="mb-1 block text-xs font-semibold text-zinc-500">
                        P{position}
                      </span>
                      <input
                        type="number"
                        name={`points_${position}`}
                        min="0"
                        defaultValue={points[position] ?? 0}
                        className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            {championship && (
              <input type="hidden" name="id" value={championship.id} />
            )}

            <div className="flex items-center justify-between gap-3 border-t border-zinc-100 pt-5">
              {championship ? (
                <Link
                  href={`/championships?drawer=edit&championshipId=${championship.id}&confirmDelete=1`}
                  className="rounded-md border border-red-200 bg-red-50 px-4 py-2 font-semibold text-red-600 transition hover:bg-red-100"
                >
                  Supprimer
                </Link>
              ) : (
                <span />
              )}

              <div className="flex gap-3">
                <Link
                  href="/championships"
                  className="rounded-md border border-zinc-200 px-4 py-2 font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
                >
                  Annuler
                </Link>
                <button
                  type="submit"
                  className="rounded-md bg-purple-600 px-4 py-2 font-semibold text-white transition hover:bg-purple-700"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </form>
        )}
      </aside>

      {showDeleteModal && championship && (
        <DeleteChampionshipModal championship={championship} />
      )}
    </div>
  );
}

function ChampionshipField({
  label,
  name,
  type = "text",
  defaultValue,
  required = false,
  min,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  min?: string;
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
        min={min}
        className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
      />
    </label>
  );
}

function DeleteChampionshipModal({
  championship,
}: {
  championship: { id: number; name: string };
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-red-500">
          Suppression
        </p>
        <h3 className="mt-1 text-2xl font-black text-zinc-900">
          Supprimer ce championnat ?
        </h3>
        <p className="mt-3 text-sm text-zinc-600">
          Tu vas supprimer définitivement{" "}
          <span className="font-semibold text-zinc-900">
            {championship.name}
          </span>
          .
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <Link
            href={`/championships?drawer=edit&championshipId=${championship.id}`}
            className="rounded-md border border-zinc-200 px-4 py-2 font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
          >
            Annuler
          </Link>

          <form action={deleteChampionship}>
            <input type="hidden" name="id" value={championship.id} />
            <button
              type="submit"
              className="rounded-md bg-red-600 px-4 py-2 font-semibold text-white transition hover:bg-red-700"
            >
              Supprimer
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
