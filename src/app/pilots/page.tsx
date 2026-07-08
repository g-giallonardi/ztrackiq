import Link from "next/link";
import type { ReactNode } from "react";
import {
  DismissibleDrawer,
  DrawerCloseButton,
} from "@/components/DismissibleDrawer";
import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Activity,
  Car,
  Flag,
  Gauge,
  Medal,
  Plus,
  Trophy,
  User,
  UserRoundCheck,
  Users,
} from "lucide-react";
import { deletePilot, savePilot } from "./actions";
import { PilotsTable, type PilotTableRow } from "./PilotsTable";

type PilotStats = {
  races: number | bigint;
  wins: number | bigint;
  podiums: number | bigint;
  bestPosition: number | null;
  totalLaps: number | bigint | null;
  averageLaps: number | null;
  bestLapMs: number | null;
  averageBestLapMs: number | null;
};

type RecentResult = {
  raceId: number;
  raceName: string;
  raceDate: Date;
  trackName: string | null;
  carName: string | null;
  position: number;
  laps: number | null;
  bestLapMs: number | null;
};

type CarStatsRow = {
  id: number;
  name: string;
  raceCount: number | bigint;
  bestResult: number | null;
};

type PilotDetailsData = {
  stats: PilotStats | undefined;
  recentResults: RecentResult[];
  cars: CarStatsRow[];
};

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

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatBestLap(bestLapMs: number | null | undefined) {
  if (!bestLapMs) return "-";

  const totalSeconds = bestLapMs / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds - minutes * 60;

  return minutes > 0
    ? `${minutes}:${seconds.toFixed(3).padStart(6, "0")}`
    : seconds.toFixed(3);
}

function readNumber(value: number | bigint | null | undefined) {
  return Number(value ?? 0);
}

function formatPilotRole(role: string) {
  return role === "admin"
    ? "Admin"
    : role === "adherent"
      ? "Adhérent"
      : "Visiteur";
}

function getPilotRoleClassName(role: string) {
  return role === "admin"
    ? "bg-purple-100 text-purple-700 ring-purple-600/20"
    : role === "adherent"
      ? "bg-cyan-100 text-cyan-700 ring-cyan-600/20"
      : "bg-zinc-100 text-zinc-600 ring-zinc-500/20";
}

