"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, InventoryItemCategory } from "@koko/database";

const inventoryItemSchema = z.object({
  name: z.string().min(2, "Name is required"),
  sku: z.string().min(2, "SKU is required").max(50),
  category: z.nativeEnum(InventoryItemCategory),
  unit: z.string().min(1, "Unit is required").max(20),
  minimumStock: z.coerce.number().min(0, "Minimum stock cannot be negative"),
  reorderQuantity: z
    .string()
    .optional()
    .transform((value) => {
      if (!value || value.trim().length === 0) return null;
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
    }),
  storageLocation: z.string().min(1, "Storage location is required").max(100),
  supplierId: z
    .string()
    .optional()
    .transform((value) => (!value || value === "NONE" ? null : value)),
  image: z
    .string()
    .url("Image must be a valid URL")
    .optional()
    .or(z.literal("")),
  notes: z.string().max(1000).optional().or(z.literal("")),
});

function generateQrCodeValue(sku: string): string {
  return `INV-${sku}-${crypto.randomUUID()}`;
}

export async function createInventoryItem(formData: FormData) {
  const parsed = inventoryItemSchema.safeParse({
    name: formData.get("name"),
    sku: formData.get("sku"),
    category: formData.get("category"),
    unit: formData.get("unit"),
    minimumStock: formData.get("minimumStock"),
    reorderQuantity: formData.get("reorderQuantity"),
    storageLocation: formData.get("storageLocation"),
    supplierId: formData.get("supplierId"),
    image: formData.get("image"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  try {
    await db.inventoryItem.create({
      data: {
        name: parsed.data.name.trim(),
        sku: parsed.data.sku.trim().toUpperCase(),
        category: parsed.data.category,
        unit: parsed.data.unit.trim(),
        currentStock: 0,
        minimumStock: parsed.data.minimumStock,
        reorderQuantity: parsed.data.reorderQuantity,
        storageLocation: parsed.data.storageLocation.trim(),
        supplierId: parsed.data.supplierId,
        qrCode: generateQrCodeValue(parsed.data.sku.trim().toUpperCase()),
        image: parsed.data.image || null,
        notes: parsed.data.notes || null,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return { success: false, error: "SKU already exists" };
    }
    return { success: false, error: "Failed to create inventory item" };
  }

  revalidatePath("/inventory");
  return { success: true };
}

export async function updateInventoryItem(formData: FormData) {
  const id = formData.get("id");
  if (!id || typeof id !== "string") {
    return { success: false, error: "Invalid item id" };
  }

  const parsed = inventoryItemSchema.safeParse({
    name: formData.get("name"),
    sku: formData.get("sku"),
    category: formData.get("category"),
    unit: formData.get("unit"),
    minimumStock: formData.get("minimumStock"),
    reorderQuantity: formData.get("reorderQuantity"),
    storageLocation: formData.get("storageLocation"),
    supplierId: formData.get("supplierId"),
    image: formData.get("image"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  try {
    await db.inventoryItem.update({
      where: { id },
      data: {
        name: parsed.data.name.trim(),
        sku: parsed.data.sku.trim().toUpperCase(),
        category: parsed.data.category,
        unit: parsed.data.unit.trim(),
        minimumStock: parsed.data.minimumStock,
        reorderQuantity: parsed.data.reorderQuantity,
        storageLocation: parsed.data.storageLocation.trim(),
        supplierId: parsed.data.supplierId,
        image: parsed.data.image || null,
        notes: parsed.data.notes || null,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return { success: false, error: "SKU already exists" };
    }
    return { success: false, error: "Failed to update inventory item" };
  }

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${id}`);
  return { success: true };
}

export async function archiveInventoryItem(formData: FormData) {
  const id = formData.get("id");
  if (!id || typeof id !== "string") {
    return { success: false, error: "Invalid item id" };
  }

  await db.inventoryItem.update({
    where: { id },
    data: { active: false },
  });

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${id}`);
  return { success: true };
}
