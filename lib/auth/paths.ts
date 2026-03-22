const DEFAULT_WORKSPACE_PATH = "/dashboard";
const DISALLOWED_AUTH_PATHS = new Set(["/sign-in", "/sign-up", "/auth/callback"]);

function normalizeWorkspaceAlias(path: string) {
  if (path === "/workspace") {
    return "/dashboard";
  }

  if (path.startsWith("/workspace?") || path.startsWith("/workspace#")) {
    return `/dashboard${path.slice("/workspace".length)}`;
  }

  return path;
}

export function resolvePostAuthPath(
  candidate: string | null | undefined,
  fallback = DEFAULT_WORKSPACE_PATH,
) {
  const safeFallback = normalizeWorkspaceAlias(fallback);

  if (!candidate) {
    return safeFallback;
  }

  try {
    const url = new URL(candidate, "http://local.test");

    if (url.origin !== "http://local.test") {
      return safeFallback;
    }

    if (!url.pathname.startsWith("/")) {
      return safeFallback;
    }

    if (DISALLOWED_AUTH_PATHS.has(url.pathname)) {
      return safeFallback;
    }

    return normalizeWorkspaceAlias(`${url.pathname}${url.search}${url.hash}`);
  } catch {
    return safeFallback;
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
