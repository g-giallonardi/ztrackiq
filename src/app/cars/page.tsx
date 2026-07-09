

import Link from "next/link";
import type { ReactNode } from "react";
import {
  DismissibleDrawer,
  DrawerCloseButton,
} from "@/components/DismissibleDrawer";
import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  CarFront,
  Gauge,
  Plus,
  Radio,
  UserRoundCheck,
  Waypoints,
} from "lucide-react";
import {
  buildDuplicateFirstnameSet,
  getPilotDisplayName,
} from "@/lib/pilotDisplay";
import { deleteCar, saveCar } from "./actions";
import { CarsTable, type CarTableRow } from "./CarsTable";

function formatPiClass(value: number) {
  const pi = Math.min(999, Math.round(value));

  const rank =
    pi > 500 ? "X" :
    pi > 400 ? "S" :
    pi > 300 ? "A" :
    pi > 200 ? "B" :
    "C";

  return `${rank}`;
}

function getCarTotalPi(car: { specs: { spec: { piValue: number } }[] }) {
  return car.specs.reduce((sum, carSpec) => sum + carSpec.spec.piValue, 0);
}

function getCarSpecValue(
  car: { specs: { spec: { category: { name: string }; name: string } }[] },
  categoryNames: string | string[],
) {
  const names = Array.isArray(categoryNames) ? categoryNames : [categoryNames];
  const normalizedNames = names.map(normalizeSpecCategoryName);

  return car.specs.find(
    (carSpec) => normalizedNames.includes(
      normalizeSpecCategoryName(carSpec.spec.category.name),
    ),
  )?.spec.name ?? "—";
}

