import type { Metadata } from "next";
import { Factory, Package, Archive, TrendingDown } from "lucide-react";

export const metadata: Metadata = { title: "Dashboard" };

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: string;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex items-start gap-4">
      <div className={`p-2.5 rounded-lg ${accent ?? "bg-zinc-800"}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-zinc-400 text-sm">{label}</p>
        <p className="text-white text-2xl font-semibold mt-0.5">{value}</p>
        {sub && <p className="text-zinc-500 text-xs mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const today = new Date().toLocaleDateString("en-AU", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
        <p className="text-zinc-400 text-sm mt-1">{today}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Today's Production"
          value="—"
          sub="Jobs completed today"
          icon={Factory}
          accent="bg-blue-600"
        />
        <StatCard
          label="In Progress"
          value="—"
          sub="Active production jobs"
          icon={Factory}
          accent="bg-violet-600"
        />
        <StatCard
          label="Finished Stock"
          value="—"
          sub="Units ready to ship"
          icon={Archive}
          accent="bg-emerald-600"
        />
        <StatCard
          label="Low Stock Items"
          value="—"
          sub="Below minimum threshold"
          icon={Package}
          accent="bg-amber-600"
        />
      </div>

      {/* Production by stage + Recent activity — populated in a later phase */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-white font-medium mb-4">Production by Stage</h2>
          <div className="flex items-center justify-center h-32 text-zinc-600 text-sm">
            No active jobs
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-white font-medium mb-4">Recent Activity</h2>
          <div className="flex items-center justify-center h-32 text-zinc-600 text-sm">
            No recent activity
          </div>
        </div>
      </div>

      {/* Low inventory — populated once Inventory module is built */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown className="h-4 w-4 text-amber-500" />
          <h2 className="text-white font-medium">Low Inventory</h2>
        </div>
        <div className="flex items-center justify-center h-20 text-zinc-600 text-sm">
          No items below minimum stock
        </div>
      </div>
    </div>
  );
}
