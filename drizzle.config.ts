import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.POSTGRES_URL;

if (!databaseUrl) {
  throw new Error(
    "POSTGRES_URL is required for drizzle-kit. Run the npm db scripts or load .env before invoking drizzle-kit directly.",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dbCredentials: {
    url: databaseUrl,
  },
  strict: true,
  verbose: true,
});
