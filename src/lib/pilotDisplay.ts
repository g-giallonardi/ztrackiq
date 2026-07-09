export type PilotIdentity = {
  firstname: string;
  lastname: string | null;
  nickname: string | null;
};

export function getPilotFullName(pilot: {
  firstname: string;
  lastname: string | null;
}) {
  return [pilot.firstname, pilot.lastname].filter(Boolean).join(" ");
}

export function buildDuplicateFirstnameSet(pilots: PilotIdentity[]) {
  const counts = new Map<string, number>();

  for (const pilot of pilots) {
    const key = normalizeFirstname(pilot.firstname);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return new Set(
    Array.from(counts.entries())
      .filter(([, count]) => count > 1)
      .map(([firstname]) => firstname),
  );
}

export function getPilotDisplayName(
  pilot: PilotIdentity,
  duplicateFirstnames?: ReadonlySet<string>,
) {
  if (pilot.nickname) return pilot.nickname;

  return duplicateFirstnames?.has(normalizeFirstname(pilot.firstname))
    ? getPilotFullName(pilot)
    : pilot.firstname;
}

function normalizeFirstname(firstname: string) {
  return firstname.trim().toLowerCase();
}
