"use client";

import { useState, useTransition } from "react";
import { InventoryTransactionType } from "@koko/database";
import { createInventoryTransaction } from "../inventory-transactions/actions";
import { Button } from "@/components/ui/button";
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

type InventoryItemOption = {
  id: string;
  name: string;
  sku: string;
  unit: string;
};

type StockTransactionDialogProps = {
  triggerLabel: string;
  triggerVariant?: "default" | "secondary" | "outline" | "destructive";
  triggerSize?: "default" | "sm" | "lg" | "icon";
  fixedTransactionType?: InventoryTransactionType;
  items: InventoryItemOption[];
};

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

export function StockTransactionDialog({
  triggerLabel,
  triggerVariant = "default",
  triggerSize = "default",
  fixedTransactionType,
  items,
}: StockTransactionDialogProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [transactionType, setTransactionType] =
    useState<InventoryTransactionType>(
      fixedTransactionType ?? InventoryTransactionType.RECEIVE,
    );

  function submitTransaction(formData: FormData) {
    setError(null);

    if (fixedTransactionType) {
      formData.set("transactionType", fixedTransactionType);
    }

    startTransition(async () => {
      const result = await createInventoryTransaction(formData);
      if (!result.success) {
        setError(result.error ?? "Failed to create transaction");
        return;
      }

      setOpen(false);
    });
  }

  const isAdjustment =
    (fixedTransactionType ?? transactionType) ===
    InventoryTransactionType.ADJUSTMENT;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={triggerVariant}
          size={triggerSize}
          className="min-h-[44px]"
        >
          {triggerLabel}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {fixedTransactionType
              ? transactionTypeLabel(fixedTransactionType)
              : "New Inventory Transaction"}
          </DialogTitle>
        </DialogHeader>

        <form
          action={(formData) => submitTransaction(formData)}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div className="space-y-2 md:col-span-2">
            <Label>Inventory Item</Label>
            <Select name="inventoryItemId" defaultValue={items[0]?.id}>
              <SelectTrigger>
                <SelectValue placeholder="Select item" />
              </SelectTrigger>
              <SelectContent>
                {items.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name} ({item.sku})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {fixedTransactionType ? (
            <input
              type="hidden"
              name="transactionType"
              value={fixedTransactionType}
            />
          ) : (
            <div className="space-y-2 md:col-span-2">
              <Label>Transaction Type</Label>
              <Select
                name="transactionType"
                defaultValue={transactionType}
                onValueChange={(value) =>
                  setTransactionType(value as InventoryTransactionType)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select transaction type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(InventoryTransactionType).map((type) => (
                    <SelectItem key={type} value={type}>
                      {transactionTypeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="transaction-quantity">Quantity</Label>
            <Input
              id="transaction-quantity"
              name="quantity"
              type="number"
              min="0.0001"
              step="0.0001"
              required
            />
          </div>

          {isAdjustment ? (
            <div className="space-y-2">
              <Label>Adjustment Direction</Label>
              <Select name="adjustmentDirection" defaultValue="INCREASE">
                <SelectTrigger>
                  <SelectValue placeholder="Select direction" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INCREASE">Increase</SelectItem>
                  <SelectItem value="DECREASE">Decrease</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="transaction-reason">Reason</Label>
            <Input id="transaction-reason" name="reason" required />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="transaction-reference">
              Reference Number (optional)
            </Label>
            <Input id="transaction-reference" name="referenceNumber" />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="transaction-notes">Notes (optional)</Label>
            <textarea
              id="transaction-notes"
              name="notes"
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          {error ? (
            <p className="md:col-span-2 text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-md px-3 py-2">
              {error}
            </p>
          ) : null}

          <div className="md:col-span-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Transaction"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
