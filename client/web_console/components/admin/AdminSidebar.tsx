"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  ActionIcon,
  Avatar,
  Box,
  Divider,
  NavLink,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import {
  BarChart3,
  Bell,
  Bot,
  CreditCard,
  Droplet,
  LayoutDashboard,
  Leaf,
  ListChecks,
  LogOut,
  Moon,
  Server,
  Settings,
  Sun,
  Users,
  Zap,
} from "lucide-react";

import { auth, type User } from "@/lib/api";

const navGroups = [
  {
    label: "Overview",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        color: "ecoGreen",
      },
      {
        href: "/dashboard/kiosks",
        label: "Kiosks",
        icon: Server,
        color: "voltTeal",
      },
      {
        href: "/dashboard/alerts",
        label: "Alerts",
        icon: Bell,
        color: "dangerRed",
      },
    ],
  },
  {
    label: "Data",
    items: [
      {
        href: "/dashboard/deposits",
        label: "Bottle Deposits",
        icon: Droplet,
        color: "voltTeal",
      },
      {
        href: "/dashboard/charging",
        label: "Charging Log",
        icon: Zap,
        color: "warningAmber",
      },
      {
        href: "/dashboard/sessions",
        label: "Sessions",
        icon: ListChecks,
        color: "successLime",
      },
    ],
  },
  {
    label: "Finance",
    items: [
      {
        href: "/dashboard/credits",
        label: "Credits",
        icon: CreditCard,
        color: "warningAmber",
      },
      {
        href: "/dashboard/users",
        label: "Users",
        icon: Users,
        color: "bloomViolet",
      },
    ],
  },
  {
    label: "Insights",
    items: [
      {
        href: "/dashboard/ml-review",
        label: "ML Review",
        icon: Bot,
        color: "ecoGreen",
      },
      {
        href: "/dashboard/analytics",
        label: "Analytics",
        icon: BarChart3,
        color: "voltTeal",
      },
      {
        href: "/dashboard/settings",
        label: "Settings",
        icon: Settings,
        color: "gray",
      },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();

  // Read once on the client. sessionStorage is unavailable during SSR, so
  // reading it in an effect (not inline) keeps server and client markup
  // identical — the same hydration-mismatch trap that bit the kiosk auth page.
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    setCurrentUser(auth.getUser());
  }, []);

  function handleLogout() {
    auth.clear();
    router.push("/login");
  }

  return (
    <Box
      component="aside"
      style={{
        width: 256,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid var(--mantine-color-default-border)",
      }}
    >
      {/* Logo */}
      <Box
        p="lg"
        style={{
          borderBottom: "1px solid var(--mantine-color-default-border)",
        }}
      >
        <Box style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <ThemeIcon color="ecoGreen" radius="md" size={40} variant="light">
            <Leaf size={20} />
          </ThemeIcon>
          <Box>
            <Text fw={800} size="sm" style={{ letterSpacing: -0.2 }}>
              EcoCharge
            </Text>
            <Text
              c="dimmed"
              size="10px"
              style={{ letterSpacing: "0.12em" }}
              tt="uppercase"
            >
              Admin Console
            </Text>
          </Box>
        </Box>
      </Box>

      {/* Navigation */}
      <Stack gap="lg" p="sm" pt="md" style={{ flex: 1, overflowY: "auto" }}>
        {navGroups.map((group) => (
          <Box key={group.label}>
            <Text
              c="dimmed"
              fw={600}
              mb={4}
              px="sm"
              size="10px"
              style={{ letterSpacing: "0.1em" }}
              tt="uppercase"
            >
              {group.label}
            </Text>
            <Stack gap={2}>
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(item.href));
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.href}
                    active={isActive}
                    color={item.color}
                    component={Link}
                    href={item.href}
                    label={item.label}
                    leftSection={<Icon size={17} />}
                    style={{ borderRadius: "var(--mantine-radius-md)" }}
                    variant="light"
                  />
                );
              })}
            </Stack>
          </Box>
        ))}
      </Stack>

      {/* Footer */}
      <Box
        p="sm"
        style={{ borderTop: "1px solid var(--mantine-color-default-border)" }}
      >
        <Box
          pb="xs"
          px={4}
          style={{ display: "flex", alignItems: "center", gap: 10 }}
        >
          <Avatar color="ecoGreen" radius="xl" size={32}>
            {(currentUser?.name ?? "Admin").trim().charAt(0).toUpperCase()}
          </Avatar>
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Text truncate fw={600} size="sm">
              {currentUser?.name ?? "Admin"}
            </Text>
            <Text truncate c="dimmed" size="10px">
              {currentUser?.email ?? "\u2014"}
            </Text>
          </Box>
          <Tooltip
            label={
              resolvedTheme === "light" ? "Switch to dark" : "Switch to light"
            }
          >
            <ActionIcon
              aria-label="Toggle color scheme"
              color="gray"
              variant="subtle"
              onClick={() =>
                setTheme(resolvedTheme === "light" ? "dark" : "light")
              }
            >
              {resolvedTheme === "light" ? (
                <Moon size={16} />
              ) : (
                <Sun size={16} />
              )}
            </ActionIcon>
          </Tooltip>
        </Box>
        <Divider my={4} />
        <NavLink
          color="dangerRed"
          label="Sign out"
          leftSection={<LogOut size={16} />}
          style={{ borderRadius: "var(--mantine-radius-md)" }}
          onClick={handleLogout}
        />
      </Box>
    </Box>
  );
}
