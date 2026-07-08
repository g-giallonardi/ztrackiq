import Link from "next/link";
import Image from "next/image";
import { Car, Flag, Trophy, Users, Wrench } from "lucide-react";
import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type CountRow = {
  count: number | bigint;
};

type AuditPayload = {
  name?: unknown;
  firstname?: unknown;
  lastname?: unknown;
  nickname?: unknown;
};

type RaceSummaryRow = {
  totalResults: number | bigint | null;
  totalLaps: number | bigint | null;
  averageLaps: number | null;
  bestLapMs: number | null;
};

function readCount(rows: CountRow[]) {
  return Number(rows[0]?.count ?? 0);
}

function readMetric(value: number | bigint | null | undefined) {
  return Number(value ?? 0);
}

function asAuditPayload(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as AuditPayload)
    : null;
}

function formatEntityValue(after: unknown, before: unknown) {
  const payload = asAuditPayload(after) ?? asAuditPayload(before);

  if (!payload) return "Élément supprimé";

  if (typeof payload.name === "string" && payload.name) {
    return payload.name;
  }

  if (typeof payload.nickname === "string" && payload.nickname) {
    return payload.nickname;
  }

  const fullName = [payload.firstname, payload.lastname]
    .filter((part): part is string => typeof part === "string" && Boolean(part))
    .join(" ");

  return fullName || "Élément modifié";
}

function getActivityConfig(entity: string, action: string) {
  const entityConfig = {
    Pilot: {
      label: "Pilote",
      color: "bg-pink-500",
      icon: <Users size={16} />,
    },
    Car: {
      label: "Voiture",
      color: "bg-cyan-500",
      icon: <Car size={16} />,
    },
    Race: {
      label: "Course",
      color: "bg-yellow-400",
      icon: <Flag size={16} />,
    },
    Championship: {
      label: "Championnat",
      color: "bg-purple-600",
      icon: <Trophy size={16} />,
    },
    Spec: {
      label: "Pièce",
      color: "bg-zinc-700",
      icon: <Wrench size={16} />,
    },
  }[entity] ?? {
    label: entity,
    color: "bg-zinc-700",
    icon: <Wrench size={16} />,
  };

  const actionLabel = {
    CREATE: "créé",
    UPDATE: "modifié",
    DELETE: "supprimé",
    DISABLE: "désactivé",
  }[action] ?? action.toLowerCase();

  return {
    ...entityConfig,
    activity: `${entityConfig.label} ${actionLabel}`,
  };
}

function getActivityLink(
  entity: string,
  entityId: number | null,
  action: string,
  canManage: boolean,
) {
  const sectionLink = {
    Pilot: "/pilots",
    Car: "/cars",
    Race: "/races",
    Championship: "/championships",
    Spec: "/carparts",
  }[entity] ?? "/";

  if (!entityId || action === "DELETE") {
    return sectionLink;
  }

  if (!canManage) {
    return {
      Race: `/races?detailsRaceId=${entityId}`,
      Championship: `/championships?detailsChampionshipId=${entityId}`,
    }[entity] ?? sectionLink;
  }

  return {
    Pilot: `/pilots?drawer=edit&pilotId=${entityId}`,
    Car: `/cars?drawer=edit&carId=${entityId}`,
    Race: `/races?detailsRaceId=${entityId}`,
    Championship: `/championships?detailsChampionshipId=${entityId}`,
    Spec: `/carparts?drawer=edit&specId=${entityId}`,
  }[entity] ?? sectionLink;
}

function formatRelativeDate(date: Date, now: Date) {
  const diffSeconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const absoluteSeconds = Math.abs(diffSeconds);
  const formatter = new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" });

  if (absoluteSeconds < 60) {
    return formatter.format(diffSeconds, "second");
  }

  const diffMinutes = Math.round(diffSeconds / 60);
  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);
  return formatter.format(diffDays, "day");
}

