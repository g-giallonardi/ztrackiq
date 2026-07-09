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
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { Pencil } from "lucide-react";

export type PilotTableRow = {
  id: number;
  firstname: string;
  lastname: string | null;
  nickname: string | null;
  fullName: string;
  initials: string;
  active: boolean;
  statusLabel: string;
  role: string;
  roleLabel: string;
  clubName: string;
  carName: string;
};

function includesValue(rowValue: unknown, filterValue: unknown) {
  const value = String(rowValue ?? "").toLowerCase();
  const filter = String(filterValue ?? "").toLowerCase();

  return !filter || value.includes(filter);
}

function equalsBooleanOrEmpty(rowValue: unknown, filterValue: unknown) {
  if (!filterValue) return true;

  return String(rowValue) === String(filterValue);
}

function equalsRoleOrEmpty(rowValue: unknown, filterValue: unknown) {
  if (!filterValue) return true;

  const role = String(rowValue ?? "");
  const filter = String(filterValue);

  return filter === "none" ? !role : role === filter;
}

function ColumnFilter({ column }: { column: Column<PilotTableRow, unknown> }) {
  const value = column.getFilterValue()?.toString() ?? "";

  if (column.id === "actions") return null;

  if (column.id === "active" || column.id === "role") {
    return (
      <select
        value={value}
        onChange={(event) => column.setFilterValue(event.currentTarget.value)}
        onClick={(event) => event.stopPropagation()}
        className="mt-2 w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs font-normal text-zinc-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
      >
        {column.id === "active" ? (
          <>
            <option value="">Tous</option>
            <option value="true">Actifs</option>
            <option value="false">Inactifs</option>
          </>
        ) : (
          <>
            <option value="">Tous</option>
            <option value="none">Aucun rôle</option>
            <option value="admin">Admin</option>
            <option value="adherent">Adhérent</option>
            <option value="visiteur">Visiteur</option>
          </>
        )}
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

function PilotStatusTag({ active }: { active: boolean }) {
  const label = active ? "Actif" : "Inactif";
  const className = active
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

function RoleTag({ role, label }: { role: string; label: string }) {
  const className =
    role === "admin"
      ? "bg-purple-100 text-purple-700 ring-purple-600/20"
      : role === "adherent"
        ? "bg-cyan-100 text-cyan-700 ring-cyan-600/20"
        : "bg-zinc-100 text-zinc-600 ring-zinc-500/20";

  return (
    <span
      className={`${className} inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset`}
    >
      {label}
    </span>
  );
}

export function PilotsTable({
  pilots,
  canManage = false,
}: {
  pilots: PilotTableRow[];
  canManage?: boolean;
}) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "fullName", desc: false },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const columns = useMemo<ColumnDef<PilotTableRow>[]>(
    () => [
      {
        accessorKey: "fullName",
        header: "Pilote",
        filterFn: includesValue,
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-100 font-bold text-pink-600">
              {row.original.initials}
            </div>
            <div>
              <Link
                href={`/pilots?detailsPilotId=${row.original.id}`}
                className="font-semibold text-zinc-900 transition hover:text-pink-600 "
              >
                {row.original.firstname}
              
                <p className="font-semibold uppercase text-zinc-900 transition  hover:text-pink-600 ">
                  {row.original.lastname || "—"}
                </p>
              </Link>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "nickname",
        header: "Pseudo",
        filterFn: includesValue,
        cell: ({ row }) => row.original.nickname || "—",
      },
      {
        accessorKey: "active",
        header: "Statut",
        filterFn: equalsBooleanOrEmpty,
        cell: ({ row }) => <PilotStatusTag active={row.original.active} />,
      },
      {
        accessorKey: "role",
        header: "Rôle",
        filterFn: equalsRoleOrEmpty,
        cell: ({ row }) => (
          <RoleTag role={row.original.role} label={row.original.roleLabel} />
        ),
      },
      {
        accessorKey: "clubName",
        header: "Club",
        filterFn: includesValue,
      },
      {
        accessorKey: "carName",
        header: "Voiture",
        filterFn: includesValue,
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
                    href={`/pilots?drawer=edit&pilotId=${row.original.id}`}
                    className="inline-flex rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:border-pink-500 hover:text-pink-600"
                    aria-label={`Modifier ${row.original.fullName}`}
                  >
                    <Pencil size="16" />
                  </Link>
                </div>
              ),
            } satisfies ColumnDef<PilotTableRow>,
          ]
        : []),
    ],
    [canManage],
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: pilots,
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
        row.original.fullName,
        row.original.nickname,
        row.original.statusLabel,
        row.original.roleLabel,
        row.original.clubName,
        row.original.carName,
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
            placeholder="Pilote, pseudo, club..."
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
          const pilot = row.original;

          return (
            <div
              key={row.id}
              className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pink-100 font-bold text-pink-600">
                    {pilot.initials}
                  </div>
                  <div className="min-w-0">
                    <Link
                      href={`/pilots?detailsPilotId=${pilot.id}`}
                      className="block truncate font-black text-zinc-900 transition hover:text-pink-600 hover:underline"
                    >
                      {pilot.firstname}
                    </Link>
                    <p className="truncate text-sm font-semibold uppercase text-zinc-900">
                      {pilot.lastname || "—"}
                    </p>
                    {pilot.nickname && (
                      <p className="truncate text-sm text-zinc-500">
                        {pilot.nickname}
                      </p>
                    )}
                  </div>
                </div>

                {canManage && (
                  <Link
                    href={`/pilots?drawer=edit&pilotId=${pilot.id}`}
                    className="inline-flex shrink-0 rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:border-pink-500 hover:text-pink-600"
                    aria-label={`Modifier ${pilot.fullName}`}
                  >
                    <Pencil size="16" />
                  </Link>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <PilotStatusTag active={pilot.active} />
                <RoleTag role={pilot.role} label={pilot.roleLabel} />
                <span className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600 ring-1 ring-inset ring-zinc-500/20">
                  {pilot.clubName}
                </span>
                <span className="inline-flex items-center rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700 ring-1 ring-inset ring-cyan-600/20">
                  {pilot.carName}
                </span>
              </div>
            </div>
          );
        })}

        {table.getRowModel().rows.length === 0 && (
          <div className="rounded-xl border border-zinc-200 bg-white px-5 py-10 text-center text-zinc-500">
            Aucun pilote ne correspond aux filtres.
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
                        <ColumnFilter column={header.column} />
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
                      cell.column.id === "fullName" ? "text-zinc-900" : ""
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
                  Aucun pilote ne correspond aux filtres.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col items-stretch justify-between gap-3 text-sm text-zinc-600 sm:flex-row sm:flex-wrap sm:items-center">
        <p>
          {table.getFilteredRowModel().rows.length} pilote
          {table.getFilteredRowModel().rows.length > 1 ? "s" : ""} filtré
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
