"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { requireCurrentUser } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { hashPassword, verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export async function updateMyProfile(formData: FormData) {
  const user = await requireCurrentUser();
  const firstname = requiredString(formData.get("firstname"), "Le prénom");
  const lastname = optionalString(formData.get("lastname"));
  const nickname = optionalString(formData.get("nickname"));
  const email = requiredString(formData.get("email"), "L'email").toLowerCase();
  const phone = optionalString(formData.get("phone"));
  const clubId = toNullableNumber(formData.get("clubId"));

  await prisma.$transaction(async (tx) => {
    const before = await tx.pilot.findUnique({
      where: { id: user.id },
    });

    if (!before || !before.active) {
      throw new Error("Pilote introuvable");
    }

    const updated = await tx.pilot.update({
      where: { id: user.id },
      data: {
        firstname,
        lastname,
        nickname,
        email,
        phone,
        clubId,
      },
    });

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

  const pilot = await prisma.pilot.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      passwordHash: true,
      firstname: true,
      lastname: true,
      nickname: true,
      active: true,
    },
  });

  if (!pilot || !pilot.active || !pilot.passwordHash) {
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

export async function saveMyCar(formData: FormData) {
  const user = await requireCurrentUser();
  const id = toNullableNumber(formData.get("id"));
  const name = requiredString(formData.get("name"), "Le nom");
  const chipId = optionalString(formData.get("chipId"));
  const specIds = formData
    .getAll("specIds")
    .map((value) => Number(value.toString().trim()))
    .filter((value) => Number.isInteger(value) && value > 0);

  await prisma.$transaction(async (tx) => {
    if (id) {
      const before = await tx.car.findFirst({
        where: { id, pilotId: user.id },
      });

      if (!before) {
        throw new Error("Voiture introuvable");
      }

      const car = await tx.car.update({
        where: { id },
        data: {
          name,
          chipId,
          basePi: 0,
        },
      });

      await tx.carSpec.deleteMany({
        where: { carId: id },
      });

      if (specIds.length > 0) {
        await tx.carSpec.createMany({
          data: specIds.map((specId) => ({
            carId: id,
            specId,
          })),
        });
      }

      await auditLog(
        {
          actorId: user.id,
          actorName: getPilotDisplayName(user),
          action: "UPDATE",
          entity: "Car",
          entityId: id,
          before,
          after: car,
        },
        tx,
      );
    } else {
      const car = await tx.car.create({
        data: {
          name,
          chipId,
          basePi: 0,
          pilotId: user.id,
        },
      });

      if (specIds.length > 0) {
        await tx.carSpec.createMany({
          data: specIds.map((specId) => ({
            carId: car.id,
            specId,
          })),
        });
      }

      await auditLog(
        {
          actorId: user.id,
          actorName: getPilotDisplayName(user),
          action: "CREATE",
          entity: "Car",
          entityId: car.id,
          after: car,
        },
        tx,
      );
    }
  });

  revalidatePath("/me");
  revalidatePath("/cars");
  redirect("/me?carSaved=1");
}

export async function deleteMyCar(formData: FormData) {
  const user = await requireCurrentUser();
  const id = toNullableNumber(formData.get("id"));

  if (!id) {
    throw new Error("Identifiant voiture manquant");
  }

  await prisma.$transaction(async (tx) => {
    const before = await tx.car.findFirst({
      where: { id, pilotId: user.id },
    });

    if (!before) {
      throw new Error("Voiture introuvable");
    }

    await tx.car.delete({
      where: { id },
    });

    await auditLog(
      {
        actorId: user.id,
        actorName: getPilotDisplayName(user),
        action: "DELETE",
        entity: "Car",
        entityId: id,
        before,
      },
      tx,
    );
  });

  revalidatePath("/me");
  revalidatePath("/cars");
  redirect("/me?carDeleted=1");
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
