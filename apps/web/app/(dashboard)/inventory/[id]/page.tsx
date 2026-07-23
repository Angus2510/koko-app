import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import type { Metadata } from "next";
import {
  db,
  InventoryItemCategory,
  InventoryTransactionType,
} from "@koko/database";
import { formatDate, formatDateTime } from "@koko/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const metadata: Metadata = { title: "Inventory Item" };

function categoryLabel(category: InventoryItemCategory): string {
  switch (category) {
    case InventoryItemCategory.RAW_MATERIAL:
      return "Raw Material";
    case InventoryItemCategory.CONSUMABLE:
      return "Consumable";
    case InventoryItemCategory.PACKAGING:
      return "Packaging";
    case InventoryItemCategory.TOOL:
      return "Tool";
    default:
      return category;
  }
}

function stockStatus(
  currentStock: number,
  minimumStock: number,
): {
  label: "Healthy" | "Low Stock" | "Below Minimum";
  variant: "success" | "warning" | "destructive";
} {
  if (currentStock < minimumStock) {
    return { label: "Below Minimum", variant: "destructive" };
  }

  if (currentStock <= minimumStock * 1.2) {
    return { label: "Low Stock", variant: "warning" };
  }

  return { label: "Healthy", variant: "success" };
}

function transactionTypeLabel(type: InventoryTransactionType): string {
  switch (type) {
    case InventoryTransactionType.RECEIVE:
      return "Receive Stock";
    case InventoryTransactionType.ISSUE:
      return "Issue Stock";
    case InventoryTransactionType.WASTE:
      return "Waste";
    case InventoryTransactionType.ADJUSTMENT:
      return "Adjustment";
    case InventoryTransactionType.RETURN:
      return "Return";
    default:
      return type;
  }
}

export default async function InventoryItemDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const item = await db.inventoryItem.findUnique({
    where: { id },
    include: {
      supplier: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!item) {
    notFound();
  }

  const transactions = await db.inventoryTransaction.findMany({
    where: { inventoryItemId: item.id },
    include: {
      user: {
        select: {
          fullName: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const currentStock = Number(item.currentStock);
  const minimumStock = Number(item.minimumStock);
  const status = stockStatus(currentStock, minimumStock);
  const qrCodeImage = await QRCode.toDataURL(item.qrCode, {
    margin: 1,
    width: 180,
  });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">{item.name}</h1>
          <p className="text-zinc-400 text-sm mt-1">SKU: {item.sku}</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/inventory">Back to Inventory</Link>
        </Button>
      </div>

      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Item Details</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-zinc-500 text-xs uppercase tracking-wide">
                    Name
                  </p>
                  <p className="text-zinc-100 mt-1">{item.name}</p>
                </div>
                <div>
                  <p className="text-zinc-500 text-xs uppercase tracking-wide">
                    SKU
                  </p>
                  <p className="text-zinc-100 mt-1">{item.sku}</p>
                </div>
                <div>
                  <p className="text-zinc-500 text-xs uppercase tracking-wide">
                    Category
                  </p>
                  <p className="text-zinc-100 mt-1">
                    {categoryLabel(item.category)}
                  </p>
                </div>
                <div>
                  <p className="text-zinc-500 text-xs uppercase tracking-wide">
                    Unit
                  </p>
                  <p className="text-zinc-100 mt-1">{item.unit}</p>
                </div>
                <div>
                  <p className="text-zinc-500 text-xs uppercase tracking-wide">
                    Current Stock
                  </p>
                  <p className="text-zinc-100 mt-1">
                    {currentStock.toLocaleString()} {item.unit}
                  </p>
                </div>
                <div>
                  <p className="text-zinc-500 text-xs uppercase tracking-wide">
                    Minimum Stock
                  </p>
                  <p className="text-zinc-100 mt-1">
                    {minimumStock.toLocaleString()} {item.unit}
                  </p>
                </div>
                <div>
                  <p className="text-zinc-500 text-xs uppercase tracking-wide">
                    Storage Location
                  </p>
                  <p className="text-zinc-100 mt-1">{item.storageLocation}</p>
                </div>
                <div>
                  <p className="text-zinc-500 text-xs uppercase tracking-wide">
                    Supplier
                  </p>
                  <p className="text-zinc-100 mt-1">
                    {item.supplier?.name ?? "Not assigned"}
                  </p>
                </div>
                <div>
                  <p className="text-zinc-500 text-xs uppercase tracking-wide">
                    Created Date
                  </p>
                  <p className="text-zinc-100 mt-1">
                    {formatDate(item.createdAt)}
                  </p>
                </div>
                <div>
                  <p className="text-zinc-500 text-xs uppercase tracking-wide">
                    Status
                  </p>
                  <div className="mt-1">
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <p className="text-zinc-500 text-xs uppercase tracking-wide">
                    Notes
                  </p>
                  <p className="text-zinc-100 mt-1 whitespace-pre-wrap">
                    {item.notes && item.notes.length > 0
                      ? item.notes
                      : "No notes"}
                  </p>
                </div>
                {item.image ? (
                  <div className="md:col-span-2">
                    <p className="text-zinc-500 text-xs uppercase tracking-wide mb-2">
                      Image
                    </p>
                    <Image
                      src={item.image}
                      alt={item.name}
                      width={480}
                      height={320}
                      className="rounded-md border border-zinc-800 object-cover"
                    />
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>QR Code</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Image
                  src={qrCodeImage}
                  alt={`QR code for ${item.name}`}
                  width={180}
                  height={180}
                  className="rounded-md border border-zinc-800 bg-white p-2"
                />
                <div>
                  <p className="text-zinc-500 text-xs uppercase tracking-wide">
                    QR Value
                  </p>
                  <p className="text-zinc-100 mt-1 break-all text-sm">
                    {item.qrCode}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-zinc-800 overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-zinc-900/70">
                    <tr className="text-left text-zinc-400 border-b border-zinc-800">
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Quantity</th>
                      <th className="px-4 py-3">Reason</th>
                      <th className="px-4 py-3">Reference</th>
                      <th className="px-4 py-3">User</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-12 text-center text-zinc-500"
                        >
                          No transactions yet.
                        </td>
                      </tr>
                    ) : null}

                    {transactions.map((transaction) => (
                      <tr
                        key={transaction.id}
                        className="border-b border-zinc-800/70 hover:bg-zinc-900/40"
                      >
                        <td className="px-4 py-3 text-zinc-300">
                          {formatDateTime(transaction.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-zinc-300">
                          {transactionTypeLabel(transaction.transactionType)}
                        </td>
                        <td className="px-4 py-3 text-zinc-300">
                          {Number(transaction.quantity).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-zinc-300">
                          {transaction.reason}
                        </td>
                        <td className="px-4 py-3 text-zinc-400">
                          {transaction.referenceNumber ?? "-"}
                        </td>
                        <td className="px-4 py-3 text-zinc-300">
                          {transaction.user.fullName}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
