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

export function PilotsTable({ pilots }: { pilots: PilotTableRow[] }) {
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
              <p className="font-semibold text-zinc-900">
                {row.original.firstname}
              </p>
              <p className="font-semibold uppercase text-zinc-900">
                {row.original.lastname || "—"}
              </p>
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
        filterFn: includesValue,
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
      },
    ],
    [],
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
      <div className="flex flex-row flex-wrap items-end gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-zinc-700">
            Recherche
          </span>
          <input
            type="search"
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.currentTarget.value)}
            placeholder="Pilote, pseudo, club..."
            className="min-w-72 rounded-md border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
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

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
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

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-600">
        <p>
          {table.getFilteredRowModel().rows.length} pilote
          {table.getFilteredRowModel().rows.length > 1 ? "s" : ""} filtré
          {table.getFilteredRowModel().rows.length > 1 ? "s" : ""}
        </p>

        <div className="flex items-center gap-2">
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
