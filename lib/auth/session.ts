import "server-only";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildSignInPath, resolvePostAuthPath } from "@/lib/auth/paths";

export async function getWorkspaceUser() {
  const client = await createSupabaseServerClient();

  if (!client) {
    return null;
  }

  const { data, error } = await client.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return data.user;
}

export async function requireWorkspaceUser(nextPath?: string) {
  const user = await getWorkspaceUser();

  if (!user) {
    redirect(buildSignInPath(resolvePostAuthPath(nextPath)));
  }

  return user;
}
