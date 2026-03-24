import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { reportGenerationFunction } from "@/lib/inngest/report-generation";

export const runtime = "nodejs";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [reportGenerationFunction],
});
