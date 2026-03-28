"use client";
import { useRouter } from "next/navigation";
export function BackButton({ href }: { href?: string }) {
  const router = useRouter();
  return (
    <button
      onClick={() => href ? router.push(href) : router.back()}
      className="text-white/70 text-lg font-medium px-4 py-2 rounded-xl hover:text-white hover:bg-white/10 transition-colors"
    >
      ← Back
    </button>
  );
}