export default async function HomePage() {
  const currentUser = await requireCurrentUser();
  const canManage = currentUser.role === "admin";

  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const startOfNextYear = new Date(now.getFullYear() + 1, 0, 1);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [
    activePilots,
    inactivePilots,
    registeredCars,
    carChipsRows,
    trackCount,
    specCount,
    seasonRacesRows,
    monthRacesRows,
    upcomingRacesRows,
    openChampionshipsRows,
    raceSummaryRows,
    recentActivities,
  ] = await Promise.all([
    prisma.pilot.count({ where: { active: true } }),
    prisma.pilot.count({ where: { active: false } }),
    prisma.car.count(),
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*)::int AS count
      FROM "Car"
      WHERE "chipId" IS NOT NULL
    `,
    prisma.track.count(),
    prisma.spec.count(),
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*)::int AS count
      FROM "Race"
      WHERE "raceDate" >= ${startOfYear}
        AND "raceDate" < ${startOfNextYear}
    `,
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*)::int AS count
      FROM "Race"
      WHERE "raceDate" >= ${startOfMonth}
        AND "raceDate" < ${startOfNextMonth}
    `,
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*)::int AS count
      FROM "Race"
      WHERE "raceDate" >= ${now}
    `,
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*)::int AS count
      FROM "Championship"
      WHERE "startDate" <= ${now}
        AND ("endDate" IS NULL OR "endDate" >= ${now})
    `,
    prisma.$queryRaw<RaceSummaryRow[]>`
      SELECT
        COUNT(*)::int AS "totalResults",
        COALESCE(SUM("laps"), 0)::int AS "totalLaps",
        AVG("laps")::float AS "averageLaps",
        MIN("bestLapMs")::int AS "bestLapMs"
      FROM "RaceResult"
    `,
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const seasonRaces = readCount(seasonRacesRows);
  const monthRaces = readCount(monthRacesRows);
  const upcomingRaces = readCount(upcomingRacesRows);
  const openChampionships = readCount(openChampionshipsRows);
  const carChips = readCount(carChipsRows);
  const raceSummary = raceSummaryRows[0];
  const totalLaps = readMetric(raceSummary?.totalLaps);
  const averageLaps = Math.floor(raceSummary?.averageLaps ?? 0);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <section className="relative overflow-hidden bg-zinc-100">
        <Image
          src="/images/banner.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="relative flex min-h-56 flex-col justify-end gap-4 p-4 md:min-h-72 md:p-6">
          <div className="flex flex-wrap justify-end gap-2">
            <QuickAction href="/races" icon={<Flag size="17" />} label="Courses" />
            <QuickAction href="/me" icon={<Users size="17" />} label="Mon profil" />
            {canManage && (
              <QuickAction
                href="/races?drawer=add"
                icon={<Trophy size="17" />}
                label="Nouvelle course"
              />
            )}
          </div>
        </div>
      </section>

      <div className="p-4">
        <div className="mb-4">
          <p className="text-xs font-black uppercase tracking-wide text-pink-500">
            ZTrackIQ
          </p>
          <h1 className="mt-1 text-2xl font-black md:text-3xl">
            Tableau de bord
          </h1>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <section className="rounded-md border border-zinc-200 bg-white">
            <div className="border-b border-zinc-100 px-4 py-3">
              <h2 className="text-sm font-black uppercase tracking-wide text-zinc-700">
                Accès rapides
              </h2>
            </div>
            <div className="grid divide-y divide-zinc-100 md:grid-cols-2 md:divide-x md:divide-y-0">
              <QuickLink
                href="/pilots"
                icon={<Users size="19" />}
                title="Pilotes"
                detail="Listing et fiches pilotes"
              />
              <QuickLink
                href="/cars"
                icon={<Car size="19" />}
                title="Voitures"
                detail="Garage Mini-Z"
              />
              <QuickLink
                href="/races"
                icon={<Flag size="19" />}
                title="Courses"
                detail="Sessions et résultats"
              />
              <QuickLink
                href="/championships"
                icon={<Trophy size="19" />}
                title="Championnats"
                detail="Classements et podiums"
              />
            </div>
          </section>

          <section className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
            <h2 className="text-sm font-black uppercase tracking-wide text-zinc-700">
              Résumé
            </h2>
            <div className="mt-3 space-y-2 text-sm text-zinc-600">
              <StatusLine
                label="Pilotes"
                value={`${activePilots} actifs · ${inactivePilots} inactifs`}
              />
              <StatusLine
                label="Courses"
                value={`${monthRaces} ce mois · ${upcomingRaces} à venir`}
              />
              <StatusLine label="Saison" value={`${seasonRaces} course${seasonRaces > 1 ? "s" : ""}`} />
              <StatusLine
                label="Championnat"
                value={openChampionships > 0 ? `${openChampionships} ouvert${openChampionships > 1 ? "s" : ""}` : "Aucun ouvert"}
              />
              <StatusLine label="Garage" value={`${registeredCars} Mini-Z · ${carChips} puces`} />
              <StatusLine label="Technique" value={`${trackCount} circuits · ${specCount} pièces`} />
              <StatusLine label="Rythme" value={`${totalLaps} tours · moy. ${averageLaps}`} />
            </div>
          </section>
        </div>

        <section className="mt-4 rounded-md border border-zinc-200 bg-white">
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
            <h2 className="text-sm font-black uppercase tracking-wide text-zinc-700">
              Activités récentes
            </h2>
            <span className="text-xs font-medium text-zinc-400">
              {recentActivities.length} entrée{recentActivities.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="divide-y divide-zinc-100">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity) => {
                const config = getActivityConfig(activity.entity, activity.action);
                const value = formatEntityValue(activity.after, activity.before);

                return (
                  <LastActivityCard
                    key={activity.id}
                    link={getActivityLink(
                      activity.entity,
                      activity.entityId,
                      activity.action,
                      canManage,
                    )}
                    icon={config.icon}
                    color={config.color}
                    activity={config.activity}
                    value={value}
                    date={formatRelativeDate(activity.createdAt, now)}
                  />
                );
              })
            ) : (
              <div className="p-4 text-sm text-zinc-500">
                Aucune activité récente.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-md border border-white/70 bg-white/85 px-3 py-2 text-sm font-semibold text-zinc-900 backdrop-blur transition hover:border-pink-300 hover:text-pink-600"
    >
      {icon}
      {label}
    </Link>
  );
}

function QuickLink({
  href,
  icon,
  title,
  detail,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <Link href={href} className="flex items-center gap-3 p-4 transition hover:bg-zinc-50">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-700">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="font-black text-zinc-900">{title}</p>
        <p className="text-sm text-zinc-500">{detail}</p>
      </div>
    </Link>
  );
}

function StatusLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2">
      <span>{label}</span>
      <span className="font-semibold text-zinc-900">{value}</span>
    </div>
  );
}

function LastActivityCard({
  icon,
  activity,
  value,
  date,
  link,
  color,
}: {
  icon: React.ReactNode;
  activity: string;
  value: string;
  date: string;
  link: string;
  color: string;
}) {
  return (
    <Link href={link} className="block px-4 py-3 transition hover:bg-zinc-50">
      <div className="flex items-center gap-3">
        <div className={`${color} flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-900">
            {activity}
            <span className="font-normal text-zinc-500"> · {value}</span>
          </p>
        </div>
        <p className="shrink-0 text-xs font-semibold text-zinc-400">{date}</p>
      </div>
    </Link>
  );
}
