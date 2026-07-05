/**
 * CLI entry point.
 *
 * Runs the adaptive interview and prints the resulting structured profile.
 * Job search and ranking are added in later steps.
 *
 *   npm run dev            # real interview (needs ANTHROPIC_API_KEY)
 *   npm run dev -- --mock  # offline demo with a scripted brain (no API key)
 */

import { loadConfig, assertRunnable } from "./config/config.ts";
import { logger } from "./utils/logger.ts";
import { createAnthropicClient } from "./services/anthropic.ts";
import { ClaudeBrain, MockBrain } from "./interview/brain.ts";
import { createCliIO } from "./interview/cli-io.ts";
import { runInterview } from "./interview/engine.ts";
import type { InterviewBrain } from "./interview/types.ts";

const MOCK_QUESTIONS = [
  "What kind of work are you hoping to do?",
  "What made you choose that field?",
  "What skills are you most confident in?",
  "Would you be open to relocating, and is remote work important to you?",
  "What's your ideal salary range?",
];

async function main(): Promise<void> {
  const useMock = process.argv.includes("--mock");
  const config = loadConfig();

  let brain: InterviewBrain;
  if (useMock) {
    logger.info("Running in --mock mode (no API calls).");
    brain = new MockBrain(MOCK_QUESTIONS);
  } else {
    assertRunnable(config);
    logger.info(`Starting interview with model: ${config.anthropic.model}`);
    brain = new ClaudeBrain(createAnthropicClient(config), config.anthropic.model);
  }

  const io = createCliIO();
  try {
    const { profile } = await runInterview(brain, io);
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
