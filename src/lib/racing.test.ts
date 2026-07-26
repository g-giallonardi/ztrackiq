import { describe, expect, it } from "vitest";
import {
  formatBestLap,
  formatBestLapDiff,
  formatPiClass,
  getCarTotalPi,
  parseBestLapMs,
} from "./racing";

describe("racing helpers", () => {
  it("classifies PI values with the current thresholds", () => {
    expect(formatPiClass(200)).toBe("C");
    expect(formatPiClass(201)).toBe("B");
    expect(formatPiClass(301)).toBe("A");
    expect(formatPiClass(401)).toBe("S");
    expect(formatPiClass(501)).toBe("X");
  });

  it("rounds PI before choosing the class", () => {
    expect(formatPiClass(300.4)).toBe("B");
    expect(formatPiClass(300.5)).toBe("A");
    expect(formatPiClass(400.49)).toBe("A");
    expect(formatPiClass(400.5)).toBe("S");
    expect(formatPiClass(500.5)).toBe("X");
  });

  it("sums car specs to compute total PI", () => {
    expect(
      getCarTotalPi({
        specs: [
          { spec: { piValue: 120 } },
          { spec: { piValue: 80 } },
          { spec: { piValue: -10 } },
        ],
      }),
    ).toBe(190);
  });

  it("parses lap times expressed as seconds or minutes", () => {
    expect(parseBestLapMs("12.345")).toBe(12345);
    expect(parseBestLapMs("12,345")).toBe(12345);
    expect(parseBestLapMs("1:02.345")).toBe(62345);
  });

  it("rejects empty, invalid, or negative lap times", () => {
    expect(parseBestLapMs("")).toBeNull();
    expect(parseBestLapMs("abc")).toBeNull();
    expect(parseBestLapMs("-1")).toBeNull();
    expect(parseBestLapMs("1:2:3")).toBeNull();
  });

  it("formats best lap times", () => {
    expect(formatBestLap(null)).toBe("-");
    expect(formatBestLap(12345)).toBe("12.345");
    expect(formatBestLap(62345)).toBe("1:02.345");
  });

  it("formats positive lap time differences only", () => {
    expect(formatBestLapDiff(12566, 12345)).toBe("+0.221");
    expect(formatBestLapDiff(12345, 12345)).toBeNull();
    expect(formatBestLapDiff(12000, 12345)).toBeNull();
    expect(formatBestLapDiff(null, 12345)).toBeNull();
  });
});
