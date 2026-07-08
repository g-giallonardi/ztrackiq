"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";

function nullableString(value: FormDataEntryValue | null) {
  const str = value?.toString().trim();
  return str ? str : null;
}

function nullableNumber(value: FormDataEntryValue | null) {
  const str = value?.toString().trim();
  if (!str) return null;

  const num = Number(str);
  if (Number.isNaN(num)) return null;

  return num;
}

function requiredNumber(value: FormDataEntryValue | null, field: string) {
  const str = value?.toString().trim();
  const num = Number(str);

  if (!str || Number.isNaN(num)) {
    throw new Error(`${field} est obligatoire`);
  }

  return num;
}

export async function saveCar(formData: FormData) {
  await requireAdmin();

  const id = nullableNumber(formData.get("id"));

  const specIds = formData
    .getAll("specIds")
    .map((value) => Number(value.toString().trim()))
    .filter((value) => !Number.isNaN(value) && value > 0);

  const name = nullableString(formData.get("name"));

  if (!name) {
    throw new Error("Le nom est obligatoire");
  }

  const data = {
    name,
    chipId: nullableString(formData.get("chipId")),
    basePi: 0,
    pilotId: requiredNumber(formData.get("pilotId"), "Le pilote"),
  };

  await prisma.$transaction(async (tx) => {
    if (id) {
      const before = await tx.car.findUnique({
        where: { id },
      });

      const car = await tx.car.update({
        where: { id },
        data,
      });

      await tx.carSpec.deleteMany({
        where: { carId: car.id },
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
        data,
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
          action: "CREATE",
          entity: "Car",
          entityId: car.id,
          after: car,
        },
        tx,
      );
    }
  });

  revalidatePath("/cars");
  redirect("/cars");
}

export async function deleteCar(formData: FormData) {
  await requireAdmin();

  const id = nullableNumber(formData.get("id"));

  if (!id) {
    throw new Error("Identifiant voiture manquant");
  }

  await prisma.$transaction(async (tx) => {
    const before = await tx.car.findUnique({
      where: { id },
    });

    if (!before) {
      throw new Error("Voiture introuvable");
    }

    await tx.car.delete({
      where: { id },
    });

    await auditLog(
      {
        action: "DELETE",
        entity: "Car",
        entityId: id,
        before,
      },
      tx,
    );
  });

  revalidatePath("/cars");
  redirect("/cars");
}
