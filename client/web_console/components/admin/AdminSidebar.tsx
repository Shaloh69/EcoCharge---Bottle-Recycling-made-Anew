"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { auth } from "@/lib/api";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/dashboard/kiosks", label: "Kiosks", icon: "🏧" },
  { href: "/dashboard/deposits", label: "Bottle Deposits", icon: "🍶" },
  { href: "/dashboard/sessions", label: "Sessions", icon: "📋" },
  { href: "/dashboard/credits", label: "Credits", icon: "💳" },
  { href: "/dashboard/charging", label: "Charging Log", icon: "⚡" },
  { href: "/dashboard/users", label: "Users", icon: "👥" },
  { href: "/dashboard/alerts", label: "Alerts", icon: "🔔" },
  { href: "/dashboard/ml-review", label: "ML Review", icon: "🤖" },
  { href: "/dashboard/analytics", label: "Analytics", icon: "📈" },
  { href: "/dashboard/settings", label: "Settings", icon: "⚙️" },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    auth.clear();
    router.push("/login");
  }

  return (
    <aside
      className="w-64 min-h-screen flex flex-col"
      style={{ backgroundColor: "#1B5E20" }}
    >
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌿</span>
          <div>
            <p className="text-white font-bold text-lg">EcoCharge</p>
            <p className="text-white/60 text-xs">Admin Console</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? "bg-white/20 text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
              href={item.href}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-white/10 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-bold">
            A
          </div>
          <div>
            <p className="text-white text-sm font-medium">Admin</p>
            <p className="text-white/60 text-xs">admin@ecocharge.ph</p>
          </div>
        </div>
        <button
          className="w-full text-left px-4 py-2 rounded-xl text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          onClick={handleLogout}
        >
          🚪 Sign out
        </button>
      </div>
    </aside>
  );
}
