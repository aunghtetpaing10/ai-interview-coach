import "server-only";

import { and, eq } from "drizzle-orm";
import {
  jobTargets,
  profiles,
  resumeAssets,
  targetRoles,
  type JobTargetRow,
  type ProfileRow,
  type ResumeAssetRow,
  type TargetRoleRow,
} from "@/db/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createPostgresInterviewRepository } from "@/lib/data/database-repository";
import type { WorkspaceSnapshot } from "@/lib/data/repository";
import { getDb } from "@/lib/db/client";
import { createEmptyOnboardingDraft } from "@/lib/intake/summary";
import type { OnboardingDraft } from "@/lib/intake/types";
import {
  parseResumeFileName,
} from "@/lib/resume/parser";
import type { ResumeUploadPreview } from "@/lib/resume/types";

type SaveOnboardingDraftInput = {
  userId: string;
  email: string | null;
  draft: OnboardingDraft;
  file: File | null;
};

function titleCaseWord(value: string) {
  if (!value) {
    return value;
  }

  return value[0]!.toUpperCase() + value.slice(1).toLowerCase();
}

function deriveFullName(email: string | null) {
  if (!email) {
    return "Interview Coach Candidate";
  }

  const localPart = email.split("@")[0] ?? email;
  const tokens = localPart
    .split(/[._-]+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .map(titleCaseWord);

  return tokens.length > 0 ? tokens.join(" ") : "Interview Coach Candidate";
}

function resumeMimeType(preview: ResumeUploadPreview, file: File | null) {
  if (file?.type) {
    return file.type;
  }

  switch (preview.kind) {
    case "pdf":
      return "application/pdf";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "md":
      return "text/markdown";
    case "txt":
      return "text/plain";
    default:
      return "application/octet-stream";
  }
}

function buildSavedResumePreview(resumeAsset: ResumeAssetRow | null) {
  if (!resumeAsset) {
    return createEmptyOnboardingDraft().resumePreview;
  }

  const parsed = parseResumeFileName(resumeAsset.fileName);

  return {
    source: parsed.kind === "unknown" ? "paste" : "file",
    fileName: resumeAsset.fileName,
    kind: parsed.kind,
    sizeLabel: parsed.kind === "unknown" ? "Saved draft" : "Saved file",
    supported: parsed.kind !== "unknown",
    summary: resumeAsset.summary,
  } satisfies ResumeUploadPreview;
}

export function hydrateOnboardingDraftFromWorkspaceSnapshot(
  snapshot: WorkspaceSnapshot,
): OnboardingDraft {
  const emptyDraft = createEmptyOnboardingDraft();
  const role = snapshot.targetRole;
  const jobTarget = snapshot.jobTarget;
  const resumeAsset = snapshot.resumeAsset;

  return {
    roleTitle: role?.title ?? snapshot.profile?.targetRole ?? emptyDraft.roleTitle,
    seniority:
      role?.level === "intern" ||
      role?.level === "junior" ||
      role?.level === "mid-level" ||
      role?.level === "senior" ||
      role?.level === "staff"
        ? role.level
        : emptyDraft.seniority,
    companyType:
      role?.companyType === "startup" ||
      role?.companyType === "scale-up" ||
      role?.companyType === "enterprise" ||
      role?.companyType === "product-led" ||
      role?.companyType === "agency"
        ? role.companyType
        : emptyDraft.companyType,
    focusAreas:
      role?.focusAreas?.filter((area): area is string => typeof area === "string") ??
      emptyDraft.focusAreas,
    companyName: jobTarget?.companyName ?? emptyDraft.companyName,
    jobTitle: jobTarget?.jobTitle ?? emptyDraft.jobTitle,
    jobUrl: jobTarget?.jobUrl ?? emptyDraft.jobUrl,
    jobDescription: jobTarget?.jobDescription ?? emptyDraft.jobDescription,
    resumeNotes: resumeAsset?.summary ?? emptyDraft.resumeNotes,
    resumePreview: buildSavedResumePreview(resumeAsset),
  };
}

export function makeOnboardingStateMessage(completion: number) {
  return completion >= 85
    ? "Draft saved. The coach can start a grounded interview with your persisted role, resume, and target job."
    : "Draft saved. Keep tightening the missing pieces before you start the live interview.";
}

export async function loadOnboardingDraftForUser(userId: string) {
  const repository = createPostgresInterviewRepository();
  const snapshot = await repository.getWorkspaceSnapshot(userId);

  return hydrateOnboardingDraftFromWorkspaceSnapshot(snapshot);
}

async function uploadResumeFile(userId: string, file: File) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase credentials are required to upload resume files.");
  }

  const timestamp = new Date().toISOString().replaceAll(/[:.]/g, "-");
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
  const storagePath = `${userId}/${timestamp}-${sanitizedName}`;

  const { error } = await supabase.storage
    .from("resume-assets")
    .upload(storagePath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    });

  if (error) {
    throw new Error(error.message);
  }

  return {
    fileName: file.name,
    storagePath,
    mimeType: file.type || "application/octet-stream",
  };
}

