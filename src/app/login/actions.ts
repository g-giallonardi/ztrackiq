"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAuthToken } from "@/lib/auth";
import { AUTH_COOKIE_NAME } from "@/lib/authConstants";
import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export type LoginState = {
  error?: string;
};

type LoginPilotRow = {
  id: number;
  email: string;
  passwordHash: string;
  role: string;
  active: boolean;
};

function requiredString(value: FormDataEntryValue | null) {
  const str = value?.toString().trim();

  if (!str) {
    throw new Error("Champ obligatoire");
  }

  return str;
}

export async function login(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = requiredString(formData.get("email")).toLowerCase();
  const password = requiredString(formData.get("password"));

  const [pilot] = await prisma.$queryRaw<LoginPilotRow[]>`
    SELECT
      "id",
      "email",
      "passwordHash",
      "role"::text AS "role",
      "active"
    FROM "Pilot"
    WHERE LOWER("email") = ${email}
    LIMIT 1
  `;

  if (!pilot || !pilot.active || !verifyPassword(password, pilot.passwordHash)) {
    return { error: "Email ou mot de passe incorrect" };
  }

  const token = await createAuthToken({
    id: pilot.id,
    role: pilot.role,
  });

  (await cookies()).set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  redirect("/");
}
