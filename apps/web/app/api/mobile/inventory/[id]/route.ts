import { NextResponse, type NextRequest } from "next/server";
import { getMobileInventoryItem } from "@/lib/mobile-inventory";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await getMobileInventoryItem(id);

  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(result);
}
