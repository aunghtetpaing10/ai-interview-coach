import { getEnv } from "@/lib/env";

export function getSupabaseConfig() {
  const env = getEnv();

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }

  return {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY ?? null,
  } as const;
}

export function hasSupabaseConfig() {
  return getSupabaseConfig() !== null;
}
