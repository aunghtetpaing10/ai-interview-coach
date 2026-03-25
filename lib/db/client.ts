import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";
import { getEnv } from "@/lib/env";

type Database = ReturnType<typeof drizzle<typeof schema>>;
type SqlClient = ReturnType<typeof postgres>;

declare global {
  var __interviewCoachSql: SqlClient | undefined;
  var __interviewCoachDb: Database | undefined;
}

function createSqlClient() {
  const env = getEnv();

  if (!env.POSTGRES_URL) {
    throw new Error("POSTGRES_URL is required for product routes.");
  }

    return postgres(env.POSTGRES_URL, {
      prepare: false,
      max: process.env.DB_MAX_CONNECTIONS ? parseInt(process.env.DB_MAX_CONNECTIONS, 10) : 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }

export function getSqlClient() {
  if (!globalThis.__interviewCoachSql) {
    globalThis.__interviewCoachSql = createSqlClient();
  }

  return globalThis.__interviewCoachSql;
}

export function getDb() {
  if (!globalThis.__interviewCoachDb) {
    globalThis.__interviewCoachDb = drizzle(getSqlClient(), {
      schema,
    });
  }

  return globalThis.__interviewCoachDb;
}
