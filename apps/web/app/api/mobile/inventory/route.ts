import { NextResponse, type NextRequest } from "next/server";
import { listMobileInventory } from "@/lib/mobile-inventory";

export async function GET(request: NextRequest) {
  const result = await listMobileInventory(request.nextUrl.searchParams);
  return NextResponse.json(result);
}
