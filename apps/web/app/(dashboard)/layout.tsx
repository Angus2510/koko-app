import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { Sidebar } from "@/components/layout/sidebar";
import type { Profile } from "@koko/database";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authBypass = process.env.AUTH_BYPASS === "true";

  if (authBypass) {
    const localProfile: Profile = {
      id: "local-dev-user",
      fullName: "Local Admin",
      role: "ADMINISTRATOR",
      avatarUrl: null,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return (
      <div className="flex h-screen bg-zinc-950 overflow-hidden">
        <Sidebar profile={localProfile} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    );
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await db.profile.findUnique({
    where: { id: user.id },
  });

  // Profile is created by a Supabase trigger on sign-up.
  // If it's missing, the user account is in an inconsistent state.
  if (!profile || !profile.active) {
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <div className="flex h-screen bg-zinc-950 overflow-hidden">
      <Sidebar profile={profile} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
