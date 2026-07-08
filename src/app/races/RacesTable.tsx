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
import { MapPin, Pencil, Trophy } from "lucide-react";

export type RaceTableRow = {
  id: number;
  name: string;
  notes: string | null;
  raceDate: string;
  raceDateLabel: string;
  trackId: number | null;
  trackName: string | null;
  championshipName: string | null;
  pilotCount: number;
  bestLap: string;
};

type TrackOption = {
  id: number;
  name: string;
};

function includesValue(rowValue: unknown, filterValue: unknown) {
  const value = String(rowValue ?? "").toLowerCase();
  const filter = String(filterValue ?? "").toLowerCase();

  return !filter || value.includes(filter);
}

function equalsNumberOrEmpty(rowValue: unknown, filterValue: unknown) {
  if (!filterValue) return true;

  return Number(rowValue) === Number(filterValue);
}

function ColumnFilter({
  column,
  tracks,
}: {
  column: Column<RaceTableRow, unknown>;
  tracks: TrackOption[];
}) {
  const value = column.getFilterValue()?.toString() ?? "";

  if (column.id === "actions") return null;

  if (column.id === "raceDate") {
    return (
      <input
        type="date"
        value={value}
        onChange={(event) => column.setFilterValue(event.currentTarget.value)}
        onClick={(event) => event.stopPropagation()}
        className="mt-2 w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs font-normal text-zinc-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
      />
    );
  }

  if (column.id === "trackId") {
    return (
      <select
        value={value}
        onChange={(event) => column.setFilterValue(event.currentTarget.value)}
        onClick={(event) => event.stopPropagation()}
        className="mt-2 w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs font-normal text-zinc-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
      >
        <option value="">Tous</option>
        {tracks.map((track) => (
          <option key={track.id} value={track.id}>
            {track.name}
          </option>
        ))}
      </select>
    );
  }

  if (!column.getCanFilter()) return null;

  return (
    <input
      type={column.id === "pilotCount" ? "number" : "search"}
      value={value}
      onChange={(event) => column.setFilterValue(event.currentTarget.value)}
      onClick={(event) => event.stopPropagation()}
      placeholder="Filtrer..."
      className="mt-2 w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs font-normal text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
    />
  );
}

export function RacesTable({
  races,
  tracks,
}: {
  races: RaceTableRow[];
  tracks: TrackOption[];
}) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "raceDate", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const columns = useMemo<ColumnDef<RaceTableRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Course",
        filterFn: includesValue,
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-pink-100 text-pink-600">
              <Trophy size="18" />
            </div>
            <div className="min-w-0">
              <Link
                href={`/races?detailsRaceId=${row.original.id}`}
                className="font-semibold text-zinc-900 transition hover:text-pink-600 hover:underline"
              >
                {row.original.name}
              </Link>
              {row.original.notes && (
                <p className="max-w-xs truncate text-xs text-zinc-500">
                  {row.original.notes}
                </p>
              )}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "raceDate",
        header: "Session",
        filterFn: includesValue,
        cell: ({ row }) => (
          <Link
            href={`/races?sessionDate=${row.original.raceDate}`}
            className="transition hover:text-pink-600 hover:underline"
          >
            {row.original.raceDateLabel}
          </Link>
        ),
      },
      {
        accessorKey: "trackId",
        header: "Circuit",
        filterFn: equalsNumberOrEmpty,
        cell: ({ row }) =>
          row.original.trackName ? (
            <span className="inline-flex items-center gap-1.5">
              <MapPin size="14" />
              {row.original.trackName}
            </span>
          ) : (
            "—"
          ),
      },
      {
        accessorKey: "championshipName",
        header: "Championnat",
        filterFn: includesValue,
        cell: ({ row }) => row.original.championshipName ?? "—",
      },
      {
        accessorKey: "pilotCount",
        header: "Pilotes",
        filterFn: equalsNumberOrEmpty,
      },
      {
        accessorKey: "bestLap",
        header: "Meilleur temps",
        filterFn: includesValue,
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="text-right">
            <Link
              href={`/races?drawer=edit&raceId=${row.original.id}`}
              className="inline-flex rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:border-cyan-500 hover:text-cyan-600"
              aria-label={`Modifier ${row.original.name}`}
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
    data: races,
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
        row.original.notes,
        row.original.trackName,
        row.original.championshipName,
        row.original.raceDateLabel,
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
            placeholder="Course, circuit, note..."
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
                        <ColumnFilter column={header.column} tracks={tracks} />
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
                    className={`px-5 py-2 text-zinc-600 ${
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
                  Aucune course ne correspond aux filtres.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-600">
        <p>
          {table.getFilteredRowModel().rows.length} course
          {table.getFilteredRowModel().rows.length > 1 ? "s" : ""} filtrée
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
