import "server-only";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildSignInPath, resolvePostAuthPath } from "@/lib/auth/paths";

export interface WorkspaceUser {
  id: string;
  email: string | null;
  source: "supabase";
}

export async function getWorkspaceUser(): Promise<WorkspaceUser | null> {
  const client = await createSupabaseServerClient();

  if (!client) {
    return null;
  }

  const { data, error } = await client.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return {
    id: data.user.id,
    email: data.user.email ?? null,
    source: "supabase",
  };
}

export async function requireWorkspaceUser(nextPath?: string): Promise<WorkspaceUser> {
  const user = await getWorkspaceUser();

  if (!user) {
    redirect(buildSignInPath(resolvePostAuthPath(nextPath)));
  }

  return user;
}
