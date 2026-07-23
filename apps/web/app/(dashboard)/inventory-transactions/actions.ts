"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, InventoryTransactionType } from "@koko/database";
import { createServerClient } from "@/lib/supabase/server";

const transactionInputSchema = z.object({
  inventoryItemId: z.string().uuid("Please select an inventory item"),
  transactionType: z.nativeEnum(InventoryTransactionType),
  quantity: z.coerce.number().positive("Quantity must be greater than zero"),
  reason: z.string().min(2, "Reason is required").max(200),
  notes: z.string().max(1000).optional().or(z.literal("")),
  referenceNumber: z.string().max(100).optional().or(z.literal("")),
  adjustmentDirection: z.enum(["INCREASE", "DECREASE"]).optional(),
});

async function resolveCurrentUserId(): Promise<string | null> {
  if (process.env.AUTH_BYPASS === "true") {
    const fallbackUser = await db.profile.findFirst({
      where: { active: true },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    return fallbackUser?.id ?? null;
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;
  return user.id;
}

function getStockDelta(
  transactionType: InventoryTransactionType,
  quantity: number,
  adjustmentDirection?: "INCREASE" | "DECREASE",
): number {
  switch (transactionType) {
    case InventoryTransactionType.RECEIVE:
      return quantity;
    case InventoryTransactionType.RETURN:
      return quantity;
    case InventoryTransactionType.ISSUE:
      return -quantity;
    case InventoryTransactionType.WASTE:
      return -quantity;
    case InventoryTransactionType.ADJUSTMENT:
      return adjustmentDirection === "DECREASE" ? -quantity : quantity;
    default:
      return 0;
  }
}

export async function createInventoryTransaction(formData: FormData) {
  const parsed = transactionInputSchema.safeParse({
    inventoryItemId: formData.get("inventoryItemId"),
    transactionType: formData.get("transactionType"),
    quantity: formData.get("quantity"),
    reason: formData.get("reason"),
    notes: formData.get("notes"),
    referenceNumber: formData.get("referenceNumber"),
    adjustmentDirection: formData.get("adjustmentDirection"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const userId = await resolveCurrentUserId();
  if (!userId) {
    return {
      success: false,
      error:
        "No active user found. Create a user profile first before posting transactions.",
    };
  }

  const {
    inventoryItemId,
    transactionType,
    quantity,
    reason,
    notes,
    referenceNumber,
    adjustmentDirection,
  } = parsed.data;

  const result = await db.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findUnique({
      where: { id: inventoryItemId },
      select: {
        id: true,
        currentStock: true,
        minimumStock: true,
        active: true,
      },
    });

    if (!item || !item.active) {
      return { success: false as const, error: "Inventory item not found" };
    }

    if (
      transactionType === InventoryTransactionType.ADJUSTMENT &&
      !adjustmentDirection
    ) {
      return {
        success: false as const,
        error: "Adjustment direction is required",
      };
    }

    const currentStock = Number(item.currentStock);
    const delta = getStockDelta(transactionType, quantity, adjustmentDirection);
    const newStock = currentStock + delta;

    if (newStock < 0) {
      return {
        success: false as const,
        error: "Transaction would result in negative stock",
      };
    }

    await tx.inventoryTransaction.create({
      data: {
        inventoryItemId,
        transactionType,
        quantity,
        reason: reason.trim(),
        notes: notes?.trim() ? notes.trim() : null,
        referenceNumber: referenceNumber?.trim()
          ? referenceNumber.trim()
          : null,
        userId,
      },
    });

    await tx.inventoryItem.update({
      where: { id: inventoryItemId },
      data: { currentStock: newStock },
    });

    return { success: true as const, inventoryItemId };
  });

  if (!result.success) {
    return result;
  }

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${result.inventoryItemId}`);
  revalidatePath("/inventory-transactions");

  return { success: true };
}
