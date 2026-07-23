import type { Metadata } from "next";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-white">Settings</h1>
      <p className="text-zinc-400 text-sm mt-1">Coming soon — Phase 7</p>
    </div>
  );
}
