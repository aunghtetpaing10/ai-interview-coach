const DEFAULT_WORKSPACE_PATH = "/workspace";

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

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function buildSignInPath(nextPath?: string) {
  const url = new URL("/sign-in", "http://local.test");

  if (nextPath) {
    url.searchParams.set("next", resolvePostAuthPath(nextPath));
  }

  return `${url.pathname}${url.search}`;
}
