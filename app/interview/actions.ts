"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireWorkspaceUser } from "@/lib/auth/session";
import { getInterviewModePreset } from "@/lib/interview-session/catalog";
import { createInterviewSessionService } from "@/lib/session-service/session-service";
import { createWorkspaceInterviewSessionStore } from "@/lib/workspace/runtime";

const bootstrapInterviewSessionSchema = z.object({
  mode: z.enum(["behavioral", "resume", "project", "system-design"]),
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
  const modePreset = getInterviewModePreset(parsed.data.mode);
  const session = await service.bootstrapSession({
    userId: user.id,
    targetRoleId: targetRole.id,
    mode: parsed.data.mode,
    title: parsed.data.title ?? `${targetRole.title} interview`,
    openingPrompt: modePreset.openingPrompt,
  });

  redirect(
    `/interview?mode=${parsed.data.mode}&sessionId=${session.session.id}`,
  );
}
