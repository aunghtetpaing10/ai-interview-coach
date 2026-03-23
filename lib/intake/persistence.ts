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
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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

const RESUME_ASSETS_BUCKET = "resume-assets";
type DbMutationClient = Pick<ReturnType<typeof getDb>, "select" | "insert" | "update">;

type UploadedResumeFile = {
  fileName: string;
  storagePath: string;
  mimeType: string;
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

async function uploadResumeFile(userId: string, file: File): Promise<UploadedResumeFile> {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required to upload resume files from the server.",
    );
  }

  const { data: existingBucket, error: bucketError } = await supabase.storage.getBucket(
    RESUME_ASSETS_BUCKET,
  );

  if (bucketError && !/bucket not found/i.test(bucketError.message)) {
    throw new Error(bucketError.message);
  }

  if (!existingBucket) {
    const { error: createBucketError } = await supabase.storage.createBucket(
      RESUME_ASSETS_BUCKET,
      {
        public: false,
        fileSizeLimit: "10MB",
        allowedMimeTypes: [
          "application/pdf",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "text/plain",
          "text/markdown",
        ],
      },
    );

    if (createBucketError && !/already exists/i.test(createBucketError.message)) {
      throw new Error(createBucketError.message);
    }
  }

  const timestamp = new Date().toISOString().replaceAll(/[:.]/g, "-");
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
  const storagePath = `${userId}/${timestamp}-${sanitizedName}`;

  const { error } = await supabase.storage
    .from(RESUME_ASSETS_BUCKET)
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
  db: DbMutationClient,
  userId: string,
  email: string | null,
  draft: OnboardingDraft,
  now: Date,
): Promise<ProfileRow> {
  const [profile] = await db
    .insert(profiles)
    .values({
      userId,
      fullName: deriveFullName(email),
      headline: `${draft.seniority} ${draft.roleTitle}`.trim(),
      targetRole: draft.roleTitle,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: {
        fullName: deriveFullName(email),
        headline: `${draft.seniority} ${draft.roleTitle}`.trim(),
        targetRole: draft.roleTitle,
        updatedAt: now,
      },
    })
    .returning();

  return profile;
}

async function saveActiveTargetRole(
  db: DbMutationClient,
  userId: string,
  draft: OnboardingDraft,
): Promise<TargetRoleRow> {
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
  db: DbMutationClient,
  userId: string,
  targetRoleId: string,
  draft: OnboardingDraft,
  now: Date,
): Promise<JobTargetRow> {
  const [existingJobTarget] = await db
    .select()
    .from(jobTargets)
    .where(and(eq(jobTargets.userId, userId), eq(jobTargets.targetRoleId, targetRoleId)))
    .limit(1);

  if (existingJobTarget) {
    const [updatedJobTarget] = await db
      .update(jobTargets)
      .set({
        companyName: draft.companyName,
        jobTitle: draft.jobTitle,
        jobUrl: draft.jobUrl,
        jobDescription: draft.jobDescription,
        updatedAt: now,
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
  db: DbMutationClient,
  userId: string,
  draft: OnboardingDraft,
  file: File | null,
  uploadedFile: UploadedResumeFile | null,
): Promise<ResumeAssetRow | null> {
  if (draft.resumePreview.source === "none") {
    return null;
  }

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

async function deleteUploadedResumeFile(storagePath: string) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return;
  }

  await supabase.storage.from(RESUME_ASSETS_BUCKET).remove([storagePath]);
}

export async function saveOnboardingDraftForUser(input: SaveOnboardingDraftInput) {
  const db = getDb();
  const file = input.file && input.file.size > 0 ? input.file : null;
  const uploadedFile = file ? await uploadResumeFile(input.userId, file) : null;
  const now = new Date();

  try {
    return await db.transaction(async (tx) => {
      const profile = await saveProfile(tx, input.userId, input.email, input.draft, now);
      const targetRole = await saveActiveTargetRole(tx, input.userId, input.draft);
      const jobTarget = await saveJobTarget(tx, input.userId, targetRole.id, input.draft, now);
      const resumeAsset = await saveResumeAsset(
        tx,
        input.userId,
        input.draft,
        file,
        uploadedFile,
      );

      return {
        profile,
        targetRole,
        jobTarget,
        resumeAsset,
      };
    });
  } catch (error) {
    if (uploadedFile) {
      await deleteUploadedResumeFile(uploadedFile.storagePath);
    }

    throw error;
  }
}
