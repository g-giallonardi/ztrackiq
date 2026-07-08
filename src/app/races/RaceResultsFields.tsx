"use client";

import { useMemo, useState } from "react";

type PilotOption = {
  id: number;
  label: string;
};

type CarOption = {
  id: number;
  name: string;
  pilotId: number;
  pilotLabel: string;
};

type ResultSlot = {
  position: number;
  result?: {
    pilotId: number;
    carId: number | null;
    laps: number | null;
    bestLap: string;
  };
};

function getOrderedCars(cars: CarOption[], pilotId: number | null) {
  if (!pilotId) return cars;

  return [
    ...cars.filter((car) => car.pilotId === pilotId),
    ...cars.filter((car) => car.pilotId !== pilotId),
  ];
}

export function RaceResultsFields({
  pilots,
  cars,
  resultSlots,
}: {
  pilots: PilotOption[];
  cars: CarOption[];
  resultSlots: ResultSlot[];
}) {
  const defaultCarByPilotId = useMemo(() => {
    const map = new Map<number, number>();

    for (const car of cars) {
      if (!map.has(car.pilotId)) {
        map.set(car.pilotId, car.id);
      }
    }

    return map;
  }, [cars]);

  const [selectedPilotIds, setSelectedPilotIds] = useState<
    Record<number, number | null>
  >(() =>
    Object.fromEntries(
      resultSlots.map((slot) => [slot.position, slot.result?.pilotId ?? null]),
    ),
  );
  const [selectedCarIds, setSelectedCarIds] = useState<
    Record<number, number | null>
  >(() =>
    Object.fromEntries(
      resultSlots.map((slot) => [
        slot.position,
        slot.result?.carId ??
          (slot.result?.pilotId
            ? defaultCarByPilotId.get(slot.result.pilotId) ?? null
            : null),
      ]),
    ),
  );

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
      <div className="grid grid-cols-[72px_minmax(180px,1fr)_minmax(220px,1fr)_120px_160px] gap-3 bg-zinc-50 px-3 py-2 text-xs font-semibold uppercase text-zinc-500">
        <span>Place</span>
        <span>Pilote</span>
        <span>Voiture</span>
        <span>Tours</span>
        <span>Meilleur temps</span>
      </div>

      <div className="divide-y divide-zinc-100">
        {resultSlots.map(({ position, result }) => {
          const selectedPilotId = selectedPilotIds[position] ?? null;
          const selectedCarId = selectedCarIds[position] ?? null;
          const orderedCars = getOrderedCars(cars, selectedPilotId);

          return (
            <div
              key={position}
              className="grid grid-cols-[72px_minmax(180px,1fr)_minmax(220px,1fr)_120px_160px] items-center gap-3 px-3 py-2"
            >
              <input type="hidden" name="resultPositions" value={position} />
              <span className="text-sm font-semibold text-zinc-700">
                #{position}
              </span>
              <select
                name={`pilot_${position}`}
                value={selectedPilotId ?? ""}
                onChange={(event) => {
                  const nextPilotId = event.currentTarget.value
                    ? Number(event.currentTarget.value)
                    : null;
                  const currentCar = cars.find(
                    (car) => car.id === selectedCarIds[position],
                  );

                  setSelectedPilotIds((current) => ({
                    ...current,
                    [position]: nextPilotId,
                  }));
                  setSelectedCarIds((current) => ({
                    ...current,
                    [position]: nextPilotId
                      ? !currentCar || currentCar.pilotId !== nextPilotId
                        ? defaultCarByPilotId.get(nextPilotId) ?? null
                        : currentCar.id
                      : null,
                  }));
                }}
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
              >
                <option value="">Aucun pilote</option>
                {pilots.map((pilot) => (
                  <option key={pilot.id} value={pilot.id}>
                    {pilot.label}
                  </option>
                ))}
              </select>
              <select
                name={`car_${position}`}
                value={selectedCarId ?? ""}
                disabled={!selectedPilotId || cars.length === 0}
                onChange={(event) =>
                  setSelectedCarIds((current) => ({
                    ...current,
                    [position]: event.currentTarget.value
                      ? Number(event.currentTarget.value)
                      : null,
                  }))
                }
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none transition disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
              >
                <option value="">Aucune voiture</option>
                {orderedCars.map((car) => (
                  <option key={car.id} value={car.id}>
                    {car.pilotId === selectedPilotId
                      ? car.name
                      : `${car.name} - ${car.pilotLabel}`}
                  </option>
                ))}
              </select>
              <input
                type="number"
                name={`laps_${position}`}
                min="0"
                defaultValue={result?.laps ?? undefined}
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
              />
              <input
                type="text"
                name={`bestLap_${position}`}
                defaultValue={result?.bestLap || undefined}
                placeholder="12.345"
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
