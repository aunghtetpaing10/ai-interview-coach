const DEFAULT_WORKSPACE_PATH = "/workspace";
const DISALLOWED_AUTH_PATHS = new Set(["/sign-in", "/sign-up", "/auth/callback"]);

export function resolvePostAuthPath(
  candidate: string | null | undefined,
  fallback = DEFAULT_WORKSPACE_PATH,
) {
  if (!candidate) {
    return fallback;
  }

  try {
    const url = new URL(candidate, "http://local.test");

    if (url.origin !== "http://local.test") {
      return fallback;
    }

    if (!url.pathname.startsWith("/")) {
      return fallback;
    }

    if (DISALLOWED_AUTH_PATHS.has(url.pathname)) {
      return fallback;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

function buildAuthPagePath(pathname: "/sign-in" | "/sign-up", nextPath?: string) {
  const url = new URL(pathname, "http://local.test");

  if (nextPath) {
    url.searchParams.set("next", resolvePostAuthPath(nextPath));
  }

  return url;
}

export function buildSignInPath(nextPath?: string, errorCode?: string) {
  const url = buildAuthPagePath("/sign-in", nextPath);

  if (errorCode) {
    url.searchParams.set("error", errorCode);
  }

  return `${url.pathname}${url.search}`;
}

export function buildSignUpPath(nextPath?: string) {
  const url = buildAuthPagePath("/sign-up", nextPath);

  return `${url.pathname}${url.search}`;
}

export function buildAuthCallbackPath(nextPath?: string) {
  const url = new URL("/auth/callback", "http://local.test");

  if (nextPath) {
    url.searchParams.set("next", resolvePostAuthPath(nextPath));
  }

  return `${url.pathname}${url.search}`;
}
