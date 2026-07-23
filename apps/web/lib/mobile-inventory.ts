import { createClient } from "@supabase/supabase-js";
import { db, InventoryTransactionType } from "@koko/database";
import {
  inventoryItemCategories,
  type InventoryItemCategory,
  type InventoryTransactionType as SharedTransactionType,
} from "@koko/types";

export const MOBILE_DEV_USER_ID = "local-dev-user";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function isValidInventoryCategory(
  value: string | null,
): value is InventoryItemCategory {
  return (
    !!value && inventoryItemCategories.includes(value as InventoryItemCategory)
  );
}

function isValidTransactionType(
  value: string | null,
): value is SharedTransactionType {
  return (
    !!value &&
    Object.values(InventoryTransactionType).includes(
      value as InventoryTransactionType,
    )
  );
}

function getStockStatus(
  currentStock: number,
  minimumStock: number,
): "healthy" | "low" | "critical" {
  if (currentStock < minimumStock) return "critical";
  if (currentStock <= minimumStock * 1.2) return "low";
  return "healthy";
}

export async function resolveMobileUserId(
  request: Request,
): Promise<string | null> {
  if (process.env.AUTH_BYPASS === "true") {
    await db.profile.upsert({
      where: { id: MOBILE_DEV_USER_ID },
      update: {
        fullName: "Local Admin",
        role: "ADMINISTRATOR",
        active: true,
      },
      create: {
        id: MOBILE_DEV_USER_ID,
        fullName: "Local Admin",
        role: "ADMINISTRATOR",
        active: true,
      },
    });

    return MOBILE_DEV_USER_ID;
  }

  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : null;
  if (!token) return null;

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

function transactionDelta(
  transactionType: SharedTransactionType,
  quantity: number,
  adjustmentDirection?: "INCREASE" | "DECREASE",
): number {
  switch (transactionType) {
    case InventoryTransactionType.RECEIVE:
    case InventoryTransactionType.RETURN:
      return quantity;
    case InventoryTransactionType.ISSUE:
    case InventoryTransactionType.WASTE:
      return -quantity;
    case InventoryTransactionType.ADJUSTMENT:
      return adjustmentDirection === "DECREASE" ? -quantity : quantity;
    default:
      return 0;
  }
}

export async function listMobileInventory(searchParams: URLSearchParams) {
  const search = searchParams.get("search")?.trim() ?? "";
  const categoryParam = searchParams.get("category");
  const category =
    categoryParam === "ALL" || isValidInventoryCategory(categoryParam)
      ? categoryParam
      : "ALL";
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = Math.max(
    1,
    Math.min(50, Number(searchParams.get("pageSize") ?? 20)),
  );

  const where = {
    active: true,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { sku: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(category && category !== "ALL"
      ? { category: category as InventoryItemCategory }
      : {}),
  };

  const [total, items, activeItems, recentTransactions] = await Promise.all([
    db.inventoryItem.count({ where }),
    db.inventoryItem.findMany({
      where,
      include: { supplier: { select: { name: true } } },
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.inventoryItem.findMany({
      where: { active: true },
      select: { currentStock: true, minimumStock: true },
    }),
    db.inventoryTransaction.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        inventoryItem: { select: { name: true, sku: true } },
        user: { select: { fullName: true } },
      },
    }),
  ]);

  const lowStockCount = activeItems.filter(
    (item) =>
      getStockStatus(Number(item.currentStock), Number(item.minimumStock)) !==
      "healthy",
  ).length;
  const criticalStockCount = activeItems.filter(
    (item) =>
      getStockStatus(Number(item.currentStock), Number(item.minimumStock)) ===
      "critical",
  ).length;

  return {
    items: items.map((item) => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      category: item.category,
      unit: item.unit,
      currentStock: Number(item.currentStock),
      minimumStock: Number(item.minimumStock),
      storageLocation: item.storageLocation,
      qrCode: item.qrCode,
      active: item.active,
      supplierName: item.supplier?.name ?? null,
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
    summary: {
      lowStockCount,
      criticalStockCount,
    },
    recentTransactions: recentTransactions.map((transaction) => ({
      id: transaction.id,
      inventoryItemId: transaction.inventoryItemId,
      inventoryItemName: transaction.inventoryItem.name,
      inventoryItemSku: transaction.inventoryItem.sku,
      transactionType: transaction.transactionType,
      quantity: Number(transaction.quantity),
      reason: transaction.reason,
      notes: transaction.notes,
      referenceNumber: transaction.referenceNumber,
      userName: transaction.user.fullName,
      createdAt: transaction.createdAt.toISOString(),
    })),
  };
}

export async function getMobileInventoryItem(id: string) {
  const item = await db.inventoryItem.findUnique({
    where: { id },
    include: { supplier: { select: { name: true } } },
  });

  if (!item) return null;

  const transactions = await db.inventoryTransaction.findMany({
    where: { inventoryItemId: id },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { fullName: true } } },
  });

  return {
    item: {
      id: item.id,
      name: item.name,
      sku: item.sku,
      category: item.category,
      unit: item.unit,
      currentStock: Number(item.currentStock),
      minimumStock: Number(item.minimumStock),
      storageLocation: item.storageLocation,
      qrCode: item.qrCode,
      active: item.active,
      notes: item.notes,
      image: item.image,
      supplierName: item.supplier?.name ?? null,
      createdAt: item.createdAt.toISOString(),
    },
    transactions: transactions.map((transaction) => ({
      id: transaction.id,
      transactionType: transaction.transactionType,
      quantity: Number(transaction.quantity),
      reason: transaction.reason,
      notes: transaction.notes,
      referenceNumber: transaction.referenceNumber,
      userName: transaction.user.fullName,
      createdAt: transaction.createdAt.toISOString(),
    })),
  };
}

