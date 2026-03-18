import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "ai-interview-coach",
    timestamp: new Date().toISOString(),
  });
}
