import { addToast } from "@heroui/toast";

// ============================================================================
// EcoCharge Admin Console Toast utility — AIRAT-NA pattern, green/nature
//
// Usage:
//   import { toast } from "@/lib/toast";
//   toast.success("Kiosk updated.");
//   toast.error("API error.");
// ============================================================================

export const toast = {
  success: (message: string, title = "Success") => {
    addToast({
      title,
      description: message,
      color: "success",
      variant: "flat",
      timeout: 4000,
    });
  },

  error: (message: string, title = "Error") => {
    addToast({
      title,
      description: message,
      color: "danger",
      variant: "flat",
      timeout: 7000,
      shouldShowTimeoutProgress: true,
    });
  },

  info: (message: string, title = "Info") => {
    addToast({
      title,
      description: message,
      color: "primary",
      variant: "flat",
      timeout: 5000,
    });
  },

  warning: (message: string, title = "Warning") => {
    addToast({
      title,
      description: message,
      color: "warning",
      variant: "flat",
      timeout: 6000,
      shouldShowTimeoutProgress: true,
    });
  },
};
