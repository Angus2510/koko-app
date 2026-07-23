import type { Metadata } from "next";

export const metadata: Metadata = { title: "Production" };

export default function ProductionPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-white">Production</h1>
      <p className="text-zinc-400 text-sm mt-1">Coming soon — Phase 2</p>
    </div>
  );
}