export default async function PilotsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    drawer?: string;
    pilotId?: string;
    detailsPilotId?: string;
    confirmDelete?: string;
  }>;
}) {
  const currentUser = await requireCurrentUser();
  const canManage = currentUser.role === "admin";

  const [pilots, clubs] = await Promise.all([
    prisma.pilot.findMany({
      include: {
        club: true,
        cars: {
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        },
      },
      orderBy: {
        lastname: "asc",
      },
    }),
    prisma.club.findMany({
      orderBy: [{ default: "desc" }, { name: "asc" }],
    }),
  ]);

  const activeCount = pilots.filter((p) => p.active).length;
  const inactiveCount = pilots.filter((p) => !p.active).length;
  const pilotTableRows: PilotTableRow[] = pilots.map((pilot) => {
    const fullName = getPilotFullName(pilot);

    return {
      id: pilot.id,
      firstname: pilot.firstname,
      lastname: pilot.lastname,
      nickname: pilot.nickname,
      fullName,
      initials: `${pilot.firstname[0] ?? ""}${pilot.lastname?.[0] ?? ""}`,
      active: pilot.active,
      statusLabel: pilot.active ? "Actif" : "Inactif",
      role: pilot.role,
      roleLabel: formatPilotRole(pilot.role),
      clubName: pilot.club?.name ?? "Aucun",
      carName: pilot.cars[0]?.name ?? "—",
    };
  });

  const params = await searchParams;
  const drawerMode = params?.drawer;
  const selectedPilotId = params?.pilotId ? Number(params.pilotId) : null;
  const detailsPilotId = params?.detailsPilotId ? Number(params.detailsPilotId) : null;
  const selectedPilot = selectedPilotId
    ? pilots.find((pilot) => pilot.id === selectedPilotId)
    : null;
  const detailsPilot = detailsPilotId
    ? pilots.find((pilot) => pilot.id === detailsPilotId)
    : null;
  const detailsData = detailsPilot
    ? await getPilotDetailsData(detailsPilot.id)
    : null;
  const isDrawerOpen = drawerMode === "add" || drawerMode === "edit";
  const isDeleteModalOpen = drawerMode === "edit" && params?.confirmDelete === "1";

  return (
    <div className="bg-white m-2 p-2 rounded text-gray-900">
        <div className="flex flex-row items-start justify-between gap-4">
            <div>
                <div className="text-5xl flex flex-row gap-2 my-2">
                    <p className="text-pink-500 bg-pink-200 p-2 rounded"><Users size="30"/></p> 
                    <p className="self-end ">Pilotes</p>
                </div>
                <p>Gérer les pilotes inscrits</p>
            </div>
            {canManage && (
              <Link
                  href="/pilots?drawer=add"
                  className="
                    inline-flex items-center gap-2
                    h-fit shrink-0
                    rounded-md
                    bg-gradient-to-r from-pink-500 to-yellow-400
                    px-5 py-3
                    font-semibold text-white
                    shadow-md
                    transition-all
                    hover:-translate-y-0.5
                    hover:shadow-lg
                    active:translate-y-0
                  "
                  >
                  <Plus />
                  Ajouter un pilote
              </Link>
            )}
        </div>

      <div className="flex flex-row gap-3 flex-wrap mb-6">
        <QuickViewCard
            icon={<UserRoundCheck />}
            color='text-green-500'
            bgColor='bg-green-100'
            value={activeCount.toString()}
            label='Actifs'
        />
        <QuickViewCard
            icon={<User />}
            color='text-gray-400'
            bgColor='bg-gray-100'
            value={inactiveCount.toString()}
            label='Inactifs'
        />

      </div>
      <PilotsTable pilots={pilotTableRows} canManage={canManage} />
    
      {canManage && isDrawerOpen && (
        <PilotDrawer
          key={`${drawerMode}-${selectedPilotId ?? "new"}`}
          mode={drawerMode}
          pilot={selectedPilot}
          clubs={clubs}
          showDeleteModal={isDeleteModalOpen}
        />
      )}

      {detailsPilot && detailsData && (
        <PilotDetailsModal pilot={detailsPilot} details={detailsData} />
      )}
    </div>
  );
}

async function getPilotDetailsData(pilotId: number): Promise<PilotDetailsData> {
  const [statsRows, recentResults, cars] =
    await Promise.all([
      prisma.$queryRaw<PilotStats[]>`
        SELECT
          COUNT(*)::int AS "races",
          COUNT(*) FILTER (WHERE "position" = 1)::int AS "wins",
          COUNT(*) FILTER (WHERE "position" <= 3)::int AS "podiums",
          MIN("position")::int AS "bestPosition",
          COALESCE(SUM("laps"), 0)::int AS "totalLaps",
          AVG("laps")::float AS "averageLaps",
          MIN("bestLapMs")::int AS "bestLapMs",
          AVG("bestLapMs")::float AS "averageBestLapMs"
        FROM "RaceResult"
        WHERE "pilotId" = ${pilotId}
      `,
      prisma.$queryRaw<RecentResult[]>`
        SELECT
          "Race"."id" AS "raceId",
          "Race"."name" AS "raceName",
          "Race"."raceDate",
          "Track"."name" AS "trackName",
          "Car"."name" AS "carName",
          "RaceResult"."position",
          "RaceResult"."laps",
          "RaceResult"."bestLapMs"
        FROM "RaceResult"
        INNER JOIN "Race" ON "Race"."id" = "RaceResult"."raceId"
        LEFT JOIN "Track" ON "Track"."id" = "Race"."trackId"
        LEFT JOIN "Car" ON "Car"."id" = "RaceResult"."carId"
        WHERE "RaceResult"."pilotId" = ${pilotId}
        ORDER BY "Race"."raceDate" DESC, "Race"."createdAt" DESC
        LIMIT 5
      `,
      prisma.$queryRaw<CarStatsRow[]>`
        SELECT
          "Car"."id",
          "Car"."name",
          COUNT("RaceResult"."id")::int AS "raceCount",
          MIN("RaceResult"."position")::int AS "bestResult"
        FROM "Car"
        LEFT JOIN "RaceResult" ON "RaceResult"."carId" = "Car"."id"
        WHERE "Car"."pilotId" = ${pilotId}
        GROUP BY "Car"."id", "Car"."name", "Car"."createdAt"
        ORDER BY "Car"."createdAt" ASC, "Car"."name" ASC
      `,
    ]);

  return {
    stats: statsRows[0],
    recentResults,
    cars,
  };
}

