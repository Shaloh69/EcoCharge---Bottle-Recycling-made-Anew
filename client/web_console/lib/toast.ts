import { notifications } from "@mantine/notifications";

/**
 * Drop-in replacement for @heroui/toast's addToast(), backed by Mantine
 * notifications instead. Same call shape ({ title, description?, color? })
 * on purpose — every call site across the dashboard already uses this
 * shape, so removing HeroUI only means changing the import, not every
 * addToast() call.
 *
 * Per docs/planning/02-design-mandate.md's shared toast rules: payment/
 * telemetry-critical categories (danger, warning) don't auto-dismiss
 * quickly - everything else does.
 */

type ToastColor = "success" | "danger" | "warning" | "default" | string;

interface AddToastOptions {
  title: string;
  description?: string;
  color?: ToastColor;
}

const STICKY_COLORS = new Set(["danger", "warning"]);

const COLOR_MAP: Record<string, string> = {
  success: "successLime",
  danger: "dangerRed",
  warning: "warningAmber",
  default: "ecoGreen",
};

export function addToast({
  title,
  description,
  color = "default",
}: AddToastOptions) {
  notifications.show({
    title,
    message: description ?? "",
    color: COLOR_MAP[color] ?? color,
    autoClose: STICKY_COLORS.has(color) ? 10000 : 4000,
  });
}
