"use server";

import { redirect } from "next/navigation";
import {
  buildAuthActionState,
  signInSchema,
  signUpSchema,
  type AuthActionState,
} from "@/lib/auth/forms";
import { revalidateProtectedPaths } from "@/lib/auth/cache";
import { resolvePostAuthDestination } from "@/lib/auth/destination";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getFieldErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export async function signInAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    return buildAuthActionState(
      "error",
      "Check the fields and try again.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const supabase = await createSupabaseServerClient({ writeCookies: true });

  if (!supabase) {
    return buildAuthActionState("error", "Supabase credentials are not configured yet.");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return buildAuthActionState("error", getFieldErrorMessage(error));
  }

  if (!data.user) {
    return buildAuthActionState("error", "Unable to complete sign in.");
  }

  let destination: string;
  try {
    destination = await resolvePostAuthDestination(data.user.id, parsed.data.next);
  } catch (error) {
    return buildAuthActionState("error", getFieldErrorMessage(error));
  }

  revalidateProtectedPaths();
  redirect(destination);
}

export async function signUpAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    return buildAuthActionState(
      "error",
      "Check the fields and try again.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const supabase = await createSupabaseServerClient({ writeCookies: true });

  if (!supabase) {
    return buildAuthActionState("error", "Supabase credentials are not configured yet.");
  }

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
      },
    },
  });

  if (error) {
    return buildAuthActionState("error", getFieldErrorMessage(error));
  }

  if (!data.session) {
    return buildAuthActionState(
      "needs_confirmation",
      "Check your inbox to confirm the account before signing in.",
    );
  }

  if (!data.user) {
    return buildAuthActionState("error", "Unable to complete sign up.");
  }

  let destination: string;
  try {
    destination = await resolvePostAuthDestination(data.user.id, parsed.data.next);
  } catch (error) {
    return buildAuthActionState("error", getFieldErrorMessage(error));
  }

  revalidateProtectedPaths();
  redirect(destination);
}

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient({ writeCookies: true });

  if (supabase) {
    await supabase.auth.signOut();
  }

  revalidateProtectedPaths();
  redirect("/sign-in");
}