function normalizeSpecCategoryName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export default async function CarsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    drawer?: string;
    carId?: string;
    confirmDelete?: string;
  }>;
}) {
  const currentUser = await requireCurrentUser();
  const canManage = currentUser.role === "admin";

  const [cars, pilots, specCategories] = await Promise.all([
    prisma.car.findMany({
      include: {
        pilot: true,
        specs: {
          include: {
            spec: {
              include: {
                category: true,
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.pilot.findMany({
      where: { active: true },
      orderBy: [{ lastname: "asc" }, { firstname: "asc" }],
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

  const params = await searchParams;
  const drawerMode = params?.drawer;
  const selectedCarId = params?.carId ? Number(params.carId) : null;
  const selectedCar = selectedCarId
    ? cars.find((car) => car.id === selectedCarId)
    : null;

  const isDrawerOpen = drawerMode === "add" || drawerMode === "edit";
  const isDeleteModalOpen =
    drawerMode === "edit" && params?.confirmDelete === "1";

  const chipCount = cars.filter((car) => Boolean(car.chipId)).length;
  const assignedCount = cars.filter((car) => Boolean(car.pilotId)).length;
  const awdCount = cars.filter((car) => getCarSpecValue(car, "Transmission") === "AWD").length;
  const rwdCount = cars.filter((car) => getCarSpecValue(car, "Transmission") === "RWD").length;
  const fwdCount = cars.filter((car) => getCarSpecValue(car, "Transmission") === "FWD").length;
  const displayPilots = [
    ...new Map(
      [...pilots, ...cars.flatMap((car) => (car.pilot ? [car.pilot] : []))].map(
        (pilot) => [pilot.id, pilot],
      ),
    ).values(),
  ];
  const duplicateFirstnames = buildDuplicateFirstnameSet(displayPilots);
  const carTableRows: CarTableRow[] = cars.map((car) => {
    const energy = getCarSpecValue(car, [
      "Technologie énergie",
      "Technologie d'énergie",
      "Techno énergie",
      "Techno d'énergie",
      "Énergie",
      "Energie",
      "Batterie",
      "Battery",
    ]);
    const piValue = getCarTotalPi(car);

    return {
      id: car.id,
      name: car.name,
      piClass: formatPiClass(piValue),
      piValue,
      pilotName: car.pilot
        ? getPilotDisplayName(car.pilot, duplicateFirstnames)
        : "Aucun",
      transmission: getCarSpecValue(car, "Transmission"),
      energy,
      chipId: car.chipId,
    };
  });

  return (
    <div className="m-2 rounded bg-white p-2 text-gray-900">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
        <div>
          <div className="my-2 flex flex-row gap-2 text-4xl sm:text-5xl">
            <p className="rounded bg-pink-200 p-2 text-pink-500">
              <CarFront size="30" />
            </p>
            <p className="self-end">Voitures</p>
          </div>
          <p>Gérer le garage Mini-Z et les puces de comptage</p>
        </div>

        {canManage && (
          <Link
            href="/cars?drawer=add"
            className="inline-flex h-fit w-full shrink-0 items-center justify-center gap-2 rounded-md bg-gradient-to-r from-pink-500 to-yellow-400 px-5 py-3 font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 sm:w-auto"
          >
            <Plus />
            Ajouter une Mini-Z
          </Link>
        )}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:flex-wrap sm:gap-3">
        <QuickViewCard
          icon={<CarFront />}
          color="text-pink-500"
          bgColor="bg-pink-100"
          value={cars.length.toString()}
          label="Mini-Z enregistrées"
        />
        <QuickViewCard
          icon={<Radio />}
          color="text-yellow-500"
          bgColor="bg-yellow-100"
          value={chipCount.toString()}
          label="Puces enregistrées"
        />
        <QuickViewCard
          icon={<UserRoundCheck />}
          color="text-cyan-500"
          bgColor="bg-cyan-100"
          value={assignedCount.toString()}
          label="Assignées à un pilote"
        />
        <QuickViewCard
          icon={<Waypoints />}
          color="text-purple-500"
          bgColor="bg-purple-100"
          value={`${awdCount} / ${rwdCount} / ${fwdCount}`}
          label="AWD / RWD / FWD"
        />
      </div>

      <CarsTable cars={carTableRows} canManage={canManage} />

      {canManage && isDrawerOpen && (
        <CarDrawer
          key={`${drawerMode}-${selectedCarId ?? "new"}`}
          mode={drawerMode}
          car={selectedCar}
          pilots={pilots}
          duplicateFirstnames={duplicateFirstnames}
          specCategories={specCategories}
          showDeleteModal={isDeleteModalOpen}
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
    <div className="group flex items-center gap-2 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm transition-all hover:-translate-y-1 hover:border-pink-500 hover:shadow-lg sm:gap-4 sm:p-5">
      <div
        className={`${color} ${bgColor} flex h-10 w-10 shrink-0 items-center justify-center rounded-md sm:h-14 sm:w-14`}
      >
        {icon}
      </div>
      <div>
        <p className="text-xl font-bold leading-none text-zinc-900 sm:text-3xl">{value}</p>
        <p className="mt-1 text-xs text-zinc-500 sm:text-sm">{label}</p>
      </div>
    </div>
  );
}

function CarDrawer({
  mode,
  car,
  pilots,
  duplicateFirstnames,
  specCategories,
  showDeleteModal,
}: {
  mode: string | undefined;
  car?: {
    id: number;
    name: string;
    chipId: string | null;
    pilotId: number | null;
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
  } | null;
  pilots: {
    id: number;
    firstname: string;
    lastname: string | null;
    nickname: string | null;
  }[];
  duplicateFirstnames: ReadonlySet<string>;
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
              {isEdit ? "Modifier la Mini-Z" : "Ajouter une Mini-Z"}
            </h2>
          </div>

          <DrawerCloseButton
            className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:border-pink-500 hover:text-pink-600"
          >
            Fermer
          </DrawerCloseButton>
        </div>

        {isEdit && !car ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Mini-Z introuvable.
          </div>
        ) : (
          <form action={saveCar} className="space-y-5">
            <CarField label="Nom" name="name" defaultValue={car?.name} required />

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-zinc-900">Améliorations</p>
                  <p className="text-xs text-zinc-500">
                    Sélectionne une spec par catégorie. Le PI est calculé uniquement depuis ces specs.
                  </p>
                </div>
                <div className="rounded-md bg-white p-2 text-pink-500 shadow-sm">
                  <Gauge size="20" />
                </div>
              </div>

              <div className="space-y-3">
                {specCategories.length === 0 && (
                  <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-4 text-sm text-zinc-500">
                    Aucune amélioration disponible. Ajoute d’abord des pièces dans la page Améliorations.
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
                  {car ? formatPiClass(getCarTotalPi(car)) : "Calculée à l’enregistrement"}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Formule : somme des PI des specs sélectionnées.
                </p>
              </div>
            </div>

            <CarField
              label="Puce de comptage"
              name="chipId"
              defaultValue={car?.chipId ?? undefined}
              placeholder="RFID-001"
            />

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-zinc-700">
                Pilote assigné
              </span>
              <select
                name="pilotId"
                defaultValue={car?.pilotId ?? ""}
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
              >
                <option value="">Aucun pilote</option>
                {pilots.map((pilot) => (
                  <option key={pilot.id} value={pilot.id}>
                    {getPilotDisplayName(pilot, duplicateFirstnames)}
                  </option>
                ))}
              </select>
            </label>

            {car && <input type="hidden" name="id" value={car.id} />}

            <div className="flex items-center justify-between gap-3 border-t border-zinc-100 pt-5">
              {car ? (
                <Link
                  href={`/cars?drawer=edit&carId=${car.id}&confirmDelete=1`}
                  className="rounded-md border border-red-200 bg-red-50 px-4 py-2 font-semibold text-red-600 transition hover:bg-red-100"
                >
                  Supprimer
                </Link>
              ) : (
                <span />
              )}

              <div className="flex gap-3">
                <Link
                  href="/cars"
                  className="rounded-md border border-zinc-200 px-4 py-2 font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
                >
                  Annuler
                </Link>
                <button
                  type="submit"
                  className="rounded-md bg-gradient-to-r from-pink-500 to-yellow-400 px-4 py-2 font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  {isEdit ? "Enregistrer" : "Créer la Mini-Z"}
                </button>
              </div>
            </div>
          </form>
        )}
      </aside>

      {showDeleteModal && car && <DeleteCarModal car={car} />}
    </div>
    </DismissibleDrawer>
  );
}

function CarField({
  label,
  name,
  type = "text",
  defaultValue,
  required = false,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
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
        className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
      />
    </label>
  );
}

function DeleteCarModal({ car }: { car: { id: number; name: string } }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-red-500">
          Suppression
        </p>
        <h3 className="mt-1 text-2xl font-black text-zinc-900">
          Supprimer cette Mini-Z ?
        </h3>
        <p className="mt-3 text-sm text-zinc-600">
          Tu vas supprimer définitivement la Mini-Z{" "}
          <span className="font-semibold text-zinc-900">{car.name}</span>. Cette
          action sera enregistrée dans les logs.
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <Link
            href={`/cars?drawer=edit&carId=${car.id}`}
            className="rounded-md border border-zinc-200 px-4 py-2 font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
          >
            Annuler
          </Link>

          <form action={deleteCar}>
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
