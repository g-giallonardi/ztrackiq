"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { requireCurrentUser } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

type PilotProfileRow = {
  id: number;
  firstname: string;
  lastname: string | null;
  nickname: string | null;
  email: string;
  phone: string | null;
  clubId: number | null;
  active: boolean;
  role: string;
  createdAt: Date;
  updatedAt: Date;
};

type PilotPasswordRow = {
  id: number;
  passwordHash: string;
  firstname: string;
  lastname: string | null;
  nickname: string | null;
  active: boolean;
};

export async function updateMyProfile(formData: FormData) {
  const user = await requireCurrentUser();
  const firstname = requiredString(formData.get("firstname"), "Le prénom");
  const lastname = optionalString(formData.get("lastname"));
  const nickname = optionalString(formData.get("nickname"));
  const email = requiredString(formData.get("email"), "L'email").toLowerCase();
  const phone = optionalString(formData.get("phone"));
  const clubId = toNullableNumber(formData.get("clubId"));

  await prisma.$transaction(async (tx) => {
    const [before] = await tx.$queryRaw<PilotProfileRow[]>`
      SELECT
        "id",
        "firstname",
        "lastname",
        "nickname",
        "email",
        "phone",
        "clubId",
        "active",
        "role"::text AS "role",
        "createdAt",
        "updatedAt"
      FROM "Pilot"
      WHERE "id" = ${user.id}
    `;

    if (!before || !before.active) {
      throw new Error("Pilote introuvable");
    }

    const [updated] = await tx.$queryRaw<PilotProfileRow[]>`
      UPDATE "Pilot"
      SET
        "firstname" = ${firstname},
        "lastname" = ${lastname},
        "nickname" = ${nickname},
        "email" = ${email},
        "phone" = ${phone},
        "clubId" = ${clubId},
        "updatedAt" = NOW()
      WHERE "id" = ${user.id}
      RETURNING
        "id",
        "firstname",
        "lastname",
        "nickname",
        "email",
        "phone",
        "clubId",
        "active",
        "role"::text AS "role",
        "createdAt",
        "updatedAt"
    `;

    await tx.auditLog.create({
      data: {
        actorId: user.id,
        actorName: getPilotDisplayName(user),
        action: "UPDATE",
        entity: "Pilot",
        entityId: user.id,
        before: toAuditJson(before),
        after: toAuditJson(updated),
      },
    });
  });

  revalidatePath("/me");
  revalidatePath("/");
  redirect("/me?saved=1");
}

export async function changeMyPassword(formData: FormData) {
  const user = await requireCurrentUser();
  const currentPassword = requiredString(
    formData.get("currentPassword"),
    "Le mot de passe actuel",
  );
  const newPassword = requiredString(
    formData.get("newPassword"),
    "Le nouveau mot de passe",
  );
  const confirmPassword = requiredString(
    formData.get("confirmPassword"),
    "La confirmation",
  );

  if (newPassword.length < 8) {
    redirect("/me?passwordError=short");
  }

  if (newPassword !== confirmPassword) {
    redirect("/me?passwordError=mismatch");
  }

  const [pilot] = await prisma.$queryRaw<PilotPasswordRow[]>`
    SELECT
      "id",
      "passwordHash",
      "firstname",
      "lastname",
      "nickname",
      "active"
    FROM "Pilot"
    WHERE "id" = ${user.id}
  `;

  if (!pilot || !pilot.active) {
    redirect("/login");
  }

  if (!verifyPassword(currentPassword, pilot.passwordHash)) {
    redirect("/me?passwordError=current");
  }

  const nextPasswordHash = hashPassword(newPassword);

  await prisma.$transaction(async (tx) => {
    await tx.pilot.update({
      where: { id: user.id },
      data: { passwordHash: nextPasswordHash },
    });

    await tx.auditLog.create({
      data: {
        actorId: user.id,
        actorName: getPilotDisplayName(pilot),
        action: "UPDATE",
        entity: "Pilot",
        entityId: user.id,
        before: { passwordChanged: false },
        after: { passwordChanged: true },
      },
    });
  });

  revalidatePath("/me");
  redirect("/me?passwordSaved=1");
}

function requiredString(value: FormDataEntryValue | null, label: string) {
  if (typeof value !== "string") {
    throw new Error(`${label} est obligatoire`);
  }

  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error(`${label} est obligatoire`);
  }

  return trimmed;
}

function optionalString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toNullableNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const number = Number(trimmed);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function getPilotDisplayName(pilot: {
  firstname: string;
  lastname: string | null;
  nickname: string | null;
}) {
  return pilot.nickname || pilot.firstname;
}

function toAuditJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === null || value === undefined) return undefined;

  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
