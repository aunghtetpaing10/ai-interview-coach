import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InterviewWorkspace } from "@/components/interview/interview-workspace";
import { createDemoInterviewSession } from "@/lib/interview-session/fixtures";

const connectBrowserRealtimeSessionMock = vi.hoisted(() => vi.fn());
const createBrowserRealtimeSnapshotMock = vi.hoisted(() => vi.fn());
const pushMock = vi.hoisted(() => vi.fn());
const fetchMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/openai/browser-realtime", () => ({
  connectBrowserRealtimeSession: connectBrowserRealtimeSessionMock,
  createBrowserRealtimeSnapshot: createBrowserRealtimeSnapshotMock,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

describe("InterviewWorkspace", () => {
  global.fetch = fetchMock as typeof fetch;

  beforeEach(() => {
    connectBrowserRealtimeSessionMock.mockReset();
    createBrowserRealtimeSnapshotMock.mockReset();
    pushMock.mockReset();
    fetchMock.mockReset();
  });

  it("switches the mode selector and resets the prompt preview", async () => {
    const user = userEvent.setup();

    render(<InterviewWorkspace initialSession={createDemoInterviewSession()} />);

    expect(
      screen.getAllByText(/design a real-time notification service/i)[0],
    ).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /behavioral/i }));

    expect(screen.getAllByText(/inherited something messy/i)[0]).toBeInTheDocument();
    expect(pushMock).toHaveBeenCalledWith("/interview?mode=behavioral");
  });

  it(
    "connects the realtime transport and still supports text fallback submission",
    { timeout: 15000 },
    async () => {
    const user = userEvent.setup();
    const sendText = vi.fn();
    const close = vi.fn();

    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn(),
      text: vi.fn(),
    });

    connectBrowserRealtimeSessionMock.mockResolvedValue({
      snapshot: {
        provider: "openai",
        label: "gpt-realtime realtime",
        transportHint: "Connected over WebRTC.",
        fallbackReason: "OpenAI Realtime session established.",
        instructionPreview: "Probe the candidate's claims.",
      },
      connectionMessage: "Realtime transport connected and ready for voice interaction.",
      sendText,
      close,
    });

    render(<InterviewWorkspace initialSession={createDemoInterviewSession()} />);

    const startButton = screen.getAllByRole("button", {
      name: /start live session/i,
    })[0];

    await user.click(startButton);
    expect(startButton).toBeDisabled();

    const statusRow = screen.getAllByText("Session status")[0]?.closest("div");
    expect(statusRow).not.toBeNull();
    await within(statusRow as HTMLElement).findByText(
      /realtime transport connected and ready/i,
      {},
      { timeout: 3000 },
    );
    expect(connectBrowserRealtimeSessionMock).toHaveBeenCalledTimes(1);

    const draftAreas = screen.getAllByPlaceholderText(/draft your answer to/i);

    await user.type(
      draftAreas[0],
      "I split the read/write paths and introduced backpressure limits.",
    );
    await user.click(screen.getAllByRole("button", { name: /send response/i })[0]);

    expect(sendText).toHaveBeenCalledWith(
      "I split the read/write paths and introduced backpressure limits.",
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/interview/sessions/interview-demo-session/turns",
      expect.objectContaining({
        method: "POST",
      }),
    );
    await waitFor(() =>
      expect(screen.getAllByText(/hardest bottlenecks and why/i)[0]).toBeInTheDocument(),
    );
  });

  it("completes the session and opens the report processing page when the job is queued", async () => {
    const user = userEvent.setup();

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({}),
      text: vi.fn(),
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({
        jobId: "job-123",
        status: "queued",
      }),
      text: vi.fn(),
    });

    render(<InterviewWorkspace initialSession={createDemoInterviewSession()} />);

    await user.click(screen.getAllByRole("button", { name: /^end$/i })[0]);

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/reports/processing/interview-demo-session"));
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/interview/sessions/interview-demo-session/complete",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/interview/sessions/interview-demo-session/report",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(
      screen.getByText(/report is processing\. opening the job tracker\./i),
    ).toBeInTheDocument();
    },
  );
});