async function saveProfile(
  userId: string,
  email: string | null,
  draft: OnboardingDraft,
): Promise<ProfileRow> {
  const db = getDb();
  const [profile] = await db
    .insert(profiles)
    .values({
      userId,
      fullName: deriveFullName(email),
      headline: `${draft.seniority} ${draft.roleTitle}`.trim(),
      targetRole: draft.roleTitle,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: {
        fullName: deriveFullName(email),
        headline: `${draft.seniority} ${draft.roleTitle}`.trim(),
        targetRole: draft.roleTitle,
        updatedAt: new Date(),
      },
    })
    .returning();

  return profile;
}

async function saveActiveTargetRole(
  userId: string,
  draft: OnboardingDraft,
): Promise<TargetRoleRow> {
  const db = getDb();
  const [activeRole] = await db
    .select()
    .from(targetRoles)
    .where(and(eq(targetRoles.userId, userId), eq(targetRoles.active, true)))
    .limit(1);

  if (activeRole) {
    const [updatedRole] = await db
      .update(targetRoles)
      .set({
        title: draft.roleTitle,
        companyType: draft.companyType,
        level: draft.seniority,
        focusAreas: draft.focusAreas,
        active: true,
      })
      .where(eq(targetRoles.id, activeRole.id))
      .returning();

    return updatedRole;
  }

  const [createdRole] = await db
    .insert(targetRoles)
    .values({
      userId,
      title: draft.roleTitle,
      companyType: draft.companyType,
      level: draft.seniority,
      focusAreas: draft.focusAreas,
      active: true,
    })
    .returning();

  return createdRole;
}

async function saveJobTarget(
  userId: string,
  targetRoleId: string,
  draft: OnboardingDraft,
): Promise<JobTargetRow> {
  const db = getDb();
  const [existingJobTarget] = await db
    .select()
    .from(jobTargets)
    .where(eq(jobTargets.targetRoleId, targetRoleId))
    .limit(1);

  if (existingJobTarget) {
    const [updatedJobTarget] = await db
      .update(jobTargets)
      .set({
        companyName: draft.companyName,
        jobTitle: draft.jobTitle,
        jobUrl: draft.jobUrl,
        jobDescription: draft.jobDescription,
        updatedAt: new Date(),
      })
      .where(eq(jobTargets.id, existingJobTarget.id))
      .returning();

    return updatedJobTarget;
  }

  const [createdJobTarget] = await db
    .insert(jobTargets)
    .values({
      userId,
      targetRoleId,
      companyName: draft.companyName,
      jobTitle: draft.jobTitle,
      jobUrl: draft.jobUrl,
      jobDescription: draft.jobDescription,
    })
    .returning();

  return createdJobTarget;
}

async function saveResumeAsset(
  userId: string,
  draft: OnboardingDraft,
  file: File | null,
): Promise<ResumeAssetRow | null> {
  if (draft.resumePreview.source === "none") {
    return null;
  }

  const db = getDb();
  const uploadedFile = file && file.size > 0 ? await uploadResumeFile(userId, file) : null;
  const storagePath =
    uploadedFile?.storagePath ??
    `inline/${userId}/${Date.now()}-${draft.resumePreview.fileName.replace(/[^a-zA-Z0-9._-]+/g, "-")}`;

  const [resumeAsset] = await db
    .insert(resumeAssets)
    .values({
      userId,
      fileName: uploadedFile?.fileName ?? draft.resumePreview.fileName,
      storagePath,
      mimeType: uploadedFile?.mimeType ?? resumeMimeType(draft.resumePreview, file),
      summary: draft.resumeNotes || draft.resumePreview.summary,
    })
    .returning();

  return resumeAsset;
}

export async function saveOnboardingDraftForUser(input: SaveOnboardingDraftInput) {
  const profile = await saveProfile(input.userId, input.email, input.draft);
  const targetRole = await saveActiveTargetRole(input.userId, input.draft);
  const jobTarget = await saveJobTarget(input.userId, targetRole.id, input.draft);
  const resumeAsset = await saveResumeAsset(input.userId, input.draft, input.file);

  return {
    profile,
    targetRole,
    jobTarget,
    resumeAsset,
  };
}
