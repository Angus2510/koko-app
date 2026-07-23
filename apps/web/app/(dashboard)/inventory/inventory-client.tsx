"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { ArrowUpDown, Plus, Search } from "lucide-react";
import {
  InventoryItemCategory,
  InventoryTransactionType,
  type Supplier,
} from "@koko/database";
import { formatDate } from "@koko/utils";
import {
  createInventoryItem,
  updateInventoryItem,
  archiveInventoryItem,
} from "./actions";
import { StockTransactionDialog } from "./stock-transaction-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type InventoryItemRow = {
  id: string;
  name: string;
  sku: string;
  category: InventoryItemCategory;
  unit: string;
  currentStock: string;
  minimumStock: string;
  reorderQuantity: string | null;
  storageLocation: string;
  active: boolean;
  createdAt: Date;
  notes: string | null;
  image: string | null;
  supplierId: string | null;
  supplierName: string | null;
};

type InventoryClientProps = {
  items: InventoryItemRow[];
  suppliers: Pick<Supplier, "id" | "name">[];
  transactionItems: Array<{
    id: string;
    name: string;
    sku: string;
    unit: string;
  }>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  filters: {
    search: string;
    category: "ALL" | InventoryItemCategory;
    sortBy: "name" | "currentStock";
    sortOrder: "asc" | "desc";
  };
};

const CATEGORY_OPTIONS = [
  { label: "Raw Material", value: InventoryItemCategory.RAW_MATERIAL },
  { label: "Consumable", value: InventoryItemCategory.CONSUMABLE },
  { label: "Packaging", value: InventoryItemCategory.PACKAGING },
  { label: "Tool", value: InventoryItemCategory.TOOL },
];

function categoryLabel(category: InventoryItemCategory): string {
  return (
    CATEGORY_OPTIONS.find((option) => option.value === category)?.label ??
    category
  );
}

