/**
 * CLI entry point — the full flow:
 *   interview (rule-based, source-localized) → job query → search chosen source
 *   → rank → display.
 *
 * JobTech runs in Swedish and needs no keys. Adzuna runs in English and needs
 * ADZUNA_APP_ID / ADZUNA_APP_KEY in .env.
 *
 *   npm run dev
 */

import { loadConfig } from "./config/config.ts";
import { logger } from "./utils/logger.ts";
import { langForSource } from "./i18n.ts";
import { UI } from "./interview/strings.ts";
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
  const lang = langForSource(source);
  const ui = UI[lang];
  logger.debug(`Profile summary: ${profile.summary}`);

  const marketplace = typeof answers["adzMarket"] === "string" ? (answers["adzMarket"] as string) : undefined;
  const provider = buildProviderForSource(config, source, marketplace);

  if (!provider.isConfigured()) {
    logger.error(ui.notConfigured(source));
    process.exitCode = 1;
    return;
  }

  const query = buildJobQuery(profile, 30);
  logger.info(ui.searching(source, query.what));

  let jobs = await provider.search(query);

  // A specific role phrase can match nothing on a corpus that phrases titles
  // differently. Broaden to the first keyword once (split on space or hyphen,
  // so Swedish compounds like "Backend-utvecklare" broaden to "Backend").
  if (jobs.length === 0) {
    const broad = query.what.split(/[\s-]+/)[0] ?? "";
    if (broad && broad.toLowerCase() !== query.what.toLowerCase()) {
      logger.info(ui.broadening(broad));
      jobs = await provider.search({ ...query, what: broad });
    }
  }

  logger.info(ui.found(jobs.length));

  const ranked = rankJobs(profile, jobs, source, lang);
  console.log(renderResults(ranked, source, lang));
}

main().catch((err: unknown) => {
  logger.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
