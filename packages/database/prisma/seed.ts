import { PrismaClient } from "../src/generated/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ─── Production Stages ──────────────────────────────────────────────────────
  const stages = [
    { name: "Casting", order: 1, color: "#3b82f6", isTerminal: false },
    { name: "Demoulding", order: 2, color: "#8b5cf6", isTerminal: false },
    { name: "Trimming", order: 3, color: "#f59e0b", isTerminal: false },
    { name: "Sanding", order: 4, color: "#f97316", isTerminal: false },
    { name: "Polishing", order: 5, color: "#a855f7", isTerminal: false },
    { name: "Quality Control", order: 6, color: "#ef4444", isTerminal: false },
    { name: "Finished", order: 7, color: "#06b6d4", isTerminal: false },
    { name: "Stored", order: 8, color: "#22c55e", isTerminal: true },
  ];

  for (const stage of stages) {
    await prisma.productionStage.upsert({
      where: { name: stage.name },
      update: {
        order: stage.order,
        color: stage.color,
        isTerminal: stage.isTerminal,
      },
      create: stage,
    });
  }
  console.log(`  ✓ ${stages.length} production stages`);

  // ─── Product Categories ──────────────────────────────────────────────────────
  const productCategories = ["Baths", "Basins"];
  for (const name of productCategories) {
    await prisma.productCategory.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(`  ✓ ${productCategories.length} product categories`);

  // ─── Sample Products ─────────────────────────────────────────────────────────
  const bathCategory = await prisma.productCategory.findUniqueOrThrow({
    where: { name: "Baths" },
  });
  const basinCategory = await prisma.productCategory.findUniqueOrThrow({
    where: { name: "Basins" },
  });

  const products = [
    {
      name: "1700 Freestanding Bath",
      sku: "BATH-1700-FS",
      categoryId: bathCategory.id,
    },
    {
      name: "1500 Back To Wall Bath",
      sku: "BATH-1500-BTW",
      categoryId: bathCategory.id,
    },
    {
      name: "1200 Corner Bath",
      sku: "BATH-1200-CRN",
      categoryId: bathCategory.id,
    },
    {
      name: "1800 Double Ended Bath",
      sku: "BATH-1800-DE",
      categoryId: bathCategory.id,
    },
    {
      name: "1400 Compact Bath",
      sku: "BATH-1400-CPT",
      categoryId: bathCategory.id,
    },
    {
      name: "Oval Counter Basin",
      sku: "BSIN-OVL-CTR",
      categoryId: basinCategory.id,
    },
    {
      name: "Round Drop-In Basin",
      sku: "BSIN-RND-DRP",
      categoryId: basinCategory.id,
    },
    {
      name: "Rectangle Wall Basin",
      sku: "BSIN-RCT-WLL",
      categoryId: basinCategory.id,
    },
    {
      name: "Square Vessel Basin",
      sku: "BSIN-SQR-VSL",
      categoryId: basinCategory.id,
    },
    {
      name: "Semi-Recessed Basin",
      sku: "BSIN-SMR-RCS",
      categoryId: basinCategory.id,
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { sku: product.sku },
      update: {},
      create: product,
    });
  }
  console.log(`  ✓ ${products.length} sample products`);

  console.log("\n✅ Seed completed successfully");
  console.log(
    "\n⚠️  Remember to create your first admin user via Supabase Auth dashboard,",
  );
  console.log(
    "   then update their profile role to ADMINISTRATOR in the profiles table.\n",
  );
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
