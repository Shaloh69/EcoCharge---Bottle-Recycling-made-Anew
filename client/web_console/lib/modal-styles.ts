// ============================================================================
// EcoCharge Admin Console Modal classNames — AIRAT-NA pattern, forest-glass
//
// Usage:
//   import { modalClassNames } from "@/lib/modal-styles";
//   <Modal classNames={modalClassNames} ...>
// ============================================================================

/** Dark forest glass — for dark mode or high-contrast modals */
export const modalClassNames = {
  backdrop: "backdrop-blur-xl",
  base: "!bg-[rgba(5,26,8,0.94)] border border-white/10 shadow-2xl !backdrop-blur-2xl rounded-2xl",
  header: "!bg-transparent border-b border-white/10 !text-white font-bold",
  body: "!bg-transparent !text-[#A7F3D0]",
  footer: "!bg-transparent border-t border-white/10",
  closeButton: "!text-white/60 hover:!text-white hover:!bg-white/10 rounded-xl",
};

/** Light frosted glass — for light mode admin modals */
export const modalClassNamesLight = {
  backdrop: "backdrop-blur-lg",
  base: "!bg-[rgba(240,253,244,0.92)] border border-[rgba(22,163,74,0.20)] shadow-xl !backdrop-blur-xl rounded-2xl",
  header:
    "!bg-transparent border-b border-[rgba(22,163,74,0.15)] !text-[#14532D] font-bold",
  body: "!bg-transparent !text-[#166534]",
  footer: "!bg-transparent border-t border-[rgba(22,163,74,0.15)]",
  closeButton:
    "!text-[#15803D]/70 hover:!text-[#14532D] hover:!bg-[rgba(22,163,74,0.10)] rounded-xl",
};
