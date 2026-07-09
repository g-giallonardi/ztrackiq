import {
  Activity,
  Flag,
  Gauge,
  LockKeyhole,
  Medal,
  Phone,
  Save,
  Trophy,
  User,
} from "lucide-react";
import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { changeMyPassword, updateMyProfile } from "./actions";

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
  raceCount: number | bigint;
  bestResult: number | null;
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

export default async function MePage({
  searchParams,
}: {
  searchParams?: Promise<{
    saved?: string;
    passwordSaved?: string;
    passwordError?: string;
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

  const [statsRows, recentResults, cars, clubs] =
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
      prisma.$queryRaw<CarRow[]>`
        SELECT
          "Car"."id",
          "Car"."name",
          COUNT("RaceResult"."id")::int AS "raceCount",
          MIN("RaceResult"."position")::int AS "bestResult"
        FROM "Car"
        LEFT JOIN "RaceResult" ON "RaceResult"."carId" = "Car"."id"
        WHERE "Car"."pilotId" = ${user.id}
        GROUP BY "Car"."id", "Car"."name", "Car"."createdAt"
        ORDER BY "Car"."createdAt" ASC, "Car"."name" ASC
      `,
      prisma.club.findMany({
        orderBy: [{ default: "desc" }, { name: "asc" }],
      }),
    ]);

  const stats = statsRows[0];
  const races = readNumber(stats?.races);
  const wins = readNumber(stats?.wins);
  const podiums = readNumber(stats?.podiums);
  const podiumRate = races > 0 ? Math.round((podiums / races) * 100) : 0;

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
            <h3 className="mb-2 text-sm font-black uppercase text-zinc-600">
              Mes voitures
            </h3>
            <div className="grid gap-2 md:grid-cols-2">
              {cars.map((car) => (
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

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-pink-500 to-yellow-400 px-4 py-2 font-black uppercase text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <Save size="18" />
                Enregistrer
              </button>
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

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-purple-600 px-4 py-2 font-black uppercase text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-purple-700 hover:shadow-md"
              >
                <LockKeyhole size="18" />
                Changer le mot de passe
              </button>
            </form>
          </section>
        </div>
      </div>
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
