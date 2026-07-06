/**
 * CLI entry point — the full flow:
 *   interview (rule-based) → job query → search chosen source → rank → display.
 *
 * JobTech needs no keys. Adzuna needs ADZUNA_APP_ID / ADZUNA_APP_KEY in .env.
 *
 *   npm run dev
 */

import { loadConfig } from "./config/config.ts";
import { logger } from "./utils/logger.ts";
import { createCliIO } from "./interview/cli-io.ts";
import { runInterview } from "./interview/engine.ts";
import { buildJobQuery } from "./profile/query.ts";
import { buildProviderForSource } from "./apis/index.ts";
import { rankJobs } from "./ranking/index.ts";
import { renderResults } from "./results.ts";

async function main(): Promise<void> {
  const config = loadConfig();
  const io = createCliIO();

  let result;
  try {
    result = await runInterview(io);
  } finally {
    io.close?.();
  }

  const { profile, answers, source } = result;
  logger.debug(`Profile summary: ${profile.summary}`);

  const marketplace = typeof answers["adzMarket"] === "string" ? (answers["adzMarket"] as string) : undefined;
  const provider = buildProviderForSource(config, source, marketplace);

  if (!provider.isConfigured()) {
    logger.error(
      `The ${source} source isn't configured. Add its keys to .env (see .env.example) and try again.`,
    );
    process.exitCode = 1;
    return;
  }

  const query = buildJobQuery(profile, 30);
  logger.info(`\nSearching ${source} for "${query.what}"...`);

  let jobs = await provider.search(query);

  // A specific role phrase (e.g. "Backend Engineer") can match nothing on a
  // corpus that phrases titles differently. Broaden to the first keyword once.
  if (jobs.length === 0) {
    const broad = query.what.split(/\s+/)[0] ?? "";
    if (broad && broad.toLowerCase() !== query.what.toLowerCase()) {
      logger.info(`No exact matches — broadening to "${broad}"...`);
      jobs = await provider.search({ ...query, what: broad });
    }
  }

  logger.info(`Found ${jobs.length} listings; ranking...`);

  const ranked = rankJobs(profile, jobs, source);
  console.log(renderResults(ranked, source));
}

main().catch((err: unknown) => {
  logger.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
