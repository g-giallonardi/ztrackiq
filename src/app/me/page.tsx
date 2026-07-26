import {
  Activity,
  Flag,
  Gauge,
  LockKeyhole,
  Medal,
  Phone,
  Plus,
  Save,
  Trophy,
  User,
} from "lucide-react";
import Link from "next/link";
import {
  DismissibleDrawer,
  DrawerCloseButton,
} from "@/components/DismissibleDrawer";
import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatBestLap, formatPiClass, getCarTotalPi } from "@/lib/racing";
import { SubmitButton } from "@/components/SubmitButton";
import {
  changeMyPassword,
  deleteMyCar,
  saveMyCar,
  updateMyProfile,
} from "./actions";

type PilotProfile = {
  id: number;
  firstname: string;
  lastname: string | null;
  nickname: string | null;
  email: string;
  phone: string | null;
  role: string;
  clubId: number | null;
  clubName: string | null;
  createdAt: Date;
};

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

type CarRow = {
  id: number;
  name: string;
  chipId: string | null;
  specs: {
    specId: number;
    spec: {
      id: number;
      name: string;
      piValue: number;
      categoryId: number;
      category: {
        id: number;
        name: string;
      };
    };
  }[];
  raceResults: {
    position: number;
  }[];
};

function formatPilotDisplayName(pilot: {
  firstname: string;
  lastname: string | null;
  nickname: string | null;
}) {
  return pilot.nickname || pilot.firstname;
}

