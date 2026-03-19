import "server-only";

import { revalidatePath } from "next/cache";

export const PROTECTED_AUTH_PATHS = [
  "/workspace",
  "/onboarding",
  "/dashboard",
  "/interview",
  "/reports",
  "/progress",
] as const;

export function revalidateProtectedPaths() {
  for (const path of PROTECTED_AUTH_PATHS) {
    revalidatePath(path);
  }
}
