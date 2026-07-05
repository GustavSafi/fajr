/**
 * CLI entry point.
 *
 * Step 1 only wires up configuration and reports readiness. The interview,
 * job search, and ranking flow are added in the following steps.
 */

import { loadConfig } from "./config/config.ts";
import { logger } from "./utils/logger.ts";

function describeReadiness(): void {
  const config = loadConfig();

  const anthropicReady = Boolean(config.anthropic.apiKey);
  const adzunaReady = Boolean(config.adzuna.appId && config.adzuna.appKey);
  // JobTech Dev is an open API — always available.
  const jobtechReady = true;

  logger.info("AI Job Matcher — configuration check");
  logger.info(`  Anthropic (interview): ${anthropicReady ? "ready" : "MISSING key"}`);
  logger.info(`  Adzuna:                ${adzunaReady ? "ready" : "not configured"}`);
  logger.info(`  JobTech Dev:           ${jobtechReady ? "ready (open API)" : "n/a"}`);

  if (!anthropicReady) {
    logger.warn("Set ANTHROPIC_API_KEY in .env before running the interview.");
  }
  if (!adzunaReady) {
    logger.warn("Adzuna not configured — only JobTech Dev will be searched.");
  }
}

describeReadiness();
