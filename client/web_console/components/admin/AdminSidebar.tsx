"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { auth } from "@/lib/api";

const navGroups = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "📊", accent: "#4CAF50" },
      {
        href: "/dashboard/kiosks",
        label: "Kiosks",
        icon: "🏧",
        accent: "#14B8A6",
      },
      {
        href: "/dashboard/alerts",
        label: "Alerts",
        icon: "🔔",
        accent: "#EF4444",
      },
    ],
  },
  {
    label: "Data",
    items: [
      {
        href: "/dashboard/deposits",
        label: "Bottle Deposits",
        icon: "🍶",
        accent: "#0EA5E9",
      },
      {
        href: "/dashboard/charging",
        label: "Charging Log",
        icon: "⚡",
        accent: "#F59E0B",
      },
      {
        href: "/dashboard/sessions",
        label: "Sessions",
        icon: "📋",
        accent: "#84CC16",
      },
    ],
  },
  {
    label: "Finance",
    items: [
      {
        href: "/dashboard/credits",
        label: "Credits",
        icon: "💳",
        accent: "#EAB308",
      },
      {
        href: "/dashboard/users",
        label: "Users",
        icon: "👥",
        accent: "#A855F7",
      },
    ],
  },
  {
    label: "Insights",
    items: [
      {
        href: "/dashboard/ml-review",
        label: "ML Review",
        icon: "🤖",
        accent: "#6B9E78",
      },
      {
        href: "/dashboard/analytics",
        label: "Analytics",
        icon: "📈",
        accent: "#10B981",
      },
      {
        href: "/dashboard/settings",
        label: "Settings",
        icon: "⚙️",
        accent: "#94A3B8",
      },
    ],
  },
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
      style={{
        background:
          "linear-gradient(180deg, #051A08 0%, #0A2E0F 60%, #071310 100%)",
        borderRight: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* Logo */}
      <div
        className="p-6"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{
              background:
                "linear-gradient(135deg, rgba(76,175,80,0.30), rgba(20,184,166,0.20))",
              border: "1px solid rgba(76,175,80,0.35)",
            }}
          >
            🌿
          </div>
          <div>
            <p
              className="font-extrabold text-base tracking-tight"
              style={{
                background: "linear-gradient(90deg, #4ADE80, #2DD4BF)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              EcoCharge
            </p>
            <p
              className="text-[10px] tracking-widest uppercase"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              Admin Console
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p
              className="px-3 text-[10px] font-semibold tracking-widest uppercase mb-2"
              style={{ color: "rgba(255,255,255,0.25)" }}
            >
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
                    href={item.href}
                    style={
                      isActive
                        ? {
                            background: `linear-gradient(90deg, ${item.accent}22, ${item.accent}0a)`,
                            border: `1px solid ${item.accent}40`,
                            color: item.accent,
                            boxShadow: `0 2px 12px ${item.accent}20`,
                          }
                        : {
                            color: "rgba(255,255,255,0.55)",
                            border: "1px solid transparent",
                          }
                    }
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.color =
                          "rgba(255,255,255,0.88)";
                        (e.currentTarget as HTMLElement).style.background =
                          "rgba(255,255,255,0.06)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.color =
                          "rgba(255,255,255,0.55)";
                        (e.currentTarget as HTMLElement).style.background =
                          "transparent";
                      }
                    }}
                  >
                    <span className="text-base w-5 text-center leading-none">
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                    {isActive && (
                      <span
                        className="ml-auto w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: item.accent }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div
        className="p-4 space-y-3"
        style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="flex items-center gap-3 px-1">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
            style={{
              background: "linear-gradient(135deg, #166534, #14B8A6)",
              color: "#fff",
            }}
          >
            A
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="text-sm font-semibold truncate"
              style={{ color: "rgba(255,255,255,0.85)" }}
            >
              Admin
            </p>
            <p
              className="text-[10px] truncate"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              admin@ecocharge.ph
            </p>
          </div>
        </div>
        <button
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all duration-200"
          style={{
            color: "rgba(255,255,255,0.40)",
            border: "1px solid transparent",
          }}
          onClick={handleLogout}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = "#FCA5A5";
            (e.currentTarget as HTMLElement).style.background =
              "rgba(239,68,68,0.10)";
            (e.currentTarget as HTMLElement).style.border =
              "1px solid rgba(239,68,68,0.20)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color =
              "rgba(255,255,255,0.40)";
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.border =
              "1px solid transparent";
          }}
        >
          <span>🚪</span>
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
