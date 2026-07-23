"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Factory,
  Package,
  ShoppingCart,
  Archive,
  BarChart2,
  Settings,
  Users,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/auth/actions";
import { getInitials, formatRole } from "@koko/utils";
import type { Profile, Role } from "@koko/database";

// ─── Navigation Config ────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  allowedRoles?: Role[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Production",
    href: "/production",
    icon: Factory,
    allowedRoles: ["ADMINISTRATOR", "PRODUCTION_MANAGER", "PRODUCTION_WORKER"],
  },
  {
    label: "Inventory",
    href: "/inventory",
    icon: Package,
    allowedRoles: ["ADMINISTRATOR", "PRODUCTION_MANAGER", "STOREMAN"],
  },
  {
    label: "Purchases",
    href: "/purchases",
    icon: ShoppingCart,
    allowedRoles: ["ADMINISTRATOR", "PRODUCTION_MANAGER", "STOREMAN"],
  },
  {
    label: "Finished Stock",
    href: "/finished-stock",
    icon: Archive,
  },
  {
    label: "Reports",
    href: "/reports",
    icon: BarChart2,
    allowedRoles: ["ADMINISTRATOR", "PRODUCTION_MANAGER"],
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    allowedRoles: ["ADMINISTRATOR"],
  },
  {
    label: "Users",
    href: "/users",
    icon: Users,
    allowedRoles: ["ADMINISTRATOR"],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function Sidebar({ profile }: { profile: Profile }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.allowedRoles || item.allowedRoles.includes(profile.role),
  );

  return (
    <aside
      className={cn(
        "relative flex flex-col h-screen bg-zinc-900 border-r border-zinc-800 transition-all duration-200 shrink-0",
        collapsed ? "w-[60px]" : "w-[220px]",
      )}
    >
      {/* ── Logo ─────────────────────────────────────────────────────────────── */}
      <div
        className={cn(
          "flex items-center h-14 px-3 border-b border-zinc-800 shrink-0",
          collapsed ? "justify-center" : "justify-between",
        )}
      >
        {!collapsed && (
          <span className="text-white font-semibold text-sm tracking-widest uppercase select-none">
            KOKO MOS
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "p-1.5 rounded-md text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 transition-colors",
            collapsed && "w-full flex justify-center",
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* ── Navigation ───────────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {visibleItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md text-sm font-medium transition-colors",
                "min-h-[44px] px-3",
                isActive
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60",
                collapsed && "justify-center px-0",
              )}
            >
              <Icon
                className={cn(
                  "h-[18px] w-[18px] shrink-0",
                  isActive ? "text-white" : "text-zinc-500",
                )}
              />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* ── User Footer ──────────────────────────────────────────────────────── */}
      <div
        className={cn(
          "shrink-0 border-t border-zinc-800 p-3",
          collapsed ? "flex flex-col items-center gap-2" : "space-y-1",
        )}
      >
        {/* User info */}
        <div
          className={cn(
            "flex items-center gap-2.5",
            collapsed && "justify-center",
          )}
        >
          <div className="h-8 w-8 rounded-full bg-zinc-700 flex items-center justify-center shrink-0">
            <span className="text-zinc-300 text-xs font-semibold">
              {getInitials(profile.fullName)}
            </span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-zinc-200 text-sm font-medium truncate">
                {profile.fullName}
              </p>
              <p className="text-zinc-500 text-xs truncate">
                {formatRole(profile.role)}
              </p>
            </div>
          )}
        </div>

        {/* Sign out */}
        <form action={signOut}>
          <button
            type="submit"
            title="Sign out"
            className={cn(
              "flex items-center gap-2.5 w-full rounded-md px-2 py-2 text-zinc-500",
              "hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors text-sm",
              collapsed && "justify-center",
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </form>
      </div>
    </aside>
  );
}
