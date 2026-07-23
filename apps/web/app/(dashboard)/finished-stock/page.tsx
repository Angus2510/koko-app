import type { Metadata } from "next";

export const metadata: Metadata = { title: "Finished Stock" };

export default function FinishedStockPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-white">Finished Stock</h1>
      <p className="text-zinc-400 text-sm mt-1">Coming soon — Phase 5</p>
    </div>
  );
}