function PilotDetailsModal({
  pilot,
  details,
}: {
  pilot: {
    id: number;
    firstname: string;
    lastname: string | null;
    nickname: string | null;
    email: string;
    role: string;
    phone: string | null;
    active: boolean;
    createdAt: Date;
    club: { name: string } | null;
  };
  details: PilotDetailsData;
}) {
  const stats = details.stats;
  const races = readNumber(stats?.races);
  const wins = readNumber(stats?.wins);
  const podiums = readNumber(stats?.podiums);
  const podiumRate = races > 0 ? Math.round((podiums / races) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <Link href="/pilots" className="absolute inset-0" aria-label="Fermer" />

      <div className="relative w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 p-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-pink-500">
              Fiche pilote
            </p>
            <h3 className="mt-1 text-3xl font-black text-zinc-900">
              {getPilotDisplayName(pilot)}
            </h3>
            <p className="mt-1 text-sm text-zinc-500">
              {formatPilotRole(pilot.role)}
              {pilot.club?.name ? ` · ${pilot.club.name}` : ""}
              {pilot.active ? " · Actif" : " · Inactif"}
            </p>
          </div>

          <Link
            href="/pilots"
            className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:border-pink-500 hover:text-pink-600"
          >
            Fermer
          </Link>
        </div>

        <div className="max-h-[78vh] overflow-y-auto p-5">
          <div className="grid gap-3 lg:grid-cols-4">
            <PilotStatCard
              icon={<Flag />}
              label="Courses"
              value={races.toString()}
              detail={`${wins} victoire${wins > 1 ? "s" : ""}`}
              color="bg-pink-100 text-pink-600"
            />
            <PilotStatCard
              icon={<Medal />}
              label="Podiums"
              value={podiums.toString()}
              detail={`${podiumRate}% des courses`}
              color="bg-yellow-100 text-yellow-700"
            />
            <PilotStatCard
              icon={<Activity />}
              label="Tours"
              value={readNumber(stats?.totalLaps).toString()}
              detail={`${Math.floor(stats?.averageLaps ?? 0)} en moyenne`}
              color="bg-cyan-100 text-cyan-700"
            />
            <PilotStatCard
              icon={<Gauge />}
              label="Meilleur tour"
              value={formatBestLap(stats?.bestLapMs)}
              detail={`Moy. ${formatBestLap(
                stats?.averageBestLapMs ? Math.round(stats.averageBestLapMs) : null,
              )}`}
              color="bg-purple-100 text-purple-700"
            />
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_360px]">
            <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Trophy className="text-pink-500" size="20" />
                <h4 className="text-lg font-black text-zinc-900">
                  Résultats
                </h4>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <PilotMiniStat
                  label="Meilleure place"
                  value={stats?.bestPosition ? `P${stats.bestPosition}` : "-"}
                />
                <PilotMiniStat
                  label="Membre depuis"
                  value={formatDate(pilot.createdAt)}
                />
              </div>

              <div className="mt-5">
                <h5 className="mb-2 text-sm font-black uppercase text-zinc-600">
                  Dernières courses
                </h5>
                <div className="overflow-hidden rounded-xl border border-zinc-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                      <tr>
                        <th className="px-3 py-2">Course</th>
                        <th className="px-3 py-2">Place</th>
                        <th className="px-3 py-2">Tours</th>
                        <th className="px-3 py-2">Meilleur</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {details.recentResults.map((result) => (
                        <tr key={result.raceId}>
                          <td className="px-3 py-2">
                            <p className="font-semibold text-zinc-900">
                              {result.raceName}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {formatDate(result.raceDate)}
                              {result.trackName ? ` · ${result.trackName}` : ""}
                            </p>
                          </td>
                          <td className="px-3 py-2 font-black text-pink-600">
                            P{result.position}
                          </td>
                          <td className="px-3 py-2 text-zinc-600">
                            {result.laps ?? "-"}
                          </td>
                          <td className="px-3 py-2 text-zinc-600">
                            {formatBestLap(result.bestLapMs)}
                          </td>
                        </tr>
                      ))}
                      {details.recentResults.length === 0 && (
                        <tr>
                          <td
                            className="px-3 py-6 text-center text-zinc-500"
                            colSpan={4}
                          >
                            Aucune course enregistrée.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Car className="text-pink-500" size="20" />
                <h4 className="text-lg font-black text-zinc-900">
                  Voitures
                </h4>
              </div>

              <div className="space-y-2">
                {details.cars.map((car) => (
                  <div
                    key={car.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-zinc-900">
                        {car.name}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {readNumber(car.raceCount)} course
                        {readNumber(car.raceCount) > 1 ? "s" : ""}
                      </p>
                    </div>
                    <p className="text-sm font-black text-purple-600">
                      {car.bestResult ? `P${car.bestResult}` : "-"}
                    </p>
                  </div>
                ))}
                {details.cars.length === 0 && (
                  <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-500">
                    Aucune voiture associée.
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function PilotStatCard({
  icon,
  label,
  value,
  detail,
  color,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`${color} flex h-10 w-10 items-center justify-center rounded-md`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-zinc-500">{label}</p>
          <p className="truncate text-2xl font-black text-zinc-900">{value}</p>
        </div>
      </div>
      <p className="mt-2 text-sm font-medium text-zinc-500">{detail}</p>
    </div>
  );
}

function PilotMiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
      <p className="text-xs font-semibold uppercase text-zinc-500">{label}</p>
      <p className="mt-1 truncate text-lg font-black text-zinc-900">{value}</p>
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
        <p className="mt-1 text-sm text-zinc-500">
          {label}
        </p>
      </div>
    </div>
  );
}

function PilotDrawer({
  mode,
  pilot,
  clubs,
  showDeleteModal,
}: {
  mode: string | undefined;
  pilot?: {
    id: number;
    firstname: string;
    lastname: string | null;
    nickname: string | null;
    email: string;
    role: string;
    phone: string | null;
    active: boolean;
    clubId: number | null;
  } | null;
  clubs: {
    id: number;
    name: string;
    default: string | null;
  }[];
  showDeleteModal: boolean;
}) {
  const isEdit = mode === "edit";
  const defaultClub = clubs.find((club) => club.default);
  const selectedClubId = pilot?.clubId ?? defaultClub?.id ?? "";

  return (
    <DismissibleDrawer>
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm">
      <DrawerCloseButton className="flex-1" ariaLabel="Fermer le volet" />

      <aside className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-pink-500">
              {isEdit ? "Modification" : "Création"}
            </p>
            <h2 className="mt-1 text-2xl font-black text-zinc-900">
              {isEdit ? "Modifier le pilote" : "Ajouter un pilote"}
            </h2>
            {pilot && (
              <span
                className={`${getPilotRoleClassName(pilot.role)} mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset`}
              >
                {formatPilotRole(pilot.role)}
              </span>
            )}
          </div>

          <DrawerCloseButton
            className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:border-pink-500 hover:text-pink-600"
          >
            Fermer
          </DrawerCloseButton>
        </div>

        {isEdit && !pilot ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Pilote introuvable.
          </div>
        ) : (
          <form action={savePilot} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <PilotField
                label="Prénom"
                name="firstname"
                defaultValue={pilot?.firstname}
                required
              />
              <PilotField
                label="Nom"
                name="lastname"
                defaultValue={pilot?.lastname ?? undefined}
              />
            </div>

            <PilotField
              label="Pseudo"
              name="nickname"
              defaultValue={pilot?.nickname ?? undefined}
            />

            <PilotField
              label="Email"
              name="email"
              type="email"
              defaultValue={pilot?.email ?? undefined}
              required
            />

            <PilotField
              label="Téléphone"
              name="phone"
              defaultValue={pilot?.phone ?? undefined}
            />

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-zinc-700">
                Rôle
              </span>
              <select
                name="role"
                defaultValue={pilot?.role ?? "visiteur"}
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
              >
                <option value="admin">Admin</option>
                <option value="adherent">Adhérent</option>
                <option value="visiteur">Visiteur</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-zinc-700">
                Club
              </span>
              <select
                name="clubId"
                defaultValue={selectedClubId}
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
              >
                <option value="">Aucun club</option>
                {clubs.map((club) => (
                  <option key={club.id} value={club.id}>
                    {club.name}{club.default ? " — par défaut" : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
              <span>
                <span className="block text-sm font-semibold text-zinc-900">Pilote actif</span>
                <span className="text-xs text-zinc-500">Visible dans les inscriptions de course</span>
              </span>
              <input
                type="checkbox"
                name="active"
                defaultChecked={pilot?.active ?? true}
                className="h-5 w-5 rounded border-zinc-300 text-pink-500 focus:ring-pink-500"
              />
            </label>
            {pilot && (

                <input
                    type="hidden"
                    name="id"
                    value={pilot.id}
                />
            )}
            <div className="flex items-center justify-between gap-3 border-t border-zinc-100 pt-5">
              {pilot ? (
                <Link
                  href={`/pilots?drawer=edit&pilotId=${pilot.id}&confirmDelete=1`}
                  className="rounded-md border border-red-200 bg-red-50 px-4 py-2 font-semibold text-red-600 transition hover:bg-red-100"
                >
                  Supprimer
                </Link>
              ) : (
                <span />
              )}

              <div className="flex gap-3">
                <Link
                  href="/pilots"
                  className="rounded-md border border-zinc-200 px-4 py-2 font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
                >
                  Annuler
                </Link>
                <button
                  type="submit"
                  className="rounded-md bg-gradient-to-r from-pink-500 to-yellow-400 px-4 py-2 font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  {isEdit ? "Enregistrer" : "Créer le pilote"}
                </button>
              </div>
            </div>
          </form>
        )}
      </aside>

      {showDeleteModal && pilot && <DeletePilotModal pilot={pilot} />}
    </div>
    </DismissibleDrawer>
  );
}

function PilotField({
  label,
  name,
  type = "text",
  defaultValue,
  required = false,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
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
        className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
      />
    </label>
  );
}

function DeletePilotModal({
  pilot,
}: {
  pilot: {
    id: number;
    firstname: string;
    lastname: string | null;
    nickname: string | null;
  };
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-red-500">
          Suppression
        </p>
        <h3 className="mt-1 text-2xl font-black text-zinc-900">
          Supprimer ce pilote ?
        </h3>
        <p className="mt-3 text-sm text-zinc-600">
          Tu vas supprimer définitivement le pilote{" "}
          <span className="font-semibold text-zinc-900">
            {getPilotDisplayName(pilot)}
          </span>
          . Cette action sera enregistrée dans les logs.
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <Link
            href={`/pilots?drawer=edit&pilotId=${pilot.id}`}
            className="rounded-md border border-zinc-200 px-4 py-2 font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
          >
            Annuler
          </Link>

          <form action={deletePilot}>
            <input type="hidden" name="id" value={pilot.id} />
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
