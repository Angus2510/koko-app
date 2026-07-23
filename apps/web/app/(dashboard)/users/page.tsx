import type { Metadata } from "next";

export const metadata: Metadata = { title: "User Management" };

export default function UsersPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-white">User Management</h1>
      <p className="text-zinc-400 text-sm mt-1">Coming soon — Phase 7</p>
    </div>
  );
}
