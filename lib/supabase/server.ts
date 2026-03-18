import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getSupabaseConfig } from "@/lib/supabase/config";

interface CreateSupabaseServerClientOptions {
  writeCookies?: boolean;
}

export async function createSupabaseServerClient(
  { writeCookies = false }: CreateSupabaseServerClientOptions = {},
): Promise<SupabaseClient | null> {
  const config = getSupabaseConfig();

  if (!config) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookieValues) {
        if (!writeCookies) {
          return;
        }

        cookieValues.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}
