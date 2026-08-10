"use client";

import { Card, Group, Text, Badge, ThemeIcon } from "@mantine/core";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color?: string;
  trend?: { value: string; up: boolean };
}

/**
 * "Operations Console" StatsCard — a real 1px palette-tinted border, no
 * backdrop blur (docs/planning/02-design-mandate.md SS1's banned-pattern
 * list: "reflexive glassmorphism (blur panels without a functional
 * reason)" — a stats tile has no functional reason, the earlier version
 * used one anyway). Value is set in the mono family since it's the one
 * number on the card someone actually needs to read precisely.
 */
export function StatsCard({
  title,
  value,
  subtitle,
  icon,
  color = "ecoGreen",
  trend,
}: StatsCardProps) {
  return (
    <Card
      withBorder
      p="lg"
      radius="md"
      style={{ borderColor: `var(--mantine-color-${color}-6)` }}
    >
      <Group align="flex-start" justify="space-between">
        <Text
          c="dimmed"
          fw={600}
          size="xs"
          style={{ letterSpacing: 0.4 }}
          tt="uppercase"
        >
          {title}
        </Text>
        <ThemeIcon color={color} radius="md" size="lg" variant="light">
          {icon}
        </ThemeIcon>
      </Group>

      <Text
        c={color}
        ff="monospace"
        fw={800}
        mt="sm"
        size="2rem"
        style={{ lineHeight: 1 }}
      >
        {value}
      </Text>

      {subtitle && (
        <Text c="dimmed" mt={4} size="xs">
          {subtitle}
        </Text>
      )}

      {trend && (
        <Badge
          color={trend.up ? "successLime" : "dangerRed"}
          mt="sm"
          size="sm"
          variant="light"
        >
          {trend.up ? "↑" : "↓"} {trend.value}
        </Badge>
      )}
    </Card>
  );
}
