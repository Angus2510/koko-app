import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { InventoryTransactionType } from "@koko/database";
import {
  createMobileTransaction,
  listMobileTransactions,
} from "@/lib/mobile-inventory";

const createTransactionSchema = z.object({
  inventoryItemId: z.string().uuid(),
  transactionType: z.nativeEnum(InventoryTransactionType),
  quantity: z.coerce.number().positive(),
  reason: z.string().min(2),
  notes: z.string().optional().or(z.literal("")),
  referenceNumber: z.string().optional().or(z.literal("")),
  adjustmentDirection: z.enum(["INCREASE", "DECREASE"]).optional(),
});

export async function GET(request: NextRequest) {
  const result = await listMobileTransactions(request.nextUrl.searchParams);
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = createTransactionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid input",
      },
      { status: 400 },
    );
  }

  const result = await createMobileTransaction(parsed.data, request);

  if (!result.success) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result);
}
