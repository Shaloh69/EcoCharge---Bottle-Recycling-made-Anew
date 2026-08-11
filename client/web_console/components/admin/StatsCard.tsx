"use client";

import { Card, Group, Text } from "@mantine/core";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  /**
   * Semantic accent. Drives the left rule and the value colour.
   * `neutral` means "this number has no health meaning" — it renders in the
   * primary text token instead of a hue.
   */
  tone?: "neutral" | "good" | "warning" | "critical";
}

const TONE: Record<string, { rule: string; value: string }> = {
  neutral: { rule: "#1A2420", value: "#E7F0EB" },
  good: { rule: "#16A34A", value: "#4ADE80" },
  warning: { rule: "#FBBF24", value: "#FBBF24" },
  critical: { rule: "#EF4444", value: "#F87171" },
};

/**
 * "Operations Console" StatsCard.
 *
 * Rebuilt 2026-08-11 (full redo). Three real problems with the previous
 * version, all found on a real screenshot of the live dashboard:
 *
 * 1. It rendered the icon in a `ThemeIcon` chip — literally SS1's banned
 *    "icon-in-rounded-square feature tile". The icons were also emoji
 *    (🏧/🍶/💳/⚡), not the lucide set the rest of the console uses.
 * 2. Every card carried a full 1px border in its own hue, so four cards meant
 *    four competing colours with no semantic content — exactly the
 *    "never repurpose these hues for decoration" rule in SS2. Replaced with a
 *    single left rule that is only coloured when the number actually means
 *    something (good/warning/critical).
 * 3. The value took the card's decorative colour, so "0 kiosks online" rendered
 *    in *green* — actively wrong under SS2's convention, where green means
 *    healthy. Tone is now passed by the caller from the real value.
 *
 * The icon stays, but as a plain muted glyph beside the label, carrying no
 * box of its own.
 */
export function StatsCard({
  title,
  value,
  subtitle,
  icon,
  tone = "neutral",
}: StatsCardProps) {
  const t = TONE[tone] ?? TONE.neutral;

  return (
    <Card
      withBorder
      p="lg"
      radius="sm"
      style={{
        borderLeft: `3px solid ${t.rule}`,
      }}
    >
      <Group align="center" gap={8}>
        <span style={{ color: "#5C7268", display: "flex" }}>{icon}</span>
        <Text
          c="dimmed"
          fw={600}
          size="10px"
          style={{ letterSpacing: "0.16em" }}
          tt="uppercase"
        >
          {title}
        </Text>
      </Group>

      <Text
        ff="var(--font-mono)"
        fw={700}
        mt="md"
        size="2.25rem"
        style={{ lineHeight: 1, color: t.value, letterSpacing: "-0.02em" }}
      >
        {value}
      </Text>

      {subtitle && (
        <Text c="dimmed" mt={6} size="xs">
          {subtitle}
        </Text>
      )}
    </Card>
  );
}
