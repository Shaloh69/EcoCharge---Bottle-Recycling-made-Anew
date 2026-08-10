"use client";

import { Progress, Text, Group } from "@mantine/core";

/**
 * Bin-level gauge — thresholds match the server's real alert logic exactly
 * (docs/planning/02-design-mandate.md SS3): green < 80%, amber 80-94%,
 * red >= 95%. Don't invent separate UI thresholds from the ones AUDIT.md
 * and the /alerts endpoint actually use.
 */
function levelColor(level: number): string {
  if (level >= 95) return "dangerRed";
  if (level >= 80) return "warningAmber";

  return "successLime";
}

export function BinGauge({ level }: { level: number }) {
  const color = levelColor(level);

  return (
    <Group gap="sm" w="100%" wrap="nowrap">
      <Progress
        animated={level >= 95}
        color={color}
        flex={1}
        radius="xl"
        size="md"
        striped={level >= 95}
        value={level}
      />
      <Text c={color} ff="monospace" fw={700} size="xs" ta="right" w={40}>
        {level}%
      </Text>
    </Group>
  );
}
