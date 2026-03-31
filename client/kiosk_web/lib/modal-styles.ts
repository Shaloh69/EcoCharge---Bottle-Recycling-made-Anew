// ============================================================================
// EcoCharge Modal classNames — AIRAT-NA pattern, forest-glass theme
//
// Usage:
//   import { modalClassNames } from "@/lib/modal-styles";
//   <Modal classNames={modalClassNames} ...>
// ============================================================================

export const modalClassNames = {
  backdrop: "backdrop-blur-xl",
  base: "!bg-[rgba(5,26,8,0.92)] border border-white/10 shadow-2xl !backdrop-blur-2xl rounded-3xl",
  header: "!bg-transparent border-b border-white/10 !text-white font-bold",
  body: "!bg-transparent !text-[#A7F3D0]",
  footer: "!bg-transparent border-t border-white/10",
  closeButton: "!text-white/60 hover:!text-white hover:!bg-white/10 rounded-xl",
};

/** Lighter variant for info/confirmation modals */
export const modalClassNamesLight = {
  backdrop: "backdrop-blur-lg",
  base: "!bg-[rgba(10,46,15,0.88)] border border-[rgba(76,175,80,0.25)] shadow-2xl !backdrop-blur-xl rounded-3xl",
  header:
    "!bg-transparent border-b border-[rgba(76,175,80,0.20)] !text-[#86EFAC] font-bold",
  body: "!bg-transparent !text-[#F0FDF4]",
  footer: "!bg-transparent border-t border-[rgba(76,175,80,0.20)]",
  closeButton:
    "!text-[#86EFAC]/70 hover:!text-[#86EFAC] hover:!bg-[rgba(76,175,80,0.12)] rounded-xl",
};
