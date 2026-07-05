/**
 * CLI entry point.
 *
 * Runs the structured interview and prints the resulting profile. The interview
 * is fully rule-based — no API keys required. Job search and ranking are added
 * in later steps.
 *
 *   npm run dev
 */

import { logger } from "./utils/logger.ts";
import { createCliIO } from "./interview/cli-io.ts";
import { runInterview } from "./interview/engine.ts";

async function main(): Promise<void> {
  const io = createCliIO();
  try {
    const { profile } = await runInterview(io);
    io.say("Here's the profile I built:");
    console.log(JSON.stringify(profile, null, 2));
  } finally {
    io.close?.();
  }
}

main().catch((err: unknown) => {
  logger.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
