import { z } from "zod";

export const signInSchema = z.object({
  email: z.email({ error: "Enter a valid email address." }).trim(),
  password: z
    .string()
    .min(8, { error: "Password must be at least 8 characters long." })
    .trim(),
  next: z.string().optional(),
});

export const signUpSchema = z.object({
  fullName: z
    .string()
    .min(2, { error: "Full name must be at least 2 characters long." })
    .trim(),
  email: z.email({ error: "Enter a valid email address." }).trim(),
  password: z
    .string()
    .min(8, { error: "Password must be at least 8 characters long." })
    .trim(),
  next: z.string().optional(),
});

export type AuthFieldErrors = Partial<
  Record<"fullName" | "email" | "password" | "targetRole" | "next", string[]>
>;

export type AuthActionState =
  | {
      status: "error" | "needs_confirmation";
      message: string;
      fieldErrors?: AuthFieldErrors;
    }
  | undefined;

export function buildAuthActionState(
  status: NonNullable<AuthActionState>["status"],
  message: string,
  fieldErrors?: AuthFieldErrors,
): AuthActionState {
  return {
    status,
    message,
    fieldErrors,
  };
}

export function parseFormData<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  formData: FormData,
) {
  return schema.safeParse(Object.fromEntries(formData.entries()));
}
