import { NextResponse } from "next/server";
import { resolvePostAuthDestination } from "@/lib/auth/destination";
import { buildSignInPath, resolvePostAuthPath } from "@/lib/auth/paths";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function redirectTo(request: Request, path: string) {
  return NextResponse.redirect(new URL(path, request.url));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const nextPath = searchParams.get("next");
  const safeNextPath = resolvePostAuthPath(nextPath);

  if (!code) {
    return redirectTo(
      request,
      buildSignInPath(safeNextPath, "oauth_callback_missing_code"),
    );
  }

  const supabase = await createSupabaseServerClient({ writeCookies: true });

  if (!supabase) {
    return redirectTo(
      request,
      buildSignInPath(safeNextPath, "supabase_not_configured"),
    );
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return redirectTo(
      request,
      buildSignInPath(safeNextPath, "oauth_callback_failed"),
    );
  }

  const { data, error: getUserError } = await supabase.auth.getUser();

  if (getUserError || !data.user) {
    return redirectTo(
      request,
      buildSignInPath(safeNextPath, "oauth_callback_failed"),
    );
  }

  try {
    const destination = await resolvePostAuthDestination(data.user.id, nextPath);
    return redirectTo(request, destination);
  } catch {
    return redirectTo(
      request,
      buildSignInPath(safeNextPath, "oauth_callback_failed"),
    );
  }
}
