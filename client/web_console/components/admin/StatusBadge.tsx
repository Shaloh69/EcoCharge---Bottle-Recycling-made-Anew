"use client";

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

const statusConfig: Record<
  StatusType,
  { dot: string; bg: string; color: string; label: string }
> = {
  online: {
    dot: "#4ADE80",
    bg: "rgba(74,222,128,0.14)",
    color: "#4ADE80",
    label: "Online",
  },
  offline: {
    dot: "#94A3B8",
    bg: "rgba(148,163,184,0.12)",
    color: "#94A3B8",
    label: "Offline",
  },
  warning: {
    dot: "#FBBF24",
    bg: "rgba(251,191,36,0.14)",
    color: "#FBBF24",
    label: "Warning",
  },
  fault: {
    dot: "#F87171",
    bg: "rgba(248,113,113,0.14)",
    color: "#F87171",
    label: "Fault",
  },
  error: {
    dot: "#F87171",
    bg: "rgba(248,113,113,0.14)",
    color: "#F87171",
    label: "Error",
  },
  active: {
    dot: "#38BDF8",
    bg: "rgba(56,189,248,0.14)",
    color: "#38BDF8",
    label: "Active",
  },
  idle: {
    dot: "#94A3B8",
    bg: "rgba(148,163,184,0.12)",
    color: "#94A3B8",
    label: "Idle",
  },
  full: {
    dot: "#F87171",
    bg: "rgba(248,113,113,0.14)",
    color: "#F87171",
    label: "Full",
  },
  low: {
    dot: "#4ADE80",
    bg: "rgba(74,222,128,0.14)",
    color: "#4ADE80",
    label: "Low",
  },
  completed: {
    dot: "#4ADE80",
    bg: "rgba(74,222,128,0.14)",
    color: "#4ADE80",
    label: "Completed",
  },
  pending: {
    dot: "#FBBF24",
    bg: "rgba(251,191,36,0.14)",
    color: "#FBBF24",
    label: "Pending",
  },
  confirmed: {
    dot: "#4ADE80",
    bg: "rgba(74,222,128,0.14)",
    color: "#4ADE80",
    label: "Confirmed",
  },
  rejected: {
    dot: "#F87171",
    bg: "rgba(248,113,113,0.14)",
    color: "#F87171",
    label: "Rejected",
  },
};

export function StatusBadge({
  status,
  label,
}: {
  status: StatusType;
  label?: string;
}) {
  const cfg = statusConfig[status] ?? statusConfig.idle;

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.dot}35`,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: cfg.dot }}
      />
      {label ?? cfg.label}
    </span>
  );
}
