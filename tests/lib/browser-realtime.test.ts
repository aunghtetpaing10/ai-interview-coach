import { afterEach, describe, expect, it, vi } from "vitest";
import type { RealtimeSessionSecretPayload } from "@/lib/openai/browser-realtime";
import {
  buildBrowserRealtimeSessionRequest,
  connectBrowserRealtimeSession,
  createBrowserRealtimeSnapshot,
} from "@/lib/openai/browser-realtime";

describe("browser realtime helper", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds a fallback snapshot for text-only sessions", () => {
    const snapshot = createBrowserRealtimeSnapshot({
      provider: "mock",
      message: "Text fallback active.",
    });

    expect(snapshot.provider).toBe("mock");
    expect(snapshot.transportHint).toMatch(/text fallback active/i);
  });

  it("builds the realtime request and connects using the ephemeral token", async () => {
    const input = {
      candidateName: "Aung",
      targetRole: "Platform engineer",
      mode: "system-design" as const,
      focus: "capacity and failure domains",
      openingPrompt: "Design a notification service.",
    };

    const sessionPayload: RealtimeSessionSecretPayload = {
      provider: "openai",
      clientSecret: {
        value: "ek_test",
        expiresAt: 1_700_000_000,
      },
      session: {
        type: "realtime",
        model: "gpt-realtime",
      } as const,
    };

    const sessionResponse = new Response(JSON.stringify(sessionPayload), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
    const answerResponse = new Response("answer-sdp", {
      status: 200,
      headers: { "content-type": "application/sdp" },
    });

    const fetchMock = vi.fn(async (url: string) => {
      if (url === "/api/realtime/session") {
        return sessionResponse;
      }

      if (url === "https://api.openai.com/v1/realtime/calls") {
        return answerResponse;
      }

      throw new Error(`Unexpected fetch call: ${url}`);
    });

    class FakeDataChannel {
      readyState = "open";
      sent: string[] = [];
      onopen: (() => void) | null = null;
      onmessage: ((event: MessageEvent) => void) | null = null;

      addEventListener() {}
      send(value: string) {
        this.sent.push(value);
      }
      close() {}
    }

    const fakeDataChannel = new FakeDataChannel();
    const stopTrack = vi.fn();
    const fakeStream = {
      getTracks: () => [{ stop: stopTrack }],
    } as unknown as MediaStream;

    class FakePeerConnection {
      localDescription: RTCSessionDescriptionInit | null = null;
      remoteDescription: RTCSessionDescriptionInit | null = null;
      ontrack: ((event: RTCTrackEvent) => void) | null = null;
      onconnectionstatechange: (() => void) | null = null;

      addTrack = vi.fn();
      createDataChannel = vi.fn(() => fakeDataChannel);
      createOffer = vi.fn(async () => ({ type: "offer", sdp: "offer-sdp" }));
      setLocalDescription = vi.fn(async (description) => {
        this.localDescription = description;
      });
      setRemoteDescription = vi.fn(async (description) => {
        this.remoteDescription = description;
      });
      close = vi.fn();
    }

    const getUserMedia = vi.fn(async () => fakeStream);

    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("RTCPeerConnection", FakePeerConnection);
    vi.stubGlobal("navigator", {
      mediaDevices: { getUserMedia },
    });

    const connection = await connectBrowserRealtimeSession(input, {
      audioElement: {
        play: vi.fn(),
        srcObject: null,
      } as unknown as HTMLAudioElement,
    });

    expect(buildBrowserRealtimeSessionRequest(input)).toEqual(
      expect.objectContaining({
        candidateName: "Aung",
        targetRole: "Platform engineer",
        mode: "system-design",
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/realtime/session",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.openai.com/v1/realtime/calls",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer ek_test",
        }),
      }),
    );

    connection.sendText("I split the writes and reads.");
    expect(fakeDataChannel.sent[0]).toContain("conversation.item.create");
    expect(fakeDataChannel.sent[0]).toContain("I split the writes and reads.");

    connection.close();
    expect(stopTrack).toHaveBeenCalledTimes(1);
  });
});
