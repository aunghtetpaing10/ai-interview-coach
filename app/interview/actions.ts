"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireWorkspaceUser } from "@/lib/auth/session";
import { getDefaultInterviewBlueprint } from "@/lib/interview-session/catalog";
import { createInterviewSessionService } from "@/lib/session-service/session-service";
import {
  companyStyleSchema,
  interviewDifficultySchema,
  interviewModeSchema,
  practiceStyleSchema,
} from "@/lib/session-service/validation";
import { createWorkspaceInterviewSessionStore } from "@/lib/workspace/runtime";

const bootstrapInterviewSessionSchema = z.object({
  mode: interviewModeSchema,
  practiceStyle: practiceStyleSchema.default("live"),
  difficulty: interviewDifficultySchema.default("standard"),
  companyStyle: companyStyleSchema.optional(),
  questionId: z.string().trim().min(1).optional(),
  targetRoleId: z.string().trim().min(1),
  title: z.string().trim().min(1).optional(),
});

export async function bootstrapInterviewSessionAction(
  formData: FormData,
): Promise<void> {
  const user = await requireWorkspaceUser("/interview");
  const parsed = bootstrapInterviewSessionSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );

  if (!parsed.success) {
    redirect("/interview");
  }

  const store = await createWorkspaceInterviewSessionStore();
  const targetRole = await store.getTargetRoleById(user.id, parsed.data.targetRoleId);

  if (!targetRole) {
    redirect("/interview");
  }

  const service = createInterviewSessionService(store);
  const blueprint = getDefaultInterviewBlueprint({
    mode: parsed.data.mode,
    practiceStyle: parsed.data.practiceStyle,
    difficulty: parsed.data.difficulty,
    companyStyle: parsed.data.companyStyle ?? null,
    questionId: parsed.data.questionId ?? null,
  });
  const session = await service.bootstrapSession({
    userId: user.id,
    targetRoleId: targetRole.id,
    mode: parsed.data.mode,
    title: parsed.data.title ?? `${targetRole.title} interview`,
    practiceStyle: parsed.data.practiceStyle,
    difficulty: parsed.data.difficulty,
    companyStyle: parsed.data.companyStyle ?? null,
    questionId: parsed.data.questionId ?? null,
    openingPrompt: blueprint.openingPrompt,
  });

  redirect(
    `/interview?mode=${parsed.data.mode}&practiceStyle=${parsed.data.practiceStyle}&difficulty=${parsed.data.difficulty}${parsed.data.companyStyle ? `&companyStyle=${parsed.data.companyStyle}` : ""}${parsed.data.questionId ? `&questionId=${parsed.data.questionId}` : ""}&sessionId=${session.session.id}`,
  );
}
