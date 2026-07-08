"use client";

import { useMemo, useState } from "react";

type ChampionshipOption = {
  id: number;
  name: string;
  startDate: string;
  endDate: string | null;
};

function isChampionshipAvailable(
  championship: ChampionshipOption,
  raceDate: string,
) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    Boolean(raceDate) &&
    championship.startDate <= today &&
    championship.startDate <= raceDate &&
    (!championship.endDate || championship.endDate >= raceDate)
  );
}

export function RaceChampionshipFields({
  defaultRaceDate,
  defaultChampionshipId,
  championships,
}: {
  defaultRaceDate?: string;
  defaultChampionshipId?: number | null;
  championships: ChampionshipOption[];
}) {
  const [raceDate, setRaceDate] = useState(defaultRaceDate ?? "");
  const [championshipId, setChampionshipId] = useState(
    defaultChampionshipId ? String(defaultChampionshipId) : "",
  );

  const availableChampionships = useMemo(
    () =>
      championships.filter((championship) =>
        isChampionshipAvailable(championship, raceDate),
      ),
    [championships, raceDate],
  );
  const hasSelectedChampionship = availableChampionships.some(
    (championship) => String(championship.id) === championshipId,
  );

  return (
    <>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-zinc-700">
          Session <span className="text-pink-500"> *</span>
        </span>
        <input
          type="date"
          name="raceDate"
          defaultValue={defaultRaceDate}
          required
          onBlur={(event) => {
            const nextRaceDate = event.currentTarget.value;
            setRaceDate(nextRaceDate);

            if (
              championshipId &&
              !championships.some(
                (championship) =>
                  String(championship.id) === championshipId &&
                  isChampionshipAvailable(championship, nextRaceDate),
              )
            ) {
              setChampionshipId("");
            }
          }}
          className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-zinc-700">
          Championnat
        </span>
        <select
          name="championshipId"
          value={hasSelectedChampionship ? championshipId : ""}
          disabled={!raceDate}
          onChange={(event) => setChampionshipId(event.currentTarget.value)}
          className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none transition disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
        >
          <option value="">Aucun championnat</option>
          {availableChampionships.map((championship) => (
            <option key={championship.id} value={championship.id}>
              {championship.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-zinc-500">
          Renseigne la session pour choisir un championnat compatible.
        </p>
      </label>
    </>
  );
}
