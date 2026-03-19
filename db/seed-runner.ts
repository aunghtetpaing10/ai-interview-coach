import "dotenv/config";

import { evalCases, promptVersions, questionBank, rubricDimensions } from "@/db/schema";
import {
  SEED_EVAL_CASES,
  SEED_PROMPT_VERSIONS,
  SEED_QUESTION_BANK,
  SEED_RUBRIC_DIMENSIONS,
} from "@/db/seed";
import { getDb, getSqlClient } from "@/lib/db/client";

async function seedReferenceData() {
  const db = getDb();

  await db
    .insert(rubricDimensions)
    .values([...SEED_RUBRIC_DIMENSIONS])
    .onConflictDoNothing();
  await db.insert(questionBank).values([...SEED_QUESTION_BANK]).onConflictDoNothing();
  await db
    .insert(promptVersions)
    .values([...SEED_PROMPT_VERSIONS])
    .onConflictDoNothing();
  await db.insert(evalCases).values([...SEED_EVAL_CASES]).onConflictDoNothing();
}

async function main() {
  try {
    await seedReferenceData();
    console.log("Reference data seeded.");
  } finally {
    await getSqlClient().end();
  }
}

void main();
