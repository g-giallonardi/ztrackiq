import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE_NAME } from "@/lib/authConstants";
import { createJwtToken, verifyJwtToken } from "@/lib/jwt";
import type { AuthUser } from "@/types/auth";

type PilotAuthRow = AuthUser & {
  active: boolean;
};

export async function createAuthToken(user: {
  id: number;
  role: string;
}) {
  return createJwtToken(user);
}

export async function verifyAuthToken(token: string) {
  return verifyJwtToken(token);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await verifyAuthToken(token);
  if (!session) return null;

  const [pilot] = await prisma.$queryRaw<PilotAuthRow[]>`
    SELECT
      "id",
      "firstname",
      "lastname",
      "nickname",
      "email",
      "role"::text AS "role",
      "active"
    FROM "Pilot"
    WHERE "id" = ${session.userId}
  `;

  if (!pilot || !pilot.active) return null;

  return {
    id: pilot.id,
    firstname: pilot.firstname,
    lastname: pilot.lastname,
    nickname: pilot.nickname,
    email: pilot.email,
    role: pilot.role,
  };
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireAdmin() {
  const user = await requireCurrentUser();

  if (user.role !== "admin") {
    redirect("/");
  }

  return user;
}
