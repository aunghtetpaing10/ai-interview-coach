import { describe, expect, it } from "vitest";
import { GET as getHealthRoute } from "@/app/api/health/route";

describe("health api route", () => {
  it("returns a healthy service payload", async () => {
    const response = await getHealthRoute();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "ok",
      service: "ai-interview-coach",
      timestamp: expect.any(String),
    });
  });
});
