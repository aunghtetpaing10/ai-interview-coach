"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { signInSchema, signUpSchema, type AuthActionState } from "@/lib/auth/forms";
import { buildSignInPath, resolvePostAuthPath } from "@/lib/auth/paths";
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
    return {
      message: "Check the fields and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      message: "Supabase credentials are not configured yet.",
    };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return {
      message: getFieldErrorMessage(error),
    };
  }

  revalidatePath("/workspace");
  redirect(resolvePostAuthPath(parsed.data.next));
}

export async function signUpAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    return {
      message: "Check the fields and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      message: "Supabase credentials are not configured yet.",
    };
  }

  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
        target_role: parsed.data.targetRole,
      },
    },
  });

  if (error) {
    return {
      message: getFieldErrorMessage(error),
    };
  }

  revalidatePath("/workspace");
  redirect(buildSignInPath(parsed.data.next ?? "/workspace"));
}
