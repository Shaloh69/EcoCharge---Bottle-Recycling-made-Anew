import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Standard shadcn/ui className helper — merges conditional classes (clsx)
 * then resolves Tailwind conflicts (tailwind-merge) so later utility classes
 * correctly win over earlier ones instead of both applying.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
