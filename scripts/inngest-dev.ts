import { createServer, type IncomingMessage } from "node:http";
import { randomUUID } from "node:crypto";
import { z } from "zod";

const REPORT_GENERATION_EVENT_NAME = "report/generation.requested";

const reportGenerationRequestedEventSchema = z.object({
  sessionId: z.string().min(1),
  userId: z.string().min(1),
  reportJobId: z.string().min(1).optional(),
});

type InngestEventEnvelope = {
  id?: string;
  name?: string;
  data?: unknown;
};

const host = process.env.INNGEST_DEV_HOST ?? "127.0.0.1";
const port = Number(process.env.INNGEST_DEV_PORT ?? "8288");
const maxAttempts = Number(process.env.INNGEST_DEV_MAX_ATTEMPTS ?? "3");
const reportDelayMs = Number(
  process.env.INNGEST_DEV_REPORT_DELAY_MS ??
    (process.env.E2E_DEMO_MODE === "1" ? "1200" : "0"),
);
const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000";

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function readRequestBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  return Buffer.concat(chunks).toString("utf8");
}

async function processReportGenerationEvent(data: unknown) {
  const payload = reportGenerationRequestedEventSchema.parse(data);

  if (reportDelayMs > 0) {
    await wait(reportDelayMs);
  }

  for (let attemptCount = 1; attemptCount <= maxAttempts; attemptCount += 1) {
    const response = await fetch(`${appBaseUrl}/api/inngest/dev/report-generation`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        ...payload,
        attemptCount,
        maxAttempts,
      }),
    });

    if (response.ok) {
      return;
    }

    if (attemptCount >= maxAttempts) {
      const errorText = await response.text().catch(() => "Report generation failed.");

      console.error("[inngest:dev] report generation failed", {
        sessionId: payload.sessionId,
        reportJobId: payload.reportJobId,
        attemptCount,
        status: response.status,
        error: errorText,
      });
      return;
    }

    await wait(200 * attemptCount);
  }
}

async function dispatchEvent(event: InngestEventEnvelope) {
  if (event.name !== REPORT_GENERATION_EVENT_NAME) {
    return;
  }

  await processReportGenerationEvent(event.data);
}

const server = createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true }));
    return;
  }

  if (request.method === "POST" && request.url?.startsWith("/e/")) {
    try {
      const rawBody = await readRequestBody(request);
      const parsed = JSON.parse(rawBody) as InngestEventEnvelope | InngestEventEnvelope[];
      const events = Array.isArray(parsed) ? parsed : [parsed];
      const ids = events.map((event) => event.id ?? randomUUID());

      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ ids, status: 200 }));

      for (const event of events) {
        void dispatchEvent(event);
      }
      return;
    } catch (error) {
      response.writeHead(400, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          ids: [],
          status: 400,
          error:
            error instanceof Error ? error.message : "Failed to parse Inngest event payload.",
        }),
      );
      return;
    }
  }

  response.writeHead(404, { "content-type": "application/json" });
  response.end(JSON.stringify({ error: "Not found." }));
});

server.listen(port, host, () => {
  console.log(`[inngest:dev] listening on http://${host}:${port}`);
});

function shutdown() {
  server.close(() => {
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
