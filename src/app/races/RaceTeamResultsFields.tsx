"use client";

import { useState } from "react";

type PilotOption = {
  id: number;
  label: string;
};

type TeamResultSlot = {
  position: number;
  result?: {
    teamName: string;
    memberIds: number[];
    laps: number | null;
    bestLap: string;
  };
};

export function RaceTeamResultsFields({
  pilots,
  resultSlots,
}: {
  pilots: PilotOption[];
  resultSlots: TeamResultSlot[];
}) {
  const [selectedMembers, setSelectedMembers] = useState<
    Record<number, number[]>
  >(() =>
    Object.fromEntries(
      resultSlots.map((slot) => [slot.position, slot.result?.memberIds ?? []]),
    ),
  );

  return (
    <div className="space-y-3">
      {resultSlots.map(({ position, result }) => {
        const members = selectedMembers[position] ?? [];

        return (
          <div
            key={position}
            className="rounded-lg border border-zinc-200 bg-white p-3"
          >
            <input type="hidden" name="teamResultPositions" value={position} />
            <p className="mb-3 text-sm font-black text-zinc-900">
              #{position}
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase text-zinc-500">
                  Équipe
                </span>
                <input
                  name={`teamName_${position}`}
                  defaultValue={result?.teamName}
                  placeholder={`Équipe ${position}`}
                  className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase text-zinc-500">
                  Pilotes
                </span>
                <select
                  multiple
                  name={`teamMembers_${position}`}
                  value={members.map(String)}
                  onChange={(event) => {
                    const nextMembers = Array.from(
                      event.currentTarget.selectedOptions,
                      (option) => Number(option.value),
                    ).filter(Number.isFinite);

                    setSelectedMembers((current) => ({
                      ...current,
                      [position]: nextMembers,
                    }));
                  }}
                  className="min-h-24 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                >
                  {pilots.map((pilot) => (
                    <option key={pilot.id} value={pilot.id}>
                      {pilot.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase text-zinc-500">
                  Tours
                </span>
                <input
                  type="number"
                  name={`teamLaps_${position}`}
                  min="1"
                  step="1"
                  inputMode="numeric"
                  defaultValue={result?.laps ?? undefined}
                  className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-xs font-semibold uppercase text-zinc-500">
                  Meilleur temps
                </span>
                <input
                  type="number"
                  name={`teamBestLap_${position}`}
                  min="0"
                  step="0.001"
                  inputMode="decimal"
                  defaultValue={result?.bestLap || undefined}
                  placeholder="12.345"
                  className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                />
              </label>
            </div>
          </div>
        );
      })}
    </div>
  );
}