function getStockStatus(
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

function InventoryFormDialog({
  mode,
  suppliers,
  item,
}: {
  mode: "create" | "edit";
  suppliers: Pick<Supplier, "id" | "name">[];
  item?: InventoryItemRow;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const defaultCategory = item?.category ?? InventoryItemCategory.RAW_MATERIAL;
  const defaultSupplierId = item?.supplierId ?? "NONE";

  function onSubmit(formData: FormData) {
    setError(null);

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createInventoryItem(formData)
          : await updateInventoryItem(formData);

      if (!result.success) {
        setError(result.error ?? "Something went wrong");
        return;
      }

      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {mode === "create" ? (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            Edit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add Inventory Item" : "Edit Inventory Item"}
          </DialogTitle>
        </DialogHeader>

        <form
          action={(formData) => onSubmit(formData)}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {mode === "edit" && (
            <input type="hidden" name="id" defaultValue={item?.id} />
          )}

          <div className="space-y-2">
            <Label htmlFor={`${mode}-name`}>Name</Label>
            <Input
              id={`${mode}-name`}
              name="name"
              defaultValue={item?.name}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${mode}-sku`}>SKU</Label>
            <Input
              id={`${mode}-sku`}
              name="sku"
              defaultValue={item?.sku}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select name="category" defaultValue={defaultCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${mode}-unit`}>Unit</Label>
            <Input
              id={`${mode}-unit`}
              name="unit"
              placeholder="kg, L, pcs"
              defaultValue={item?.unit}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${mode}-minimumStock`}>Minimum Stock</Label>
            <Input
              id={`${mode}-minimumStock`}
              name="minimumStock"
              type="number"
              step="0.01"
              min="0"
              defaultValue={item?.minimumStock}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${mode}-reorderQuantity`}>
              Reorder Quantity (optional)
            </Label>
            <Input
              id={`${mode}-reorderQuantity`}
              name="reorderQuantity"
              type="number"
              step="0.01"
              min="0"
              defaultValue={item?.reorderQuantity ?? undefined}
            />
          </div>

          <div className="space-y-2">
            <Label>Supplier (optional)</Label>
            <Select name="supplierId" defaultValue={defaultSupplierId}>
              <SelectTrigger>
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">None</SelectItem>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor={`${mode}-storageLocation`}>Storage Location</Label>
            <Input
              id={`${mode}-storageLocation`}
              name="storageLocation"
              defaultValue={item?.storageLocation}
              required
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor={`${mode}-image`}>Image URL (optional)</Label>
            <Input
              id={`${mode}-image`}
              name="image"
              type="url"
              defaultValue={item?.image ?? undefined}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor={`${mode}-notes`}>Notes (optional)</Label>
            <textarea
              id={`${mode}-notes`}
              name="notes"
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue={item?.notes ?? undefined}
            />
          </div>

          {error && (
            <p className="md:col-span-2 text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <div className="md:col-span-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? "Saving..."
                : mode === "create"
                  ? "Create Item"
                  : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ArchiveItemDialog({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function onArchive(formData: FormData) {
    startTransition(async () => {
      await archiveInventoryItem(formData);
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          Archive
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Archive item?</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-zinc-400">
          This will mark the item as inactive and remove it from active
          inventory views.
        </p>

        <form
          action={(formData) => onArchive(formData)}
          className="flex justify-end gap-2 mt-4"
        >
          <input type="hidden" name="id" value={id} />
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button type="submit" variant="destructive" disabled={isPending}>
            {isPending ? "Archiving..." : "Archive"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function InventoryClient({
  items,
  suppliers,
  transactionItems,
  pagination,
  filters,
}: InventoryClientProps) {
  const [search, setSearch] = useState(filters.search);

  const sortOrderNext = filters.sortOrder === "asc" ? "desc" : "asc";

  const queryStringBase = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.category !== "ALL") params.set("category", filters.category);
    params.set("sortBy", filters.sortBy);
    params.set("sortOrder", filters.sortOrder);
    return params;
  }, [filters]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3">
            <CardTitle>Inventory Items</CardTitle>
            <div className="flex flex-wrap gap-2">
              <InventoryFormDialog mode="create" suppliers={suppliers} />
              <StockTransactionDialog
                triggerLabel="Receive Stock"
                triggerVariant="secondary"
                triggerSize="lg"
                fixedTransactionType={InventoryTransactionType.RECEIVE}
                items={transactionItems}
              />
              <StockTransactionDialog
                triggerLabel="Issue Stock"
                triggerVariant="outline"
                triggerSize="lg"
                fixedTransactionType={InventoryTransactionType.ISSUE}
                items={transactionItems}
              />
              <StockTransactionDialog
                triggerLabel="Adjust Stock"
                triggerVariant="outline"
                triggerSize="lg"
                fixedTransactionType={InventoryTransactionType.ADJUSTMENT}
                items={transactionItems}
              />
              <Button
                asChild
                variant="outline"
                size="lg"
                className="min-h-[44px]"
              >
                <Link href="/inventory-transactions">View Transactions</Link>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <form
            className="grid grid-cols-1 md:grid-cols-4 gap-3"
            action="/inventory"
            method="get"
          >
            <div className="md:col-span-2 relative">
              <Search className="h-4 w-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                name="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name or SKU"
                className="pl-9"
              />
            </div>

            <Select name="category" defaultValue={filters.category}>
              <SelectTrigger>
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All categories</SelectItem>
                {CATEGORY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Select name="sortBy" defaultValue={filters.sortBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Sort by Name</SelectItem>
                  <SelectItem value="currentStock">
                    Sort by Current Stock
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit">Apply</Button>
            </div>

            <input type="hidden" name="sortOrder" value={filters.sortOrder} />
            <input type="hidden" name="page" value="1" />
          </form>

          <div className="rounded-md border border-zinc-800 overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-zinc-900/70">
                <tr className="text-left text-zinc-400 border-b border-zinc-800">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">
                    <Link
                      href={`/inventory?${new URLSearchParams({
                        ...Object.fromEntries(queryStringBase),
                        sortBy: "currentStock",
                        sortOrder:
                          filters.sortBy === "currentStock"
                            ? sortOrderNext
                            : "desc",
                      }).toString()}`}
                      className="inline-flex items-center gap-1 hover:text-zinc-100"
                    >
                      Stock
                      <ArrowUpDown className="h-3.5 w-3.5" />
                    </Link>
                  </th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-12 text-center text-zinc-500"
                    >
                      No inventory items found.
                    </td>
                  </tr>
                )}

                {items.map((item) => {
                  const current = Number(item.currentStock);
                  const minimum = Number(item.minimumStock);
                  const status = getStockStatus(current, minimum);

                  return (
                    <tr
                      key={item.id}
                      className="border-b border-zinc-800/70 hover:bg-zinc-900/40"
                    >
                      <td className="px-4 py-3 font-medium text-zinc-100">
                        {item.name}
                      </td>
                      <td className="px-4 py-3 text-zinc-300">{item.sku}</td>
                      <td className="px-4 py-3 text-zinc-300">
                        {categoryLabel(item.category)}
                      </td>
                      <td className="px-4 py-3 text-zinc-300">
                        {current.toLocaleString()} {item.unit}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-zinc-300">
                        {item.storageLocation}
                      </td>
                      <td className="px-4 py-3 text-zinc-400">
                        {formatDate(item.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button asChild size="sm" variant="secondary">
                            <Link href={`/inventory/${item.id}`}>View</Link>
                          </Button>
                          <InventoryFormDialog
                            mode="edit"
                            item={item}
                            suppliers={suppliers}
                          />
                          {item.active ? (
                            <ArchiveItemDialog id={item.id} />
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-zinc-400">
            <p>
              Showing {(pagination.page - 1) * pagination.pageSize + 1} -{" "}
              {Math.min(
                pagination.page * pagination.pageSize,
                pagination.total,
              )}{" "}
              of {pagination.total}
            </p>

            <div className="flex gap-2">
              {pagination.page > 1 ? (
                <Button asChild variant="outline" size="sm">
                  <Link
                    href={`/inventory?${new URLSearchParams({
                      ...Object.fromEntries(queryStringBase),
                      page: String(Math.max(1, pagination.page - 1)),
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
                    href={`/inventory?${new URLSearchParams({
                      ...Object.fromEntries(queryStringBase),
                      page: String(
                        Math.min(pagination.totalPages, pagination.page + 1),
                      ),
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
    </div>
  );
}
