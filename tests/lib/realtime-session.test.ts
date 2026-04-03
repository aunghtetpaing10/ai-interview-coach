import { describe, expect, it, vi } from "vitest";
import {
  buildRealtimeInstructions,
  buildRealtimeSessionConfig,
  buildRealtimeSessionCreateParams,
  createRealtimeClientSecret,
} from "@/lib/openai/realtime-session";
import { makeRealtimeInput } from "@/tests/helpers/factories";

describe("realtime session helpers", () => {
  const input = makeRealtimeInput({
    targetRole: "Backend Software Engineer",
    focus: "service decomposition and scaling tradeoffs",
    questionTitle: "Talk me through a system you have owned end-to-end.",
    openingPrompt: "Talk me through a system you have owned end-to-end.",
  });

  it("builds a structured interviewer prompt", () => {
    const instructions = buildRealtimeInstructions(input);

    expect(instructions).toContain("Aung");
    expect(instructions).toContain("Backend Software Engineer");
    expect(instructions).toContain("System design");
    expect(instructions).toContain("service decomposition and scaling tradeoffs");
    expect(instructions).toContain("Talk me through a system you have owned end-to-end.");
    expect(instructions).toContain("Practice style: Live mock.");
  });

  it("builds a browser-safe realtime session configuration", () => {
    const session = buildRealtimeSessionConfig(input, {
      model: "gpt-realtime",
      voice: "marin",
      transcriptionModel: "gpt-4o-mini-transcribe",
      maxOutputTokens: 512,
      includeTranscriptionLogprobs: true,
    });

    expect(session).toEqual(
      expect.objectContaining({
        type: "realtime",
        model: "gpt-realtime",
        output_modalities: ["audio"],
        max_output_tokens: 512,
        include: ["item.input_audio_transcription.logprobs"],
        instructions: expect.stringContaining("Backend Software Engineer"),
        audio: expect.objectContaining({
          input: expect.objectContaining({
            format: { type: "audio/pcm", rate: 24000 },
            transcription: { model: "gpt-4o-mini-transcribe" },
            turn_detection: expect.objectContaining({
              type: "server_vad",
              create_response: true,
              prefix_padding_ms: 300,
              silence_duration_ms: 500,
              threshold: 0.5,
            }),
          }),
          output: expect.objectContaining({
            format: { type: "audio/pcm", rate: 24000 },
            voice: "marin",
          }),
        }),
      }),
    );
  });

  it("wraps the session in a client-secret create payload", () => {
    const payload = buildRealtimeSessionCreateParams(input, {
      model: "gpt-realtime",
      clientSecretTtlSeconds: 900,
    });

    expect(payload).toEqual(
      expect.objectContaining({
        expires_after: { anchor: "created_at", seconds: 900 },
        session: expect.objectContaining({
          type: "realtime",
          model: "gpt-realtime",
        }),
      }),
    );
  });

  it("sends the structured payload to the realtime client", async () => {
    const create = vi.fn().mockResolvedValue({
      value: "ek_test",
      expires_at: 1_700_000_000,
      session: {
        type: "realtime",
        model: "gpt-realtime",
      },
    });

    const response = await createRealtimeClientSecret({
      openaiClient: {
        realtime: {
          clientSecrets: {
            create,
          },
        },
      },
      input,
      options: {
        model: "gpt-realtime",
        clientSecretTtlSeconds: 900,
      },
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        expires_after: { anchor: "created_at", seconds: 900 },
        session: expect.objectContaining({
          type: "realtime",
          model: "gpt-realtime",
          audio: expect.objectContaining({
            output: expect.objectContaining({
              voice: "marin",
            }),
          }),
        }),
      }),
    );
    expect(response.value).toBe("ek_test");
  });
});
