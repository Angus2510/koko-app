// Shared types used across web and mobile apps.
// Prisma model types and enums are exported from @koko/database directly.
// This package holds types that have no database dependency.

// ─── Server Action Results ────────────────────────────────────────────────────

export interface ActionResult<T = void> {
  success: boolean;
  error?: string;
  data?: T;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

// ─── Navigation ───────────────────────────────────────────────────────────────

export interface NavItem {
  label: string;
  href: string;
  icon?: string;
  badge?: string | number;
}

// ─── Inventory Domain ────────────────────────────────────────────────────────

export const inventoryItemCategories = [
  "RAW_MATERIAL",
  "CONSUMABLE",
  "PACKAGING",
  "TOOL",
] as const;

export type InventoryItemCategory = (typeof inventoryItemCategories)[number];

export const inventoryTransactionTypes = [
  "RECEIVE",
  "ISSUE",
  "WASTE",
  "ADJUSTMENT",
  "RETURN",
] as const;

export type InventoryTransactionType =
  (typeof inventoryTransactionTypes)[number];

export interface MobileInventoryItem {
  id: string;
  name: string;
  sku: string;
  category: InventoryItemCategory;
  unit: string;
  currentStock: number;
  minimumStock: number;
  storageLocation: string;
  qrCode: string;
  active: boolean;
  supplierName: string | null;
}

export interface MobileInventoryTransaction {
  id: string;
  inventoryItemId: string;
  inventoryItemName: string;
  inventoryItemSku: string;
  transactionType: InventoryTransactionType;
  quantity: number;
  reason: string;
  notes: string | null;
  referenceNumber: string | null;
  userName: string;
  createdAt: string;
}
