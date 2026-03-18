import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { InterviewWorkspace } from "@/components/interview/interview-workspace";
import { createDemoInterviewSession } from "@/lib/interview-session/fixtures";

describe("InterviewWorkspace", () => {
  it("switches the mode selector and resets the prompt preview", async () => {
    const user = userEvent.setup();

    render(<InterviewWorkspace initialSession={createDemoInterviewSession()} />);

    expect(screen.getAllByText(/design a real-time notification service/i)[0]).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /behavioral/i }));

    expect(screen.getAllByText(/inherited something messy/i)[0]).toBeInTheDocument();
  });

  it("starts a live session and queues the next follow-up after a response", async () => {
    const user = userEvent.setup();

    render(<InterviewWorkspace initialSession={createDemoInterviewSession()} />);

    await user.click(screen.getAllByRole("button", { name: /start live session/i })[0]);

    const connectionMessages = await screen.findAllByText(
      /mock transport connected/i,
      {},
      { timeout: 3000 },
    );

    expect(connectionMessages[0]).toBeInTheDocument();

    const draftAreas = screen.getAllByPlaceholderText(/draft your answer to/i);

    await user.type(
      draftAreas[0],
      "I split the read/write paths and introduced backpressure limits.",
    );
    await user.click(screen.getAllByRole("button", { name: /send response/i })[0]);

    expect(screen.getAllByText(/hardest bottlenecks and why/i)[0]).toBeInTheDocument();
  });
});
