export type PiClass = "X" | "S" | "A" | "B" | "C";

export function formatPiClass(value: number): PiClass {
  const pi = Math.min(999, Math.round(value));

  return pi > 500
    ? "X"
    : pi > 400
      ? "S"
      : pi > 300
        ? "A"
        : pi > 200
          ? "B"
          : "C";
}

export function getCarTotalPi(car: { specs: { spec: { piValue: number } }[] }) {
  return car.specs.reduce((sum, carSpec) => sum + carSpec.spec.piValue, 0);
}

export function parseBestLapMs(value: FormDataEntryValue | string | null) {
  const str = value?.toString().trim().replace(",", ".");
  if (!str) return null;

  const parts = str.split(":");
  const seconds =
    parts.length === 1
      ? Number(parts[0])
      : parts.length === 2
        ? Number(parts[0]) * 60 + Number(parts[1])
        : Number.NaN;

  if (Number.isNaN(seconds) || seconds < 0) return null;

  return Math.round(seconds * 1000);
}

export function formatBestLap(bestLapMs: number | null | undefined) {
  if (!bestLapMs) return "-";

  const totalSeconds = bestLapMs / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds - minutes * 60;

  return minutes > 0
    ? `${minutes}:${seconds.toFixed(3).padStart(6, "0")}`
    : seconds.toFixed(3);
}

export function formatBestLapDiff(
  bestLapMs: number | null | undefined,
  referenceBestLapMs: number | null | undefined,
) {
  if (!bestLapMs || !referenceBestLapMs) return null;

  const diff = bestLapMs - referenceBestLapMs;
  if (diff <= 0) return null;

  return `+${(diff / 1000).toFixed(3)}`;
}
