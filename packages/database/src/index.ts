import { PrismaClient } from "./generated/client";

// Prevent multiple PrismaClient instances in development (hot reload)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

// Re-export everything from the generated client so consumers
// can import types and enums directly from @koko/database
export * from "./generated/client";
