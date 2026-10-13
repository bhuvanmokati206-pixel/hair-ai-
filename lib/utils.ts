import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Standard shadcn-style class combiner: merge conditional classes and resolve
// Tailwind conflicts. Used by components under components/ui/.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
