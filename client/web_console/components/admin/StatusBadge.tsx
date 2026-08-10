"use client";

import { Badge } from "@mantine/core";

/**
 * "Operations Console" status convention, applied identically everywhere
 * (docs/planning/02-design-mandate.md SS2): green = healthy/online/
 * confirmed, amber = degraded/warning/pending, red = critical/offline/
 * rejected. Never repurpose these hues for decoration.
 */
type StatusType =
  | "online"
  | "offline"
  | "warning"
  | "fault"
  | "error"
  | "active"
  | "idle"
  | "full"
  | "low"
  | "completed"
  | "pending"
  | "confirmed"
  | "rejected";

const STATUS_CONFIG: Record<StatusType, { color: string; label: string }> = {
  online: { color: "successLime", label: "Online" },
  confirmed: { color: "successLime", label: "Confirmed" },
  completed: { color: "successLime", label: "Completed" },
  low: { color: "successLime", label: "Low" },
  active: { color: "voltTeal", label: "Active" },
  warning: { color: "warningAmber", label: "Warning" },
  pending: { color: "warningAmber", label: "Pending" },
  offline: { color: "gray", label: "Offline" },
  idle: { color: "gray", label: "Idle" },
  fault: { color: "dangerRed", label: "Fault" },
  error: { color: "dangerRed", label: "Error" },
  full: { color: "dangerRed", label: "Full" },
  rejected: { color: "dangerRed", label: "Rejected" },
};

export function StatusBadge({
  status,
  label,
}: {
  status: StatusType;
  label?: string;
}) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.idle;

  return (
    <Badge
      color={cfg.color}
      leftSection={
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
      }
      radius="sm"
      size="sm"
      variant="light"
    >
      {label ?? cfg.label}
    </Badge>
  );
}
