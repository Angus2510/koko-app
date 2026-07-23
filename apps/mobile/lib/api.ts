import Constants from "expo-constants";
import {
  type InventoryItemCategory,
  type InventoryTransactionType,
  type MobileInventoryItem,
  type MobileInventoryTransaction,
} from "@koko/types";

function resolveApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }

  const hostUri = Constants.expoConfig?.hostUri ?? null;
  const host = hostUri?.split(":")[0];
  if (host) {
    return `http://${host}:3000`;
  }

  return "http://localhost:3000";
}

const API_BASE_URL = resolveApiBaseUrl();

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const payload = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;

  if (!response.ok) {
    throw new Error(
      payload?.error ?? `Request failed with status ${response.status}`,
    );
  }

  return payload as T;
}

export type MobileInventoryListResponse = {
  items: MobileInventoryItem[];
  summary: {
    lowStockCount: number;
    criticalStockCount: number;
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  recentTransactions: MobileInventoryTransaction[];
};

export type MobileInventoryDetailsResponse = {
  item: MobileInventoryItem & {
    notes: string | null;
    image: string | null;
    createdAt: string;
  };
  transactions: Array<
    Omit<
      MobileInventoryTransaction,
      "inventoryItemId" | "inventoryItemName" | "inventoryItemSku"
    >
  >;
};

export type MobileTransactionsResponse = {
  rows: MobileInventoryTransaction[];
  inventoryItems: Array<{
    id: string;
    name: string;
    sku: string;
    unit: string;
  }>;
  users: Array<{ id: string; fullName: string }>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  filters: {
    search: string;
    transactionType: InventoryTransactionType | "ALL";
    inventoryItemId: string;
    userId: string;
    fromDate: string;
    toDate: string;
  };
};

export async function fetchMobileInventory(params: {
  search?: string;
  category?: InventoryItemCategory | "ALL";
  page?: number;
  pageSize?: number;
}) {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.category && params.category !== "ALL")
    query.set("category", params.category);
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));

  return requestJson<MobileInventoryListResponse>(
    `/api/mobile/inventory?${query.toString()}`,
  );
}

export async function fetchMobileInventoryItem(id: string) {
  return requestJson<MobileInventoryDetailsResponse>(
    `/api/mobile/inventory/${id}`,
  );
}

export async function fetchMobileTransactions(params: {
  search?: string;
  transactionType?: InventoryTransactionType | "ALL";
  inventoryItemId?: string;
  userId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}) {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.transactionType && params.transactionType !== "ALL")
    query.set("transactionType", params.transactionType);
  if (params.inventoryItemId)
    query.set("inventoryItemId", params.inventoryItemId);
  if (params.userId) query.set("userId", params.userId);
  if (params.fromDate) query.set("fromDate", params.fromDate);
  if (params.toDate) query.set("toDate", params.toDate);
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));

  return requestJson<MobileTransactionsResponse>(
    `/api/mobile/transactions?${query.toString()}`,
  );
}

export async function createMobileTransaction(input: {
  inventoryItemId: string;
  transactionType: InventoryTransactionType;
  quantity: number;
  reason: string;
  notes?: string;
  referenceNumber?: string;
  adjustmentDirection?: "INCREASE" | "DECREASE";
}) {
  return requestJson<{ success: boolean }>("/api/mobile/transactions", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
