"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type DragEvent,
} from "react";
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
import { CalendarDays, GripVertical, MapPin, Pencil, Trophy } from "lucide-react";

export type RaceTableRow = {
  id: number;
  name: string;
  mode: "solo" | "team";
  notes: string | null;
  raceDate: string;
  raceDateLabel: string;
  sessionOrder: number;
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

type DropPosition = "before" | "after";

type DragOverTarget = {
  raceId: number;
  position: DropPosition;
} | null;

function includesValue(rowValue: unknown, filterValue: unknown) {
  const value = String(rowValue ?? "").toLowerCase();
  const filter = String(filterValue ?? "").toLowerCase();

  return !filter || value.includes(filter);
}

function equalsNumberOrEmpty(rowValue: unknown, filterValue: unknown) {
  if (!filterValue) return true;

  return Number(rowValue) === Number(filterValue);
}

function RaceModeTag({ mode }: { mode: "solo" | "team" }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${
        mode === "team"
          ? "bg-purple-50 text-purple-700 ring-purple-600/20"
          : "bg-cyan-50 text-cyan-700 ring-cyan-600/20"
      }`}
    >
      {mode === "team" ? "Équipe" : "Solo"}
    </span>
  );
}

function getSessionGroups(rows: Row<RaceTableRow>[]) {
  const groups: {
    sessionDate: string;
    sessionLabel: string;
    rows: typeof rows;
  }[] = [];

  for (const row of rows) {
    const previousGroup = groups.at(-1);

    if (previousGroup?.sessionDate === row.original.raceDate) {
      previousGroup.rows.push(row);
      continue;
    }

    groups.push({
      sessionDate: row.original.raceDate,
      sessionLabel: row.original.raceDateLabel,
      rows: [row],
    });
  }

  return groups;
}

function reorderRaceRows(
  races: RaceTableRow[],
  sessionDate: string,
  draggedRaceId: number,
  targetRaceId: number,
  position: DropPosition,
) {
  const sessionRaces = races.filter((race) => race.raceDate === sessionDate);
  const draggedIndex = sessionRaces.findIndex((race) => race.id === draggedRaceId);
  const targetIndex = sessionRaces.findIndex((race) => race.id === targetRaceId);

  if (draggedIndex < 0 || targetIndex < 0 || draggedIndex === targetIndex) {
    return races;
  }

  const reorderedSessionRaces = [...sessionRaces];
  const [draggedRace] = reorderedSessionRaces.splice(draggedIndex, 1);
  const adjustedTargetIndex =
    draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
  const insertionIndex =
    position === "after" ? adjustedTargetIndex + 1 : adjustedTargetIndex;

  reorderedSessionRaces.splice(insertionIndex, 0, draggedRace);

  let sessionIndex = 0;

  return races.map((race) =>
    race.raceDate === sessionDate
      ? { ...reorderedSessionRaces[sessionIndex], sessionOrder: sessionIndex++ }
      : race,
  );
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
  canManage = false,
  reorderRacesInSession,
}: {
  races: RaceTableRow[];
  tracks: TrackOption[];
  canManage?: boolean;
  reorderRacesInSession?: (formData: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const [orderedRaces, setOrderedRaces] = useState(races);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "raceDate", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [draggedRaceId, setDraggedRaceId] = useState<number | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<DragOverTarget>(null);
  const [reorderError, setReorderError] = useState("");
  const [isPending, startTransition] = useTransition();
  const canReorder = canManage && Boolean(reorderRacesInSession);

  useEffect(() => {
    setOrderedRaces(races);
  }, [races]);

  function persistSessionOrder(nextRaces: RaceTableRow[], sessionDate: string) {
    if (!reorderRacesInSession) return;

    const formData = new FormData();
    formData.set("sessionDate", sessionDate);

    for (const race of nextRaces.filter((row) => row.raceDate === sessionDate)) {
      formData.append("raceIds", String(race.id));
    }

    setReorderError("");
    startTransition(() => {
      void reorderRacesInSession(formData)
        .then(() => router.refresh())
        .catch(() => {
          setOrderedRaces(races);
          setReorderError("L'ordre n'a pas pu être enregistré.");
        });
    });
  }

  function updateDragOverTarget(
    event: DragEvent<HTMLElement>,
    raceId: number,
  ) {
    if (!canReorder || draggedRaceId === null) return;

    const draggedRace = orderedRaces.find((race) => race.id === draggedRaceId);
    const targetRace = orderedRaces.find((race) => race.id === raceId);

    if (!draggedRace || !targetRace || draggedRace.raceDate !== targetRace.raceDate) {
      setDragOverTarget(null);
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    const rect = event.currentTarget.getBoundingClientRect();
    const pointerY = event.clientY - rect.top;
    const position = pointerY > rect.height / 2 ? "after" : "before";

    setDragOverTarget((current) =>
      current?.raceId === raceId && current.position === position
        ? current
        : { raceId, position },
    );
  }

  function getDropPosition(event: DragEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const pointerY = event.clientY - rect.top;

    return pointerY > rect.height / 2 ? "after" : "before";
  }

  function handleRaceDrop(
    event: DragEvent<HTMLElement>,
    sessionDate: string,
    targetRaceId: number,
    fallbackPosition: DropPosition,
  ) {
    if (!canReorder || draggedRaceId === null) return;

    event.preventDefault();
    const position =
      event.currentTarget.dataset.dropPosition === "before" ||
      event.currentTarget.dataset.dropPosition === "after"
        ? event.currentTarget.dataset.dropPosition
        : getDropPosition(event);

    const nextRaces = reorderRaceRows(
      orderedRaces,
      sessionDate,
      draggedRaceId,
      targetRaceId,
      position ?? fallbackPosition,
    );

    setDraggedRaceId(null);
    setDragOverTarget(null);

    if (nextRaces === orderedRaces) return;

    setOrderedRaces(nextRaces);
    persistSessionOrder(nextRaces, sessionDate);
  }

  const renderDragHandle = useCallback(
    (race: RaceTableRow) => {
      if (!canReorder) return null;

      return (
        <button
          type="button"
          draggable
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", String(race.id));
            setDraggedRaceId(race.id);
            setDragOverTarget(null);
          }}
          onDragEnd={() => {
            setDraggedRaceId(null);
            setDragOverTarget(null);
          }}
          className={`inline-flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded-md border bg-white transition active:cursor-grabbing ${
            draggedRaceId === race.id
              ? "border-pink-400 text-pink-600 shadow-sm"
              : "border-zinc-200 text-zinc-400 hover:border-pink-300 hover:text-pink-500"
          }`}
          aria-label={`Déplacer ${race.name}`}
          title="Réordonner dans la session"
        >
          <GripVertical size="16" />
        </button>
      );
    },
    [canReorder, draggedRaceId],
  );

  const columns = useMemo<ColumnDef<RaceTableRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Course",
        filterFn: includesValue,
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            {renderDragHandle(row.original)}
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
        accessorKey: "mode",
        header: "Type",
        filterFn: includesValue,
        cell: ({ row }) => <RaceModeTag mode={row.original.mode} />,
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
      ...(canManage
        ? [
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
            } satisfies ColumnDef<RaceTableRow>,
          ]
        : []),
    ],
    [canManage, renderDragHandle],
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: orderedRaces,
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
  const rowModel = table.getRowModel();
  const sessionGroups = getSessionGroups(rowModel.rows);
  const pageCount = Math.max(1, table.getPageCount());

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
            placeholder="Course, circuit, note..."
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

      {reorderError && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {reorderError}
        </p>
      )}

      {canReorder && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-zinc-50 text-zinc-400">
            <GripVertical size="15" />
          </span>
          <span>
            Glisser une course sur une autre pour choisir sa position dans la
            session.
          </span>
          {isPending && (
            <span className="rounded-full bg-pink-50 px-2.5 py-1 text-xs font-bold text-pink-600 ring-1 ring-inset ring-pink-200">
              Enregistrement...
            </span>
          )}
        </div>
      )}

      <div className="space-y-5 md:hidden">
        {sessionGroups.map((group) => (
          <section key={group.sessionDate} className="space-y-3">
            <Link
              href={`/races?sessionDate=${group.sessionDate}`}
              className={`flex items-center justify-between gap-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-black text-zinc-800 transition hover:border-pink-300 hover:text-pink-600 ${
                isPending ? "opacity-70" : ""
              }`}
            >
              <span className="inline-flex min-w-0 items-center gap-2">
                <CalendarDays size="16" className="shrink-0 text-pink-500" />
                <span className="truncate">{group.sessionLabel}</span>
              </span>
              <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-zinc-600 ring-1 ring-inset ring-zinc-200">
                {group.rows.length} course{group.rows.length > 1 ? "s" : ""}
              </span>
            </Link>

            {group.rows.map((row) => {
              const race = row.original;
              const isDragged = draggedRaceId === race.id;
              const dropPosition =
                dragOverTarget?.raceId === race.id
                  ? dragOverTarget.position
                  : null;

              return (
                <div
                  key={row.id}
                  onDragOver={(event) => updateDragOverTarget(event, race.id)}
                  onDrop={(event) =>
                    handleRaceDrop(
                      event,
                      group.sessionDate,
                      race.id,
                      dropPosition ?? "before",
                    )
                  }
                  className={`relative rounded-xl border bg-white p-4 shadow-sm transition ${
                    isDragged
                      ? "scale-[0.99] border-pink-300 bg-pink-50/50 opacity-70"
                      : "border-zinc-200"
                  }`}
                >
                  {dropPosition && !isDragged && (
                    <div
                      className={`pointer-events-none absolute left-3 right-3 z-10 flex items-center gap-2 ${
                        dropPosition === "before" ? "-top-3" : "-bottom-3"
                      }`}
                    >
                      <span className="h-0.5 flex-1 rounded-full bg-pink-500 shadow-[0_0_0_3px_rgba(236,72,153,0.16)]" />
                      <span className="rounded-full bg-pink-500 px-2 py-0.5 text-[10px] font-black uppercase text-white shadow-sm">
                        Déposer ici
                      </span>
                      <span className="h-0.5 flex-1 rounded-full bg-pink-500 shadow-[0_0_0_3px_rgba(236,72,153,0.16)]" />
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      {renderDragHandle(race)}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-pink-100 text-pink-600">
                        <Trophy size="20" />
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/races?detailsRaceId=${race.id}`}
                          className="block truncate font-black text-zinc-900 transition hover:text-pink-600 hover:underline"
                        >
                          {race.name}
                        </Link>
                        {race.notes && (
                          <p className="mt-1 line-clamp-2 text-sm text-zinc-500">
                            {race.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {canManage && (
                      <Link
                        href={`/races?drawer=edit&raceId=${race.id}`}
                        className="inline-flex shrink-0 rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:border-cyan-500 hover:text-cyan-600"
                        aria-label={`Modifier ${race.name}`}
                      >
                        <Pencil size="16" />
                      </Link>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600 ring-1 ring-inset ring-zinc-500/20">
                      <MapPin size="13" />
                      {race.trackName ?? "Circuit inconnu"}
                    </span>
                    <RaceModeTag mode={race.mode} />
                    {race.championshipName && (
                      <span className="inline-flex items-center rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700 ring-1 ring-inset ring-purple-600/20">
                        {race.championshipName}
                      </span>
                    )}
                    <span className="inline-flex items-center rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700 ring-1 ring-inset ring-cyan-600/20">
                      {race.pilotCount} pilote{race.pilotCount > 1 ? "s" : ""}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-pink-50 px-3 py-1 text-xs font-semibold text-pink-700 ring-1 ring-inset ring-pink-600/20">
                      {race.bestLap}
                    </span>
                  </div>
                </div>
              );
            })}
          </section>
        ))}

        {rowModel.rows.length === 0 && (
          <div className="rounded-xl border border-zinc-200 bg-white px-5 py-10 text-center text-zinc-500">
            Aucune course ne correspond aux filtres.
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
                        <ColumnFilter column={header.column} tracks={tracks} />
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          <tbody className="divide-y divide-zinc-100">
            {sessionGroups.map((group) => (
              <Fragment key={group.sessionDate}>
                <tr className="bg-zinc-50/80">
                  <td colSpan={columns.length} className="px-5 py-3">
                    <Link
                      href={`/races?sessionDate=${group.sessionDate}`}
                      className="inline-flex items-center gap-2 font-black text-zinc-800 transition hover:text-pink-600 hover:underline"
                    >
                      <CalendarDays size="16" className="text-pink-500" />
                      {group.sessionLabel}
                    </Link>
                    <span className="ml-3 text-xs font-semibold text-zinc-500">
                      {group.rows.length} course
                      {group.rows.length > 1 ? "s" : ""}
                    </span>
                  </td>
                </tr>

                {group.rows.map((row) => {
                  const isDragged = draggedRaceId === row.original.id;
                  const dropPosition =
                    dragOverTarget?.raceId === row.original.id
                      ? dragOverTarget.position
                      : null;

                  return (
                    <Fragment key={row.id}>
                      {dropPosition === "before" && !isDragged && (
                        <tr
                          data-drop-position="before"
                          onDragOver={(event) => {
                            event.preventDefault();
                            event.dataTransfer.dropEffect = "move";
                          }}
                          onDrop={(event) =>
                            handleRaceDrop(
                              event,
                              group.sessionDate,
                              row.original.id,
                              "before",
                            )
                          }
                        >
                          <td colSpan={columns.length} className="p-0">
                            <div className="flex items-center gap-2 px-5 py-1">
                              <span className="h-0.5 flex-1 rounded-full bg-pink-500 shadow-[0_0_0_3px_rgba(236,72,153,0.14)]" />
                              <span className="rounded-full bg-pink-500 px-2 py-0.5 text-[10px] font-black uppercase text-white">
                                Déposer ici
                              </span>
                              <span className="h-0.5 flex-1 rounded-full bg-pink-500 shadow-[0_0_0_3px_rgba(236,72,153,0.14)]" />
                            </div>
                          </td>
                        </tr>
                      )}

                      <tr
                        onDragOver={(event) =>
                          updateDragOverTarget(event, row.original.id)
                        }
                        onDrop={(event) =>
                          handleRaceDrop(
                            event,
                            group.sessionDate,
                            row.original.id,
                            dropPosition ?? "before",
                          )
                        }
                        className={`transition hover:bg-zinc-50 ${
                          isDragged ? "bg-pink-50/60 opacity-70" : ""
                        }`}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td
                            key={cell.id}
                            className={`px-5 py-2 text-zinc-600 ${
                              cell.column.id === "name" ? "text-zinc-900" : ""
                            } ${cell.column.id === "actions" ? "text-right" : ""}`}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </td>
                        ))}
                      </tr>

                      {dropPosition === "after" && !isDragged && (
                        <tr
                          data-drop-position="after"
                          onDragOver={(event) => {
                            event.preventDefault();
                            event.dataTransfer.dropEffect = "move";
                          }}
                          onDrop={(event) =>
                            handleRaceDrop(
                              event,
                              group.sessionDate,
                              row.original.id,
                              "after",
                            )
                          }
                        >
                          <td colSpan={columns.length} className="p-0">
                            <div className="flex items-center gap-2 px-5 py-1">
                              <span className="h-0.5 flex-1 rounded-full bg-pink-500 shadow-[0_0_0_3px_rgba(236,72,153,0.14)]" />
                              <span className="rounded-full bg-pink-500 px-2 py-0.5 text-[10px] font-black uppercase text-white">
                                Déposer ici
                              </span>
                              <span className="h-0.5 flex-1 rounded-full bg-pink-500 shadow-[0_0_0_3px_rgba(236,72,153,0.14)]" />
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </Fragment>
            ))}

            {rowModel.rows.length === 0 && (
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
            {pageCount}
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
