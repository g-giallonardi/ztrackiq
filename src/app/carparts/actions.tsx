"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";

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

function requiredString(value: FormDataEntryValue | null, field: string) {
  const str = value?.toString().trim();

  if (!str) {
    throw new Error(`${field} est obligatoire`);
  }

  return str;
}

export async function saveSpec(formData: FormData) {
  const id = nullableNumber(formData.get("id"));

  const categoryName = formData.get("categoryName")?.toString().trim();
  const categoryId = nullableNumber(formData.get("categoryId"));

  const data = {
    name: requiredString(formData.get("name"), "Le nom"),
    piValue: requiredNumber(formData.get("piValue"), "Le PI"),
  };

  await prisma.$transaction(async (tx) => {
    const category = categoryName
      ? await tx.specCategory.upsert({
          where: { name: categoryName },
          update: {},
          create: { name: categoryName },
        })
      : categoryId
        ? await tx.specCategory.findUnique({ where: { id: categoryId } })
        : null;

    if (!category) {
      throw new Error("La catégorie est obligatoire");
    }

    const specData = {
      ...data,
      categoryId: category.id,
    };

    if (id) {
      const before = await tx.spec.findUnique({
        where: { id },
        include: { category: true },
      });

      const spec = await tx.spec.update({
        where: { id },
        data: specData,
        include: { category: true },
      });

      await auditLog(
        {
          action: "UPDATE",
          entity: "Spec",
          entityId: id,
          before,
          after: spec,
        },
        tx,
      );
    } else {
      const spec = await tx.spec.create({
        data: specData,
        include: { category: true },
      });

      await auditLog(
        {
          action: "CREATE",
          entity: "Spec",
          entityId: spec.id,
          after: spec,
        },
        tx,
      );
    }
  });

  revalidatePath("/carparts");
  revalidatePath("/cars");
  redirect("/carparts");
}

export async function deleteSpec(formData: FormData) {
  const id = nullableNumber(formData.get("id"));

  if (!id) {
    throw new Error("Identifiant amélioration manquant");
  }

  await prisma.$transaction(async (tx) => {
    const before = await tx.spec.findUnique({
      where: { id },
      include: {
        category: true,
        cars: true,
      },
    });

    if (!before) {
      throw new Error("Amélioration introuvable");
    }

    await tx.spec.delete({
      where: { id },
    });

    await auditLog(
      {
        action: "DELETE",
        entity: "Spec",
        entityId: id,
        before,
      },
      tx,
    );
  });

  revalidatePath("/carparts");
  revalidatePath("/cars");
  redirect("/carparts");
}