export async function listMobileTransactions(searchParams: URLSearchParams) {
  const search = searchParams.get("search")?.trim() ?? "";
  const transactionTypeParam = searchParams.get("transactionType");
  const transactionType = isValidTransactionType(transactionTypeParam)
    ? transactionTypeParam
    : "ALL";
  const inventoryItemId =
    searchParams.get("inventoryItemId") &&
    searchParams.get("inventoryItemId") !== "ALL"
      ? searchParams.get("inventoryItemId")!
      : "";
  const userId =
    searchParams.get("userId") && searchParams.get("userId") !== "ALL"
      ? searchParams.get("userId")!
      : "";
  const fromDate = searchParams.get("fromDate") ?? "";
  const toDate = searchParams.get("toDate") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = Math.max(
    1,
    Math.min(50, Number(searchParams.get("pageSize") ?? 20)),
  );

  const where = {
    ...(transactionType !== "ALL"
      ? { transactionType: transactionType as InventoryTransactionType }
      : {}),
    ...(inventoryItemId ? { inventoryItemId } : {}),
    ...(userId ? { userId } : {}),
    ...(fromDate || toDate
      ? {
          createdAt: {
            ...(fromDate ? { gte: new Date(`${fromDate}T00:00:00.000Z`) } : {}),
            ...(toDate ? { lte: new Date(`${toDate}T23:59:59.999Z`) } : {}),
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { reason: { contains: search, mode: "insensitive" as const } },
            { notes: { contains: search, mode: "insensitive" as const } },
            {
              referenceNumber: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            {
              inventoryItem: {
                name: { contains: search, mode: "insensitive" as const },
              },
            },
            {
              inventoryItem: {
                sku: { contains: search, mode: "insensitive" as const },
              },
            },
            {
              user: {
                fullName: { contains: search, mode: "insensitive" as const },
              },
            },
          ],
        }
      : {}),
  };

  const [total, rows, inventoryItems, users] = await Promise.all([
    db.inventoryTransaction.count({ where }),
    db.inventoryTransaction.findMany({
      where,
      include: {
        inventoryItem: { select: { id: true, name: true, sku: true } },
        user: { select: { fullName: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.inventoryItem.findMany({
      where: { active: true },
      select: { id: true, name: true, sku: true, unit: true },
      orderBy: { name: "asc" },
    }),
    db.profile.findMany({
      where: { active: true },
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
    }),
  ]);

  return {
    rows: rows.map((row) => ({
      id: row.id,
      inventoryItemId: row.inventoryItemId,
      inventoryItemName: row.inventoryItem.name,
      inventoryItemSku: row.inventoryItem.sku,
      transactionType: row.transactionType,
      quantity: Number(row.quantity),
      reason: row.reason,
      notes: row.notes,
      referenceNumber: row.referenceNumber,
      userName: row.user.fullName,
      createdAt: row.createdAt.toISOString(),
    })),
    inventoryItems,
    users,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
    filters: {
      search,
      transactionType,
      inventoryItemId,
      userId,
      fromDate,
      toDate,
    },
  };
}

export async function createMobileTransaction(
  input: {
    inventoryItemId: string;
    transactionType: SharedTransactionType;
    quantity: number;
    reason: string;
    notes?: string | null;
    referenceNumber?: string | null;
    adjustmentDirection?: "INCREASE" | "DECREASE";
  },
  request: Request,
) {
  const userId = await resolveMobileUserId(request);
  if (!userId) {
    return { success: false as const, error: "Unauthorized" };
  }

  const result = await db.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findUnique({
      where: { id: input.inventoryItemId },
      select: { id: true, currentStock: true, active: true },
    });

    if (!item || !item.active) {
      return { success: false as const, error: "Inventory item not found" };
    }

    const delta = transactionDelta(
      input.transactionType,
      input.quantity,
      input.adjustmentDirection,
    );
    const newStock = Number(item.currentStock) + delta;

    if (newStock < 0) {
      return {
        success: false as const,
        error: "Transaction would result in negative stock",
      };
    }

    await tx.inventoryTransaction.create({
      data: {
        inventoryItemId: input.inventoryItemId,
        transactionType: input.transactionType,
        quantity: input.quantity,
        reason: input.reason.trim(),
        notes: input.notes?.trim() ? input.notes.trim() : null,
        referenceNumber: input.referenceNumber?.trim()
          ? input.referenceNumber.trim()
          : null,
        userId,
      },
    });

    await tx.inventoryItem.update({
      where: { id: input.inventoryItemId },
      data: { currentStock: newStock },
    });

    return { success: true as const };
  });

  return result;
}
