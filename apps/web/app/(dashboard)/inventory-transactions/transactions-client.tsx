"use client";

import Link from "next/link";
import { useState } from "react";
import { InventoryTransactionType } from "@koko/database";
import { formatDateTime } from "@koko/utils";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StockTransactionDialog } from "../inventory/stock-transaction-dialog";

type TransactionRow = {
  id: string;
  inventoryItemId: string;
  inventoryItemName: string;
  inventoryItemSku: string;
  transactionType: InventoryTransactionType;
  quantity: string;
  reason: string;
  notes: string | null;
  referenceNumber: string | null;
  userName: string;
  createdAt: Date;
};

type TransactionsClientProps = {
  rows: TransactionRow[];
  inventoryItems: Array<{
    id: string;
    name: string;
    sku: string;
    unit: string;
  }>;
  users: Array<{ id: string; fullName: string }>;
  filters: {
    search: string;
    transactionType: "ALL" | InventoryTransactionType;
    inventoryItemId: string;
    userId: string;
    fromDate: string;
    toDate: string;
    page: number;
  };
  pagination: {
    page: number;
    total: number;
    totalPages: number;
    pageSize: number;
  };
};

function typeLabel(type: InventoryTransactionType): string {
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

function typeVariant(
  type: InventoryTransactionType,
): "success" | "warning" | "destructive" | "secondary" {
  switch (type) {
    case InventoryTransactionType.RECEIVE:
    case InventoryTransactionType.RETURN:
      return "success";
    case InventoryTransactionType.ISSUE:
      return "warning";
    case InventoryTransactionType.WASTE:
      return "destructive";
    case InventoryTransactionType.ADJUSTMENT:
      return "secondary";
    default:
      return "secondary";
  }
}

export function TransactionsClient({
  rows,
  inventoryItems,
  users,
  filters,
  pagination,
}: TransactionsClientProps) {
  const [search, setSearch] = useState(filters.search);

  const baseParams = new URLSearchParams();
  if (filters.search) baseParams.set("search", filters.search);
  if (filters.transactionType !== "ALL")
    baseParams.set("transactionType", filters.transactionType);
  if (filters.inventoryItemId)
    baseParams.set("inventoryItemId", filters.inventoryItemId);
  if (filters.userId) baseParams.set("userId", filters.userId);
  if (filters.fromDate) baseParams.set("fromDate", filters.fromDate);
  if (filters.toDate) baseParams.set("toDate", filters.toDate);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3">
          <CardTitle>Inventory Transactions</CardTitle>
          <div className="flex flex-wrap gap-2">
            <StockTransactionDialog
              triggerLabel="New Transaction"
              triggerVariant="default"
              triggerSize="lg"
              items={inventoryItems}
            />
            <Button
              asChild
              variant="outline"
              size="lg"
              className="min-h-[44px]"
            >
              <Link href="/inventory">Back to Inventory</Link>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <form
          action="/inventory-transactions"
          method="get"
          className="grid grid-cols-1 md:grid-cols-3 gap-3"
        >
          <div className="relative md:col-span-3">
            <Search className="h-4 w-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              name="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search reason, notes, reference, item, or SKU"
              className="pl-9"
            />
          </div>

          <div className="space-y-2">
            <Label>Transaction Type</Label>
            <Select
              name="transactionType"
              defaultValue={filters.transactionType}
            >
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All types</SelectItem>
                {Object.values(InventoryTransactionType).map((type) => (
                  <SelectItem key={type} value={type}>
                    {typeLabel(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Inventory Item</Label>
            <Select
              name="inventoryItemId"
              defaultValue={filters.inventoryItemId || "ALL"}
            >
              <SelectTrigger>
                <SelectValue placeholder="All items" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All items</SelectItem>
                {inventoryItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name} ({item.sku})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>User</Label>
            <Select name="userId" defaultValue={filters.userId || "ALL"}>
              <SelectTrigger>
                <SelectValue placeholder="All users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All users</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fromDate">From Date</Label>
            <Input
              id="fromDate"
              name="fromDate"
              type="date"
              defaultValue={filters.fromDate}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="toDate">To Date</Label>
            <Input
              id="toDate"
              name="toDate"
              type="date"
              defaultValue={filters.toDate}
            />
          </div>

          <div className="flex items-end gap-2">
            <input type="hidden" name="page" value="1" />
            <Button type="submit">Apply Filters</Button>
          </div>
        </form>

        <div className="rounded-md border border-zinc-800 overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-zinc-900/70">
              <tr className="text-left text-zinc-400 border-b border-zinc-800">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Quantity</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">User</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-zinc-500"
                  >
                    No transactions found.
                  </td>
                </tr>
              ) : null}

              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-zinc-800/70 hover:bg-zinc-900/40"
                >
                  <td className="px-4 py-3 text-zinc-300">
                    {formatDateTime(row.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-zinc-100">
                    <Link
                      className="hover:underline"
                      href={`/inventory/${row.inventoryItemId}`}
                    >
                      {row.inventoryItemName}
                    </Link>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {row.inventoryItemSku}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={typeVariant(row.transactionType)}>
                      {typeLabel(row.transactionType)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">
                    {Number(row.quantity).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-zinc-300">{row.reason}</td>
                  <td className="px-4 py-3 text-zinc-400">
                    {row.referenceNumber ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-zinc-300">{row.userName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-zinc-400">
          <p>
            Showing {(pagination.page - 1) * pagination.pageSize + 1} -{" "}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)}{" "}
            of {pagination.total}
          </p>

          <div className="flex gap-2">
            {pagination.page > 1 ? (
              <Button asChild variant="outline" size="sm">
                <Link
                  href={`/inventory-transactions?${new URLSearchParams({
                    ...Object.fromEntries(baseParams),
                    page: String(pagination.page - 1),
                  }).toString()}`}
                >
                  Previous
                </Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
            )}

            {pagination.page < pagination.totalPages ? (
              <Button asChild variant="outline" size="sm">
                <Link
                  href={`/inventory-transactions?${new URLSearchParams({
                    ...Object.fromEntries(baseParams),
                    page: String(pagination.page + 1),
                  }).toString()}`}
                >
                  Next
                </Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Next
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