function formatRole(role: string) {
  return role === "admin"
    ? "Admin"
    : role === "adherent"
      ? "Adhérent"
      : "Visiteur";
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function readNumber(value: number | bigint | null | undefined) {
  return Number(value ?? 0);
}

export default async function MePage({
  searchParams,
}: {
  searchParams?: Promise<{
    saved?: string;
    passwordSaved?: string;
    passwordError?: string;
    carSaved?: string;
    carDeleted?: string;
    drawer?: string;
    carId?: string;
    confirmDelete?: string;
  }>;
}) {
  const user = await requireCurrentUser();
  const params = await searchParams;

  const [pilot] = await prisma.$queryRaw<PilotProfile[]>`
    SELECT
      "Pilot"."id",
      "Pilot"."firstname",
      "Pilot"."lastname",
      "Pilot"."nickname",
      "Pilot"."email",
      "Pilot"."phone",
      "Pilot"."role"::text AS "role",
      "Pilot"."clubId",
      "Pilot"."createdAt",
      "Club"."name" AS "clubName"
    FROM "Pilot"
    LEFT JOIN "Club" ON "Club"."id" = "Pilot"."clubId"
    WHERE "Pilot"."id" = ${user.id}
  `;

  if (!pilot) {
    throw new Error("Pilote introuvable");
  }

  const [statsRows, recentResults, cars, clubs, specCategories] =
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
        WHERE "pilotId" = ${user.id}
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
        WHERE "RaceResult"."pilotId" = ${user.id}
        ORDER BY "Race"."raceDate" DESC, "Race"."createdAt" DESC
        LIMIT 5
      `,
      prisma.car.findMany({
        where: { pilotId: user.id },
        include: {
          specs: {
            include: {
              spec: {
                include: {
                  category: true,
                },
              },
            },
          },
          raceResults: {
            select: {
              position: true,
            },
          },
        },
        orderBy: [{ createdAt: "asc" }, { name: "asc" }],
      }),
      prisma.club.findMany({
        orderBy: [{ default: "desc" }, { name: "asc" }],
      }),
      prisma.specCategory.findMany({
        include: {
          specs: {
            orderBy: [{ piValue: "asc" }, { name: "asc" }],
          },
        },
        orderBy: { name: "asc" },
      }),
    ]);

  const stats = statsRows[0];
  const races = readNumber(stats?.races);
  const wins = readNumber(stats?.wins);
  const podiums = readNumber(stats?.podiums);
  const podiumRate = races > 0 ? Math.round((podiums / races) * 100) : 0;
  const drawerMode = params?.drawer;
  const selectedCarId = params?.carId ? Number(params.carId) : null;
  const selectedCar = selectedCarId
    ? cars.find((car) => car.id === selectedCarId)
    : null;
  const isCarDrawerOpen = drawerMode === "add" || drawerMode === "edit";
  const isDeleteModalOpen =
    drawerMode === "edit" && params?.confirmDelete === "1";

  return (
    <div className="m-2 rounded bg-white p-2 text-gray-900">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="my-2 flex flex-row gap-2 text-5xl">
            <p className="rounded bg-pink-100 p-2 text-pink-500">
              <User size="30" />
            </p>
            <p className="self-end">Mon profil</p>
          </div>
          <p>
            {formatPilotDisplayName(pilot)} · {formatRole(pilot.role)}
            {pilot.clubName ? ` · ${pilot.clubName}` : ""}
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-right">
          <p className="text-xs font-semibold uppercase text-zinc-500">
            Membre depuis
          </p>
          <p className="font-black text-zinc-900">{formatDate(pilot.createdAt)}</p>
        </div>
      </div>

      {params?.saved === "1" && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
          Profil mis à jour.
        </div>
      )}
      {params?.passwordSaved === "1" && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
          Mot de passe mis à jour.
        </div>
      )}
      {params?.carSaved === "1" && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
          Voiture enregistrée.
        </div>
      )}
      {params?.carDeleted === "1" && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
          Voiture supprimée.
        </div>
      )}
      {params?.passwordError && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {getPasswordErrorMessage(params.passwordError)}
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-4">
        <StatCard
          icon={<Flag />}
          label="Courses"
          value={races.toString()}
          detail={`${wins} victoire${wins > 1 ? "s" : ""}`}
          color="bg-pink-100 text-pink-600"
        />
        <StatCard
          icon={<Medal />}
          label="Podiums"
          value={podiums.toString()}
          detail={`${podiumRate}% des courses`}
          color="bg-yellow-100 text-yellow-700"
        />
        <StatCard
          icon={<Activity />}
          label="Tours"
          value={readNumber(stats?.totalLaps).toString()}
          detail={`${Math.floor(stats?.averageLaps ?? 0)} en moyenne`}
          color="bg-cyan-100 text-cyan-700"
        />
        <StatCard
          icon={<Gauge />}
          label="Meilleur tour"
          value={formatBestLap(stats?.bestLapMs)}
          detail={`Moy. ${formatBestLap(
            stats?.averageBestLapMs ? Math.round(stats.averageBestLapMs) : null,
          )}`}
          color="bg-purple-100 text-purple-700"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_420px]">
        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Trophy className="text-pink-500" size="20" />
            <h2 className="text-lg font-black text-zinc-900">
              Statistiques pilote
            </h2>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <MiniStat label="Meilleure place" value={stats?.bestPosition ? `P${stats.bestPosition}` : "-"} />
            <MiniStat label="Voitures" value={cars.length.toString()} />
          </div>

          <div className="mt-5">
            <h3 className="mb-2 text-sm font-black uppercase text-zinc-600">
              Dernières courses
            </h3>
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
                  {recentResults.map((result) => (
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
                  {recentResults.length === 0 && (
                    <tr>
                      <td className="px-3 py-6 text-center text-zinc-500" colSpan={4}>
                        Aucune course enregistrée.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-sm font-black uppercase text-zinc-600">
                Mes voitures
              </h3>
              <Link
                href="/me?drawer=add"
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-zinc-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-pink-600 sm:w-auto"
              >
                <Plus size="16" />
                Ajouter une voiture
              </Link>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {cars.map((car) => {
                const raceCount = car.raceResults.length;
                const bestResult =
                  car.raceResults.length > 0
                    ? Math.min(...car.raceResults.map((result) => result.position))
                    : null;
                const piValue = getCarTotalPi(car);

                return (
                  <Link
                    key={car.id}
                    href={`/me?drawer=edit&carId=${car.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 transition hover:border-pink-400 hover:bg-white"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-zinc-900">
                        {car.name}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {raceCount} course{raceCount > 1 ? "s" : ""}
                        {car.chipId ? ` · ${car.chipId}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <PiBadge rank={formatPiClass(piValue)} value={piValue} />
                      <p className="text-sm font-black text-purple-600">
                        {bestResult ? `P${bestResult}` : "-"}
                      </p>
                    </div>
                  </Link>
                );
              })}
              {cars.length === 0 && (
                <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-500">
                  Aucune voiture associée.
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="space-y-4">
          <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Phone className="text-pink-500" size="20" />
              <h2 className="text-lg font-black text-zinc-900">
                Informations personnelles
              </h2>
            </div>

            <form action={updateMyProfile} className="space-y-4">
              <ProfileField
                label="Prénom"
                name="firstname"
                defaultValue={pilot.firstname}
                required
              />
              <ProfileField
                label="Nom"
                name="lastname"
                defaultValue={pilot.lastname ?? ""}
              />
              <ProfileField
                label="Surnom"
                name="nickname"
                defaultValue={pilot.nickname ?? ""}
              />
              <ProfileField
                label="Email"
                name="email"
                type="email"
                defaultValue={pilot.email}
                required
              />
              <ProfileField
                label="Téléphone"
                name="phone"
                type="tel"
                defaultValue={pilot.phone ?? ""}
              />

              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-zinc-700">
                  Club
                </span>
                <select
                  name="clubId"
                  defaultValue={pilot.clubId ?? ""}
                  className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                >
                  <option value="">Aucun club</option>
                  {clubs.map((club) => (
                    <option key={club.id} value={club.id}>
                      {club.name}
                    </option>
                  ))}
                </select>
              </label>

              <SubmitButton className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-pink-500 to-yellow-400 px-4 py-2 font-black uppercase text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-wait disabled:opacity-75 disabled:hover:translate-y-0">
                <Save size="18" />
                Enregistrer
              </SubmitButton>
            </form>
          </section>

          <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <LockKeyhole className="text-purple-600" size="20" />
              <h2 className="text-lg font-black text-zinc-900">
                Sécurité
              </h2>
            </div>

            <form action={changeMyPassword} className="space-y-4">
              <ProfileField
                label="Mot de passe actuel"
                name="currentPassword"
                type="password"
                defaultValue=""
                required
              />
              <ProfileField
                label="Nouveau mot de passe"
                name="newPassword"
                type="password"
                defaultValue=""
                required
              />
              <ProfileField
                label="Confirmer"
                name="confirmPassword"
                type="password"
                defaultValue=""
                required
              />

              <SubmitButton
                pendingLabel="Changement..."
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-purple-600 px-4 py-2 font-black uppercase text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-purple-700 hover:shadow-md disabled:cursor-wait disabled:opacity-75 disabled:hover:translate-y-0"
              >
                <LockKeyhole size="18" />
                Changer le mot de passe
              </SubmitButton>
            </form>
          </section>
        </div>
      </div>

      {isCarDrawerOpen && (
        <MyCarDrawer
          key={`${drawerMode}-${selectedCarId ?? "new"}`}
          mode={drawerMode}
          car={selectedCar}
          specCategories={specCategories}
          showDeleteModal={isDeleteModalOpen}
        />
      )}
    </div>
  );
}

function getPasswordErrorMessage(error: string) {
  return error === "current"
    ? "Mot de passe actuel incorrect."
    : error === "mismatch"
      ? "La confirmation ne correspond pas au nouveau mot de passe."
      : error === "short"
        ? "Le nouveau mot de passe doit faire au moins 8 caractères."
        : "Impossible de changer le mot de passe.";
}

function StatCard({
  icon,
  label,
  value,
  detail,
  color,
}: {
  icon: React.ReactNode;
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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
      <p className="text-xs font-semibold uppercase text-zinc-500">{label}</p>
      <p className="mt-1 truncate text-lg font-black text-zinc-900">{value}</p>
    </div>
  );
}

function PiBadge({ rank, value }: { rank: string; value: number }) {
  const color =
    rank === "X"
      ? "border-purple-500 bg-purple-500"
      : rank === "S"
        ? "border-red-500 bg-red-500"
        : rank === "A"
          ? "border-blue-500 bg-blue-500"
          : rank === "B"
            ? "border-yellow-500 bg-yellow-500"
            : "border-zinc-500 bg-zinc-500";

  return (
    <span className={`inline-flex overflow-hidden rounded border text-[10px] font-black ${color}`}>
      <span className="px-1 text-white">{rank}</span>
      <span className="bg-white px-1 text-zinc-900">{Math.round(value)}</span>
    </span>
  );
}

function MyCarDrawer({
  mode,
  car,
  specCategories,
  showDeleteModal,
}: {
  mode: string | undefined;
  car?: CarRow | null;
  specCategories: {
    id: number;
    name: string;
    specs: {
      id: number;
      name: string;
      piValue: number;
    }[];
  }[];
  showDeleteModal: boolean;
}) {
  const isEdit = mode === "edit";

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
                {isEdit ? "Modifier ma voiture" : "Ajouter une voiture"}
              </h2>
            </div>

            <DrawerCloseButton className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:border-pink-500 hover:text-pink-600">
              Fermer
            </DrawerCloseButton>
          </div>

          {isEdit && !car ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Voiture introuvable.
            </div>
          ) : (
            <form action={saveMyCar} className="space-y-5">
              <ProfileField
                label="Nom"
                name="name"
                defaultValue={car?.name ?? ""}
                required
              />

              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-zinc-900">Améliorations</p>
                    <p className="text-xs text-zinc-500">
                      Une spec par catégorie, le PI est calculé depuis ces choix.
                    </p>
                  </div>
                  <div className="rounded-md bg-white p-2 text-pink-500 shadow-sm">
                    <Gauge size="20" />
                  </div>
                </div>

                <div className="space-y-3">
                  {specCategories.length === 0 && (
                    <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-4 text-sm text-zinc-500">
                      Aucune amélioration disponible.
                    </div>
                  )}

                  {specCategories.map((category) => {
                    const selectedSpecId = car?.specs.find(
                      (carSpec) => carSpec.spec.categoryId === category.id,
                    )?.specId;

                    return (
                      <label key={category.id} className="block">
                        <span className="mb-1 block text-sm font-semibold text-zinc-700">
                          {category.name}
                        </span>
                        <select
                          name="specIds"
                          defaultValue={selectedSpecId ?? ""}
                          className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                        >
                          <option value="">Stock / aucune</option>
                          {category.specs.map((spec) => (
                            <option key={spec.id} value={spec.id}>
                              {spec.name} ({spec.piValue >= 0 ? "+" : ""}
                              {spec.piValue} PI)
                            </option>
                          ))}
                        </select>
                      </label>
                    );
                  })}
                </div>

                <div className="mt-4 rounded-lg border border-dashed border-pink-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Classe PI actuelle
                  </p>
                  <p className="mt-1 text-3xl font-black text-pink-500">
                    {car
                      ? formatPiClass(getCarTotalPi(car))
                      : "Calculée à l’enregistrement"}
                  </p>
                </div>
              </div>

              <ProfileField
                label="Puce de comptage"
                name="chipId"
                defaultValue={car?.chipId ?? ""}
              />

              {car && <input type="hidden" name="id" value={car.id} />}

              <div className="flex items-center justify-between gap-3 border-t border-zinc-100 pt-5">
                {car ? (
                  <Link
                    href={`/me?drawer=edit&carId=${car.id}&confirmDelete=1`}
                    className="rounded-md border border-red-200 bg-red-50 px-4 py-2 font-semibold text-red-600 transition hover:bg-red-100"
                  >
                    Supprimer
                  </Link>
                ) : (
                  <span />
                )}

                <div className="flex gap-3">
                  <Link
                    href="/me"
                    className="rounded-md border border-zinc-200 px-4 py-2 font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
                  >
                    Annuler
                  </Link>
                  <SubmitButton>
                    {isEdit ? "Enregistrer" : "Créer la voiture"}
                  </SubmitButton>
                </div>
              </div>
            </form>
          )}
        </aside>

        {showDeleteModal && car && <DeleteMyCarModal car={car} />}
      </div>
    </DismissibleDrawer>
  );
}

function DeleteMyCarModal({ car }: { car: { id: number; name: string } }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-red-500">
          Suppression
        </p>
        <h3 className="mt-1 text-2xl font-black text-zinc-900">
          Supprimer cette voiture ?
        </h3>
        <p className="mt-3 text-sm text-zinc-600">
          Tu vas supprimer définitivement{" "}
          <span className="font-semibold text-zinc-900">{car.name}</span>.
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <Link
            href={`/me?drawer=edit&carId=${car.id}`}
            className="rounded-md border border-zinc-200 px-4 py-2 font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
          >
            Annuler
          </Link>

          <form action={deleteMyCar}>
            <input type="hidden" name="id" value={car.id} />
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

function ProfileField({
  label,
  name,
  type = "text",
  defaultValue,
  required = false,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue: string;
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
        className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
      />
    </label>
  );
}
