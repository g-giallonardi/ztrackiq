

import Link from "next/link";
import type { ReactNode } from "react";
import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  BadgePlus,
  Gauge,
  Pencil,
  Plus,
  Settings2,
  Tags,
  Trash2,
  Wrench,
} from "lucide-react";
import { deleteSpec, saveSpec } from "./actions";

export default async function CarpartsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    drawer?: string;
    specId?: string;
    confirmDelete?: string;
  }>;
}) {
  await requireCurrentUser();

  const [specs, categories] = await Promise.all([
    prisma.spec.findMany({
      include: {
        category: true,
        cars: true,
      },
      orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
    }),
    prisma.specCategory.findMany({
      orderBy: { name: "asc" },
    }),
  ]);

  const params = await searchParams;
  const drawerMode = params?.drawer;
  const selectedSpecId = params?.specId ? Number(params.specId) : null;
  const selectedSpec = selectedSpecId
    ? specs.find((spec) => spec.id === selectedSpecId)
    : null;

  const isDrawerOpen = drawerMode === "add" || drawerMode === "edit";
  const isDeleteModalOpen =
    drawerMode === "edit" && params?.confirmDelete === "1";

  const usedSpecsCount = specs.filter((spec) => spec.cars.length > 0).length;
  const averagePi = specs.length
    ? Math.round(specs.reduce((sum, spec) => sum + spec.piValue, 0) / specs.length)
    : 0;
  const maxPi = specs.length
    ? Math.max(...specs.map((spec) => spec.piValue))
    : 0;

  return (
    <div className="m-2 rounded bg-white p-2 text-gray-900">
      <div className="flex flex-row items-start justify-between gap-4">
        <div>
          <div className="my-2 flex flex-row gap-2 text-5xl">
            <p className="rounded bg-pink-200 p-2 text-pink-500">
              <Wrench size="30" />
            </p>
            <p className="self-end">Améliorations</p>
          </div>
          <p>Gérer les pièces Mini-Z et leur impact PI</p>
        </div>

        <Link
          href="/carparts?drawer=add"
          className="inline-flex h-fit shrink-0 items-center gap-2 rounded-md bg-gradient-to-r from-pink-500 to-yellow-400 px-5 py-3 font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
        >
          <Plus />
          Ajouter une amélioration
        </Link>
      </div>

      <div className="mb-6 flex flex-row flex-wrap gap-3">
        <QuickViewCard
          icon={<Wrench />}
          color="text-pink-500"
          bgColor="bg-pink-100"
          value={specs.length.toString()}
          label="Améliorations"
        />
        <QuickViewCard
          icon={<Tags />}
          color="text-cyan-500"
          bgColor="bg-cyan-100"
          value={categories.length.toString()}
          label="Catégories"
        />
        <QuickViewCard
          icon={<Gauge />}
          color="text-yellow-500"
          bgColor="bg-yellow-100"
          value={`+${averagePi}`}
          label="PI moyen"
        />
        <QuickViewCard
          icon={<Settings2 />}
          color="text-purple-500"
          bgColor="bg-purple-100"
          value={usedSpecsCount.toString()}
          label="Utilisées sur Mini-Z"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-5 py-4 font-semibold">Amélioration</th>
              <th className="px-5 py-4 font-semibold">Catégorie</th>
              <th className="px-5 py-4 font-semibold">Impact PI</th>
              <th className="px-5 py-4 font-semibold">Utilisation</th>
              <th className="px-5 py-4 font-semibold">Statut</th>
              <th className="px-5 py-4 text-right font-semibold">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-zinc-100">
            {specs.map((spec) => (
              <tr key={spec.id} className="transition hover:bg-zinc-50">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-pink-100 text-pink-600">
                      <Wrench size="22" />
                    </div>
                    <div>
                      <p className="font-semibold text-zinc-900">{spec.name}</p>
                      <p className="text-xs text-zinc-500">#{spec.id}</p>
                    </div>
                  </div>
                </td>

                <td className="px-5 py-4">
                  <CategoryTag name={spec.category.name} />
                </td>

                <td className="px-5 py-4">
                  <PiDeltaTag value={spec.piValue} maxPi={maxPi} />
                </td>

                <td className="px-5 py-4 text-zinc-600">
                  {spec.cars.length} Mini-Z
                </td>

                <td className="px-5 py-4">
                  <SpecStatusTag used={spec.cars.length > 0} />
                </td>

                <td className="px-5 py-4 text-right">
                  <div className="inline-flex gap-2">
                    <Link
                      href={`/carparts?drawer=edit&specId=${spec.id}`}
                      className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:border-cyan-500 hover:text-cyan-600"
                      aria-label={`Modifier ${spec.name}`}
                    >
                      <Pencil size="16" />
                    </Link>
                    <Link
                      href={`/carparts?drawer=edit&specId=${spec.id}&confirmDelete=1`}
                      className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-100"
                      aria-label={`Supprimer ${spec.name}`}
                    >
                      <Trash2 size="16" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isDrawerOpen && (
        <SpecDrawer
          mode={drawerMode}
          spec={selectedSpec}
          categories={categories}
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

function CategoryTag({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700 ring-1 ring-inset ring-cyan-600/20">
      {name}
    </span>
  );
}

function PiDeltaTag({ value, maxPi }: { value: number; maxPi: number }) {
  const isMax = value === maxPi && maxPi > 0;
  const className = isMax
    ? "bg-yellow-50 text-yellow-700 ring-yellow-600/20"
    : value >= 0
      ? "bg-green-50 text-green-700 ring-green-600/20"
      : "bg-red-50 text-red-700 ring-red-600/20";

  return (
    <span
      className={`${className} inline-flex items-center rounded-md px-3 py-1 text-base font-black ring-1 ring-inset`}
    >
      {value >= 0 ? "+" : ""}
      {value}
    </span>
  );
}

function SpecStatusTag({ used }: { used: boolean }) {
  const label = used ? "Utilisée" : "Libre";
  const className = used
    ? "bg-green-100 text-green-700 ring-green-600/20"
    : "bg-zinc-100 text-zinc-600 ring-zinc-500/20";

  return (
    <span
      className={`${className} inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset`}
    >
      <span className="mr-2 h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

function SpecDrawer({
  mode,
  spec,
  categories,
  showDeleteModal,
}: {
  mode: string | undefined;
  spec?: {
    id: number;
    name: string;
    piValue: number;
    categoryId: number;
    cars: unknown[];
  } | null;
  categories: {
    id: number;
    name: string;
  }[];
  showDeleteModal: boolean;
}) {
  const isEdit = mode === "edit";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm">
      <Link href="/carparts" className="flex-1" aria-label="Fermer le volet" />

      <aside className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-pink-500">
              {isEdit ? "Modification" : "Création"}
            </p>
            <h2 className="mt-1 text-2xl font-black text-zinc-900">
              {isEdit ? "Modifier l'amélioration" : "Ajouter une amélioration"}
            </h2>
          </div>

          <Link
            href="/carparts"
            className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:border-pink-500 hover:text-pink-600"
          >
            Fermer
          </Link>
        </div>

        {isEdit && !spec ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Amélioration introuvable.
          </div>
        ) : (
          <form action={saveSpec} className="space-y-5">
            <SpecField
              label="Nom"
              name="name"
              defaultValue={spec?.name}
              placeholder="Moteur X-Speed"
              required
            />

            <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-zinc-700">
                  Catégorie existante
                </span>
                <select
                  name="categoryId"
                  defaultValue={spec?.categoryId ?? categories[0]?.id ?? ""}
                  className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                >
                  <option value="">Aucune catégorie existante</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <SpecField
                label="Nouvelle catégorie"
                name="categoryName"
                placeholder="Motor, Chassis, Battery..."
              />

              <p className="text-xs text-zinc-500">
                Si une nouvelle catégorie est renseignée, elle sera créée automatiquement et prendra le dessus sur la sélection.
              </p>
            </div>

            <SpecField
              label="Impact PI"
              name="piValue"
              type="number"
              defaultValue={spec?.piValue?.toString()}
              placeholder="25"
              required
            />

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-white p-2 text-pink-500 shadow-sm">
                  <BadgePlus size="20" />
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-900">
                    Règle de calcul
                  </p>
                  <p className="text-xs text-zinc-500">
                    Le PI total d&apos;une Mini-Z = PI d&apos;origine + somme des améliorations montées.
                  </p>
                </div>
              </div>
            </div>

            {spec && <input type="hidden" name="id" value={spec.id} />}

            <div className="flex items-center justify-between gap-3 border-t border-zinc-100 pt-5">
              {spec ? (
                <Link
                  href={`/carparts?drawer=edit&specId=${spec.id}&confirmDelete=1`}
                  className="rounded-md border border-red-200 bg-red-50 px-4 py-2 font-semibold text-red-600 transition hover:bg-red-100"
                >
                  Supprimer
                </Link>
              ) : (
                <span />
              )}

              <div className="flex gap-3">
                <Link
                  href="/carparts"
                  className="rounded-md border border-zinc-200 px-4 py-2 font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
                >
                  Annuler
                </Link>
                <button
                  type="submit"
                  className="rounded-md bg-gradient-to-r from-pink-500 to-yellow-400 px-4 py-2 font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  {isEdit ? "Enregistrer" : "Créer l'amélioration"}
                </button>
              </div>
            </div>
          </form>
        )}
      </aside>

      {showDeleteModal && spec && <DeleteSpecModal spec={spec} />}
    </div>
  );
}

function SpecField({
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

function DeleteSpecModal({
  spec,
}: {
  spec: {
    id: number;
    name: string;
    cars: unknown[];
  };
}) {
  const isUsed = spec.cars.length > 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-red-500">
          Suppression
        </p>
        <h3 className="mt-1 text-2xl font-black text-zinc-900">
          Supprimer cette amélioration ?
        </h3>
        <p className="mt-3 text-sm text-zinc-600">
          Tu vas supprimer définitivement l&apos;amélioration{" "}
          <span className="font-semibold text-zinc-900">{spec.name}</span>.
        </p>

        {isUsed && (
          <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-700">
            Cette amélioration est montée sur {spec.cars.length} Mini-Z. La suppression retirera aussi ces liaisons.
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Link
            href={`/carparts?drawer=edit&specId=${spec.id}`}
            className="rounded-md border border-zinc-200 px-4 py-2 font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
          >
            Annuler
          </Link>

          <form action={deleteSpec}>
            <input type="hidden" name="id" value={spec.id} />
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
