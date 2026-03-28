import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getEnv, isE2EDemoMode } from "@/lib/env";

export async function proxy(request: NextRequest) {
  // Demo modes are intentionally unprotected
  if (isE2EDemoMode()) {
    return NextResponse.next();
  }

  const env = getEnv();
  // If Supabase is not configured, we fallback to demo mode which is unprotected
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const protectedPaths = [
    "/workspace",
    "/interview",
    "/dashboard",
    "/reports",
    "/progress",
    "/onboarding",
  ];
  const url = request.nextUrl.clone();
  const isProtectedPath = protectedPaths.some((path) =>
    url.pathname.startsWith(path)
  );

  if (isProtectedPath && !user) {
    url.pathname = "/sign-in";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
