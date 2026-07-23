import type { Metadata } from "next";
import { db, InventoryItemCategory } from "@koko/database";
import { InventoryClient } from "./inventory-client";

export const metadata: Metadata = { title: "Inventory" };

type InventoryPageProps = {
  searchParams?: Promise<{
    search?: string;
    category?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: string;
  }>;
};

export default async function InventoryPage({
  searchParams,
}: InventoryPageProps) {
  const params = await searchParams;
  const search = params?.search?.trim() ?? "";
  const categoryParam = params?.category;
  const category =
    categoryParam && categoryParam in InventoryItemCategory
      ? (categoryParam as InventoryItemCategory)
      : "ALL";

  const sortBy = params?.sortBy === "currentStock" ? "currentStock" : "name";
  const sortOrder = params?.sortOrder === "desc" ? "desc" : "asc";
  const page = Math.max(1, Number(params?.page ?? 1));
  const pageSize = 10;

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
    ...(category !== "ALL" ? { category } : {}),
  };

  const [total, items, suppliers, transactionItems] = await Promise.all([
    db.inventoryItem.count({ where }),
    db.inventoryItem.findMany({
      where,
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.supplier.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: "asc" },
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
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Inventory</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Manage raw materials, consumables, packaging, and tools.
        </p>
      </div>

      <InventoryClient
        items={items.map((item) => ({
          id: item.id,
          name: item.name,
          sku: item.sku,
          category: item.category,
          unit: item.unit,
          currentStock: item.currentStock.toString(),
          minimumStock: item.minimumStock.toString(),
          reorderQuantity: item.reorderQuantity?.toString() ?? null,
          storageLocation: item.storageLocation,
          active: item.active,
          createdAt: item.createdAt,
          notes: item.notes,
          image: item.image,
          supplierId: item.supplierId,
          supplierName: item.supplier?.name ?? null,
        }))}
        suppliers={suppliers}
        transactionItems={transactionItems}
        pagination={{
          page,
          pageSize,
          total,
          totalPages,
        }}
        filters={{
          search,
          category,
          sortBy,
          sortOrder,
        }}
      />
    </div>
  );
}
