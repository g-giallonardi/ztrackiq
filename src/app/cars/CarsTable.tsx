"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type Column,
  type ColumnDef,
  type ColumnFiltersState,
  type Row,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { CarFront, Pencil } from "lucide-react";

export type CarTableRow = {
  id: number;
  name: string;
  piClass: string;
  piValue: number;
  pilotName: string;
  transmission: string;
  energy: string;
  chipId: string | null;
};

function includesValue(rowValue: unknown, filterValue: unknown) {
  const value = String(rowValue ?? "").toLowerCase();
  const filter = String(filterValue ?? "").toLowerCase();

  return !filter || value.includes(filter);
}

function equalsValueOrEmpty(rowValue: unknown, filterValue: unknown) {
  if (!filterValue) return true;

  return String(rowValue) === String(filterValue);
}

function startsWithPiLabel(
  row: Row<CarTableRow>,
  _columnId: string,
  filterValue: unknown,
) {
  const filter = String(filterValue ?? "").toLowerCase();
  if (!filter) return true;

  return `${row.original.piClass} ${row.original.piValue}`
    .toLowerCase()
    .startsWith(filter);
}

function ColumnFilter({
  column,
  options,
}: {
  column: Column<CarTableRow, unknown>;
  options: {
    piClasses: string[];
    transmissions: string[];
    energies: string[];
  };
}) {
  const value = column.getFilterValue()?.toString() ?? "";

  if (column.id === "actions") return null;

  const selectOptions =
    column.id === "piClass"
      ? options.piClasses
      : column.id === "transmission"
        ? options.transmissions
        : column.id === "energy"
          ? options.energies
          : null;

  if (selectOptions) {
    return (
      <select
        value={value}
        onChange={(event) => column.setFilterValue(event.currentTarget.value)}
        onClick={(event) => event.stopPropagation()}
        className="mt-2 w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs font-normal text-zinc-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
      >
        <option value="">Tous</option>
        {selectOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  if (!column.getCanFilter()) return null;

  return (
    <input
      type="search"
      value={value}
      onChange={(event) => column.setFilterValue(event.currentTarget.value)}
      onClick={(event) => event.stopPropagation()}
      placeholder="Filtrer..."
      className="mt-2 w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs font-normal text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
    />
  );
}

function PiTag({ piClass, piValue }: { piClass: string; piValue: number }) {
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

  return (
    <span
      className={`${colors.className} ${colors.border} inline-flex overflow-hidden rounded-md border text-sm font-black`}
    >
      <span className="px-2.5 py-0.5">{piClass}</span>
      <span className="bg-white px-2.5 py-0.5 text-zinc-900">{piValue}</span>
    </span>
  );
}

function TransmissionTag({ transmission }: { transmission: string }) {
  const className =
    transmission === "RWD"
      ? "bg-yellow-50 text-yellow-700 ring-yellow-600/20"
      : transmission === "FWD"
        ? "bg-pink-50 text-pink-700 ring-pink-600/20"
        : "bg-cyan-50 text-cyan-700 ring-cyan-600/20";

  return (
    <span
      className={`${className} inline-flex items-center rounded-md px-3 py-1 text-xs font-semibold ring-1 ring-inset`}
    >
      {transmission}
    </span>
  );
}

function normalizeSpecCategoryName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function EnergyTag({ energy }: { energy: string }) {
  const normalizedEnergy = normalizeSpecCategoryName(energy);
  const className = normalizedEnergy.includes("lipo")
    ? "bg-purple-50 text-purple-700 ring-purple-600/20"
    : normalizedEnergy.includes("pile")
      ? "bg-blue-50 text-blue-700 ring-blue-600/20"
      : "bg-zinc-50 text-zinc-700 ring-zinc-600/20";

  return (
    <span
      className={`${className} inline-flex items-center rounded-md px-3 py-1 text-xs font-semibold ring-1 ring-inset`}
    >
      {energy}
    </span>
  );
}

export function CarsTable({
  cars,
  canManage = false,
}: {
  cars: CarTableRow[];
  canManage?: boolean;
}) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "name", desc: false },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const options = useMemo(
    () => ({
      piClasses: Array.from(new Set(cars.map((car) => car.piClass))).sort(),
      transmissions: Array.from(
        new Set(cars.map((car) => car.transmission).filter(Boolean)),
      ).sort(),
      energies: Array.from(
        new Set(cars.map((car) => car.energy).filter(Boolean)),
      ).sort(),
    }),
    [cars],
  );

  const columns = useMemo<ColumnDef<CarTableRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Mini-Z",
        filterFn: includesValue,
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-pink-100 text-pink-600">
              <CarFront size="22" />
            </div>
            <p className="font-semibold text-zinc-900">{row.original.name}</p>
          </div>
        ),
      },
      {
        accessorKey: "piClass",
        header: "Classe PI",
        filterFn: startsWithPiLabel,
        sortingFn: (rowA, rowB) =>
          rowA.original.piValue - rowB.original.piValue,
        cell: ({ row }) => (
          <PiTag
            piClass={row.original.piClass}
            piValue={row.original.piValue}
          />
        ),
      },
      {
        accessorKey: "pilotName",
        header: "Pilote",
        filterFn: includesValue,
      },
      {
        accessorKey: "transmission",
        header: "Transmission",
        filterFn: equalsValueOrEmpty,
        cell: ({ row }) => (
          <TransmissionTag transmission={row.original.transmission} />
        ),
      },
      {
        accessorKey: "energy",
        header: "Énergie",
        filterFn: equalsValueOrEmpty,
        cell: ({ row }) => <EnergyTag energy={row.original.energy} />,
      },
      {
        accessorKey: "chipId",
        header: "Puce",
        filterFn: includesValue,
        cell: ({ row }) =>
          row.original.chipId ? (
            <span className="inline-flex items-center rounded-md bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700 ring-1 ring-inset ring-cyan-600/20">
              {row.original.chipId}
            </span>
          ) : (
            "—"
          ),
      },
      ...(canManage
        ? [
            {
              id: "actions",
              header: "Actions",
              enableSorting: false,
              cell: ({ row }) => (
                <div className="text-right">
                  <Link
                    href={`/cars?drawer=edit&carId=${row.original.id}`}
                    className="inline-flex rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:border-cyan-500 hover:text-cyan-600"
                    aria-label={`Modifier ${row.original.name}`}
                  >
                    <Pencil size="16" />
                  </Link>
                </div>
              ),
            } satisfies ColumnDef<CarTableRow>,
          ]
        : []),
    ],
    [canManage],
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: cars,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
    globalFilterFn: (row, _columnId, filterValue) => {
      const filter = String(filterValue ?? "").toLowerCase();
      if (!filter) return true;

      return [
        row.original.name,
        `${row.original.piClass} ${row.original.piValue}`,
        row.original.pilotName,
        row.original.transmission,
        row.original.energy,
        row.original.chipId,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(filter));
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-stretch gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="block sm:w-auto">
          <span className="mb-1.5 block text-sm font-semibold text-zinc-700">
            Recherche
          </span>
          <input
            type="search"
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.currentTarget.value)}
            placeholder="Mini-Z, pilote, puce..."
            className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 sm:min-w-72"
          />
        </label>

        <button
          type="button"
          onClick={() => {
            setGlobalFilter("");
            setColumnFilters([]);
          }}
          className="rounded-md border border-zinc-200 bg-white px-4 py-2 font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
        >
          Réinitialiser
        </button>
      </div>

      <div className="space-y-3 md:hidden">
        {table.getRowModel().rows.map((row) => {
          const car = row.original;

          return (
            <div
              key={row.id}
              className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-pink-100 text-pink-600">
                      <CarFront size="22" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-black text-zinc-900">
                        {car.name}
                      </p>
                      <p className="truncate text-sm text-zinc-500">
                        {car.pilotName}
                      </p>
                    </div>
                  </div>
                </div>

                {canManage && (
                  <Link
                    href={`/cars?drawer=edit&carId=${car.id}`}
                    className="inline-flex shrink-0 rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:border-cyan-500 hover:text-cyan-600"
                    aria-label={`Modifier ${car.name}`}
                  >
                    <Pencil size="16" />
                  </Link>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <PiTag piClass={car.piClass} piValue={car.piValue} />
                {car.transmission && (
                  <TransmissionTag transmission={car.transmission} />
                )}
                {car.energy && <EnergyTag energy={car.energy} />}
                {car.chipId && (
                  <span className="inline-flex items-center rounded-md bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700 ring-1 ring-inset ring-cyan-600/20">
                    {car.chipId}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {table.getRowModel().rows.length === 0 && (
          <div className="rounded-xl border border-zinc-200 bg-white px-5 py-10 text-center text-zinc-500">
            Aucune voiture ne correspond aux filtres.
          </div>
        )}
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={`px-5 py-4 font-semibold ${
                      header.column.id === "actions" ? "text-right" : ""
                    }`}
                  >
                    {header.isPlaceholder ? null : (
                      <div>
                        <button
                          type="button"
                          disabled={!header.column.getCanSort()}
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1 disabled:cursor-default"
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          {{
                            asc: "↑",
                            desc: "↓",
                          }[header.column.getIsSorted() as string] ?? null}
                        </button>
                        <ColumnFilter column={header.column} options={options} />
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          <tbody className="divide-y divide-zinc-100">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="transition hover:bg-zinc-50">
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className={`px-5 py-4 text-zinc-600 ${
                      cell.column.id === "name" ? "text-zinc-900" : ""
                    } ${cell.column.id === "actions" ? "text-right" : ""}`}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}

            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-5 py-10 text-center text-zinc-500"
                >
                  Aucune voiture ne correspond aux filtres.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col items-stretch justify-between gap-3 text-sm text-zinc-600 sm:flex-row sm:flex-wrap sm:items-center">
        <p>
          {table.getFilteredRowModel().rows.length} voiture
          {table.getFilteredRowModel().rows.length > 1 ? "s" : ""} filtrée
          {table.getFilteredRowModel().rows.length > 1 ? "s" : ""}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="rounded-md border border-zinc-200 px-3 py-1.5 font-semibold disabled:cursor-not-allowed disabled:opacity-40"
          >
            Précédent
          </button>
          <span>
            Page {table.getState().pagination.pageIndex + 1} /{" "}
            {table.getPageCount()}
          </span>
          <button
            type="button"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="rounded-md border border-zinc-200 px-3 py-1.5 font-semibold disabled:cursor-not-allowed disabled:opacity-40"
          >
            Suivant
          </button>
          <select
            value={table.getState().pagination.pageSize}
            onChange={(event) => table.setPageSize(Number(event.target.value))}
            className="rounded-md border border-zinc-200 bg-white px-2 py-1.5"
          >
            {[10, 20, 50].map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                {pageSize} / page
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
