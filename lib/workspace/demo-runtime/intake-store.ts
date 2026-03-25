import "server-only";

import { buildJobTarget, buildProfile, buildResumeAsset, buildTargetRole, clone, demoRuntime } from "./state";
import type { OnboardingDraft } from "@/lib/intake/types";

export function loadDemoOnboardingDraftForUser(userId: string) {
  void userId;

  return clone(demoRuntime.readState().draft);
}

export function saveDemoOnboardingDraftForUser(input: {
  userId: string;
  email: string | null;
  draft: OnboardingDraft;
  file: File | null;
}) {
  const state = demoRuntime.readState();
  const now = demoRuntime.advanceTime(state);
  const draft = clone(input.draft);

  state.draft = draft;
  state.profile = buildProfile(input.email, draft, now);
  state.targetRole = buildTargetRole(draft, now);
  state.jobTarget = buildJobTarget(draft, state.targetRole.id, now);
  state.resumeAsset = buildResumeAsset(input.userId, draft, input.file, now);
  demoRuntime.writeState(state);

  return {
    profile: clone(state.profile),
    targetRole: clone(state.targetRole),
    jobTarget: clone(state.jobTarget),
    resumeAsset: state.resumeAsset ? clone(state.resumeAsset) : null,
  };
}
