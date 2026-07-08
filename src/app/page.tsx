import Link from "next/link";
import { Users, Car, Trophy, Flag, Wrench } from "lucide-react";
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

function readCount(rows: CountRow[]) {
  return Number(rows[0]?.count ?? 0);
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
      icon: <Users size={22} />,
    },
    Car: {
      label: "Voiture",
      color: "bg-cyan-400",
      icon: <Car size={22} />,
    },
    Race: {
      label: "Course",
      color: "bg-yellow-300",
      icon: <Flag size={22} />,
    },
    Championship: {
      label: "Championnat",
      color: "bg-purple-600",
      icon: <Trophy size={22} />,
    },
    Spec: {
      label: "Pièce",
      color: "bg-zinc-700",
      icon: <Wrench size={22} />,
    },
  }[entity] ?? {
    label: entity,
    color: "bg-zinc-700",
    icon: <Wrench size={22} />,
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

  const [
    activePilots,
    registeredCars,
    seasonRacesRows,
    openChampionshipsRows,
    recentActivities,
  ] = await Promise.all([
    prisma.pilot.count({ where: { active: true } }),
    prisma.car.count(),
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*)::int AS count
      FROM "Race"
      WHERE "raceDate" >= ${startOfYear}
        AND "raceDate" < ${startOfNextYear}
    `,
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*)::int AS count
      FROM "Championship"
      WHERE "startDate" <= ${now}
        AND ("endDate" IS NULL OR "endDate" >= ${now})
    `,
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const seasonRaces = readCount(seasonRacesRows);
  const openChampionships = readCount(openChampionshipsRows);

  return (
    <div>
      <section className="relative overflow-hidden shadow-2xl h-[450px]">

        {/* Image */}
        <img
          src="/images/banner.png"
          alt="Banner"
          className="absolute inset-0 h-full w-full object-cover"
        />


        {/* Contenu */}
        <div className="relative z-10 flex h-full items-center p-10">
          <div className="max-w-3xl h-full flex flex-col-reverse justify-items-end">

            <div className="mt-8 flex gap-4">
              <Link
                href="/pilots"
                className="rounded-xl bg-pink-500 px-6 py-3 font-black uppercase transition hover:scale-105"
              >
                Gérer les pilotes
              </Link>

              <Link
                href="/races"
                className="rounded-xl bg-yellow-300 px-6 py-3 font-black uppercase text-black transition hover:scale-105"
              >
                Nouvelle course
              </Link>
            </div>
          </div>
        </div>

      </section>

      <div className="grid lg:grid-cols-[2fr_1fr] gap-3">
        <div className="bg-white pt-2 px-2 rounded-2xl h-full">
          <section className="grid gap-1 md:grid-cols-4 ">
          <StatCard label="Pilotes" sublabel='actifs' value={activePilots.toString()} color="bg-pink-500" icon={<Users size={70} />} />
          <StatCard label="Voitures" sublabel='enregistrées' value={registeredCars.toString()} color="bg-cyan-400"  icon={<Car size={70} />} />
          <StatCard label="Courses" sublabel='cette saison' value={seasonRaces.toString()} color="bg-yellow-300" dark  icon={<Flag size={70} />} />
          <StatCard label="Championnats" sublabel='en cours' value={openChampionships.toString()} color="bg-purple-600"  icon={<Trophy size={70} />} />
          </section>

          <div className="uppercase text-black text-xl font-black mt-3">
              Accès rapide
          </div>

          <section className="grid gap-6 lg:grid-cols-4">
            <QuickCard
              href="/pilots"
              title="Pilotes"
              subtitle="Gérer les pilotes"
              img="/images/helmet.png"
            />
            <QuickCard
              href="/cars"
              title="Voitures"
              subtitle="Gérer les voitures"
              img="/images/car.png"
            />
            <QuickCard
              href="/races"
              title="Courses"
              subtitle="Gérer/Créer"
              img="/images/track.png"
            />
            <QuickCard
              href="/races"
              title="Championnat"
              subtitle="Voir les championats"
              img="/images/trophy.png"
            />
          </section>

          <div className="uppercase text-black text-xl font-black mt-3">
              Activités récentes
          </div>
          <div className="space-y-2">
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
              <div className="rounded-2xl border border-zinc-200 bg-white p-3 text-sm font-medium text-zinc-500 shadow-xl">
                Aucune activité récente
              </div>
            )}
          </div>
        </div>

        <div className="bg-white px-4 px-2 rounded-2xl my-auto">
          <div className="uppercase text-black text-xl font-black mt-3">
              Prochain événement
          </div>
          <div className="flex justify-items-center flex-col mt-3">
            <div className="justify-items-center">
              <img src="/images/next-event.png" className="max-h-50 w-auto" />
            </div>
            <div className="px-6 mb-6">
              <h3 className="text-black font-black uppercase text-2xl italic">Endurance 2K26</h3>
              <p className="text-gray-700">Salle des fêtes de Combon</p>
              <p className="text-gray-700">11 Octobre 2026 - 14:00</p>
            </div>
            <button className="block mx-auto bg-pink-500 rounded-md px-4 py-2">
              Voir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  sublabel,
  value,
  color,
  icon,
  dark = false,
}: {
  label: string;
  sublabel: string;
  value: string;
  color: string;
  icon: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <div
      className={`${color} flex flex-row justify-items-center rounded-2xl p-3 shadow-xl ${
        dark ? "text-zinc-950" : "text-white"
      }`}
    >
      <div className="flex items-center">
        {icon}
      </div>
      <div className="flex flex-col mx-4">
        <div className="text-3xl font-black italic">{value}</div>
        <div className="mt-2 font-black uppercase text-sm">{label}</div>
        <div className="mt-2 uppercase font-extralight text-xs">{sublabel}</div>
      </div>
    </div>
  );
}

function QuickCard({
  href,
  title,
  subtitle,
  img,
}: {
  href: string;
  title: string;
  subtitle: string;
  img: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-zinc-200 bg-white text-zinc-950 shadow-xl transition hover:-translate-y-1 hover:border-pink-500 overflow-hidden" 
    >
      <img src={img}/>
      <div className="px-3 mb-2">
        <h2 className="mt-6 text-2xl font-black italic uppercase">{title}</h2>
        <p className="mt-2 text-sm font-medium text-zinc-500 uppercase">{subtitle}</p>
      </div>
    </Link>
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
  color: string
}) {
  return (
    <Link
      href={link}
      className="group rounded-2xl border border-zinc-200 bg-white text-zinc-950 shadow-xl transition hover:-translate-y-1 hover:border-pink-500 overflow-hidden" 
    >
      <div className="flex flex-row justify-items-center gap-2">
        <div className={`${color} p-1`}>{icon}</div>
        <p className="font-black self-center">{activity}</p> 
        <p className="self-center">{value}</p>
        <p className="font-black self-center">{date}</p>
      </div>
    </Link>
  );
}
