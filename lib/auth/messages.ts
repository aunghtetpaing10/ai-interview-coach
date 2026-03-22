const AUTH_ERROR_MESSAGES = {
  oauth_callback_failed: "Google sign-in could not be completed. Try again.",
  oauth_callback_missing_code: "Google sign-in returned without an authorization code.",
  supabase_not_configured: "Supabase auth is not configured yet.",
} as const;

export type AuthErrorCode = keyof typeof AUTH_ERROR_MESSAGES;

export function getAuthErrorMessage(errorCode: string | null | undefined) {
  if (!errorCode) {
    return null;
  }

  return AUTH_ERROR_MESSAGES[errorCode as AuthErrorCode] ?? "Authentication could not be completed.";
}
