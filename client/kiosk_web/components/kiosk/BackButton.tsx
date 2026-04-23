"use client";

import { useRouter } from "next/navigation";

export function BackButton({
  href,
  label = "← Back",
}: {
  href?: string;
  label?: string;
}) {
  const router = useRouter();

  return (
    <button
      className="w-full py-5 rounded-2xl font-medium text-base tracking-wide transition-all active:scale-95"
      style={{
        color: "rgba(255,255,255,0.55)",
        background: "rgba(255,255,255,0.07)",
        border: "1px solid rgba(255,255,255,0.12)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
      onClick={() => (href ? router.push(href) : router.back())}
    >
      {label}
    </button>
  );
}
