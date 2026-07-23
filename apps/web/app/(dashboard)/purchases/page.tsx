import type { Metadata } from "next";

export const metadata: Metadata = { title: "Purchases" };

export default function PurchasesPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-white">Purchases</h1>
      <p className="text-zinc-400 text-sm mt-1">Coming soon — Phase 4</p>
    </div>
  );
}
