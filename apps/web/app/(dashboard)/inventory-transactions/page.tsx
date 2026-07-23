import type { Metadata } from "next";
import { db, InventoryTransactionType } from "@koko/database";
import { TransactionsClient } from "./transactions-client";

export const metadata: Metadata = { title: "Inventory Transactions" };

type TransactionsPageProps = {
  searchParams?: Promise<{
    search?: string;
    transactionType?: string;
    inventoryItemId?: string;
    userId?: string;
    fromDate?: string;
    toDate?: string;
    page?: string;
  }>;
};

export default async function InventoryTransactionsPage({
  searchParams,
}: TransactionsPageProps) {
  const params = await searchParams;

  const search = params?.search?.trim() ?? "";
  const transactionTypeParam = params?.transactionType;
  const transactionType =
    transactionTypeParam && transactionTypeParam in InventoryTransactionType
      ? (transactionTypeParam as InventoryTransactionType)
      : "ALL";

  const inventoryItemId =
    params?.inventoryItemId && params.inventoryItemId !== "ALL"
      ? params.inventoryItemId
      : "";
  const userId = params?.userId && params.userId !== "ALL" ? params.userId : "";
  const fromDate = params?.fromDate ?? "";
  const toDate = params?.toDate ?? "";

  const page = Math.max(1, Number(params?.page ?? 1));
  const pageSize = 15;

  const where = {
    ...(transactionType !== "ALL" ? { transactionType } : {}),
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
        inventoryItem: {
          select: {
            id: true,
            name: true,
            sku: true,
            unit: true,
          },
        },
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.inventoryItem.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        sku: true,
        unit: true,
      },
      orderBy: { name: "asc" },
    }),
    db.profile.findMany({
      where: { active: true },
      select: {
        id: true,
        fullName: true,
      },
      orderBy: { fullName: "asc" },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">
          Inventory Transactions
        </h1>
        <p className="text-zinc-400 text-sm mt-1">
          Every stock movement is recorded and auditable.
        </p>
      </div>

      <TransactionsClient
        rows={rows.map((row) => ({
          id: row.id,
          inventoryItemId: row.inventoryItem.id,
          inventoryItemName: row.inventoryItem.name,
          inventoryItemSku: row.inventoryItem.sku,
          transactionType: row.transactionType,
          quantity: row.quantity.toString(),
          reason: row.reason,
          notes: row.notes,
          referenceNumber: row.referenceNumber,
          userName: row.user.fullName,
          createdAt: row.createdAt,
        }))}
        inventoryItems={inventoryItems}
        users={users}
        filters={{
          search,
          transactionType,
          inventoryItemId,
          userId,
          fromDate,
          toDate,
          page,
        }}
        pagination={{
          page,
          total,
          totalPages,
          pageSize,
        }}
      />
    </div>
  );
}
