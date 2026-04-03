import type {
  CompanyStyle,
  InterviewDifficulty,
  InterviewMode,
  PracticeStyle,
} from "@/lib/types/interview";
import type { RealtimeSessionSnapshot } from "@/lib/interview-session/types";

export interface BrowserRealtimeSessionInput {
  candidateName: string;
  targetRole: string;
  mode: InterviewMode;
  practiceStyle: PracticeStyle;
  difficulty: InterviewDifficulty;
  companyStyle: CompanyStyle | null;
  questionId: string;
  questionTitle: string;
  stageIndex: number;
  stageLabel: string;
  focus: string;
  interviewerGoal: string;
  followUpPolicy: string;
  openingPrompt: string;
}

export interface RealtimeSessionSecretPayload {
  provider: "openai";
  clientSecret: {
    value: string;
    expiresAt: number;
  };
  session: {
    type?: string;
    model?: string;
    [key: string]: unknown;
  };
}

export interface BrowserRealtimeConnection {
  snapshot: RealtimeSessionSnapshot;
  connectionMessage: string;
  sendText(text: string): void;
  close(): void;
}

export interface BrowserRealtimeConnectionOptions {
  audioElement?: HTMLAudioElement | null;
  signal?: AbortSignal;
  microphoneEnabled?: boolean;
}

const OPENAI_CALLS_ENDPOINT = "https://api.openai.com/v1/realtime/calls";

export function buildBrowserRealtimeSessionRequest(
  input: BrowserRealtimeSessionInput,
) {
  return {
    candidateName: input.candidateName,
    targetRole: input.targetRole,
    mode: input.mode,
    practiceStyle: input.practiceStyle,
    difficulty: input.difficulty,
    companyStyle: input.companyStyle,
    questionId: input.questionId,
    questionTitle: input.questionTitle,
    stageIndex: input.stageIndex,
    stageLabel: input.stageLabel,
    focus: input.focus,
    interviewerGoal: input.interviewerGoal,
    followUpPolicy: input.followUpPolicy,
    openingPrompt: input.openingPrompt,
  };
}

export function createBrowserRealtimeSnapshot(input: {
  provider: "openai" | "mock";
  message: string;
  model?: string;
  openingPrompt?: string;
}): RealtimeSessionSnapshot {
  if (input.provider === "openai") {
    const model = input.model ?? "gpt-realtime";

    return {
      provider: "openai",
      label: `${model} realtime`,
      transportHint: "Connected over WebRTC with an ephemeral OpenAI session secret.",
      fallbackReason: "OpenAI Realtime session established.",
      instructionPreview:
        input.openingPrompt ??
        "Probe the candidate's claims, keep the follow-up tight, and ground every question in the resume, target role, and transcript.",
    };
  }

  return {
    provider: "mock",
    label: "Browser text fallback",
    transportHint: input.message,
    fallbackReason: input.message,
    instructionPreview:
      input.openingPrompt ??
      "Probe the candidate's claims, keep the follow-up tight, and ground every question in the resume, target role, and transcript.",
  };
}

function buildConversationItemEvent(text: string) {
  return {
    type: "conversation.item.create",
    item: {
      type: "message",
      role: "user",
      content: [
        {
          type: "input_text",
          text,
        },
      ],
    },
  };
}

function buildResponseCreateEvent() {
  return {
    type: "response.create",
  };
}

function parseErrorMessage(body: string, fallback: string) {
  const trimmed = body.trim();
  if (!trimmed) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(trimmed) as { error?: string; message?: string };
    return parsed.error ?? parsed.message ?? fallback;
  } catch {
    return trimmed;
  }
}

async function fetchRealtimeSession(
  input: BrowserRealtimeSessionInput,
  signal?: AbortSignal,
) {
  const response = await fetch("/api/realtime/session", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(buildBrowserRealtimeSessionRequest(input)),
    signal,
  });

  if (!response.ok) {
    throw new Error(
      parseErrorMessage(
        await response.text().catch(() => ""),
        "Failed to create a realtime session.",
      ),
    );
  }

  return (await response.json()) as RealtimeSessionSecretPayload;
}

export async function connectBrowserRealtimeSession(
  input: BrowserRealtimeSessionInput,
  options: BrowserRealtimeConnectionOptions = {},
): Promise<BrowserRealtimeConnection> {
  const payload = await fetchRealtimeSession(input, options.signal);
  const snapshot = createBrowserRealtimeSnapshot({
    provider: "openai",
    model: payload.session.model,
    message: "OpenAI Realtime connected.",
    openingPrompt: input.openingPrompt,
  });
  const pc = new RTCPeerConnection();
  const remoteAudioElement = options.audioElement ?? null;
  const stream = await (async () => {
    if (options.microphoneEnabled === false) {
      return null;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      return null;
    }

    try {
      return await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return null;
    }
  })();

  if (stream) {
    const [track] = stream.getTracks();
    if (track) {
      pc.addTrack(track, stream);
    }
  }

  const dataChannel = pc.createDataChannel("oai-events");

  if (remoteAudioElement) {
    pc.ontrack = (event) => {
      remoteAudioElement.srcObject = event.streams[0];
      void remoteAudioElement.play().catch(() => {});
    };
  }

  dataChannel.addEventListener("message", (event) => {
    if (event.data && typeof event.data === "string") {
      return;
    }
  });

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  const sdpResponse = await fetch(OPENAI_CALLS_ENDPOINT, {
    method: "POST",
    body: offer.sdp,
    headers: {
      Authorization: `Bearer ${payload.clientSecret.value}`,
      "Content-Type": "application/sdp",
    },
    signal: options.signal,
  });

  if (!sdpResponse.ok) {
    throw new Error(
      parseErrorMessage(
        await sdpResponse.text().catch(() => ""),
        "Failed to establish the realtime connection.",
      ),
    );
  }

  await pc.setRemoteDescription({
    type: "answer",
    sdp: await sdpResponse.text(),
  });

  const close = () => {
    try {
      dataChannel.close();
    } catch {
      // Ignore close failures from partially initialized channels.
    }

    try {
      pc.close();
    } catch {
      // Ignore close failures from partially initialized peer connections.
    }

    if (stream) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
    }
  };

  return {
    snapshot,
    connectionMessage: "Realtime transport connected and ready for voice interaction.",
    sendText(text: string) {
      if (dataChannel.readyState !== "open") {
        return;
      }

      dataChannel.send(JSON.stringify(buildConversationItemEvent(text)));
      dataChannel.send(JSON.stringify(buildResponseCreateEvent()));
    },
    close,
  };
}
