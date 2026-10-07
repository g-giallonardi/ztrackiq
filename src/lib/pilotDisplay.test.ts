import { describe, expect, it } from "vitest";
import {
  buildDuplicateFirstnameSet,
  getPilotDisplayName,
  getPilotFullName,
} from "./pilotDisplay";

describe("pilot display helpers", () => {
  it("builds a full name without adding text for a missing last name", () => {
    expect(
      getPilotFullName({ firstname: "Alice", lastname: "Martin" }),
    ).toBe("Alice Martin");
    expect(getPilotFullName({ firstname: "Alice", lastname: null })).toBe(
      "Alice",
    );
  });

  it("detects duplicate first names case-insensitively", () => {
    const duplicates = buildDuplicateFirstnameSet([
      { firstname: " Alice ", lastname: "Martin", nickname: null },
      { firstname: "alice", lastname: "Durand", nickname: null },
      { firstname: "Bob", lastname: null, nickname: null },
    ]);

    expect(duplicates).toEqual(new Set(["alice"]));
  });

  it("prefers a nickname even when the first name is duplicated", () => {
    expect(
      getPilotDisplayName(
        { firstname: "Alice", lastname: "Martin", nickname: "Turbo" },
        new Set(["alice"]),
      ),
    ).toBe("Turbo");
  });

  it("uses the full name to disambiguate duplicate first names", () => {
    expect(
      getPilotDisplayName(
        { firstname: "Alice", lastname: "Martin", nickname: null },
        new Set(["alice"]),
      ),
    ).toBe("Alice Martin");
  });

  it("uses the first name when there is no nickname or duplicate", () => {
    expect(
      getPilotDisplayName({
        firstname: "Alice",
        lastname: "Martin",
        nickname: null,
      }),
    ).toBe("Alice");
  });
});
