/**
 * Temporary demo: search both providers with a keyword and print normalized
 * results. Lets us verify the provider layer against live APIs before wiring it
 * into the full interview → search → rank flow.
 *
 *   npm run search -- "backend developer"
 */

import { loadConfig } from "./config/config.ts";
import { buildProviders, searchAll } from "./apis/index.ts";
import { logger } from "./utils/logger.ts";
import type { Job } from "./models/index.ts";

function summarize(job: Job): string {
  const bits = [
    job.salaryMin !== undefined
      ? `${Math.round(job.salaryMin)}${job.salaryMax ? `–${Math.round(job.salaryMax)}` : ""} ${job.salaryCurrency ?? ""}${job.salaryPredicted ? " (est.)" : ""}`
      : "salary n/a",
    job.arrangement ?? "arrangement n/a",
    job.employmentType ?? "type n/a",
    job.requiredSkills?.length ? `${job.requiredSkills.length} required skills` : "no structured skills",
  ];
  return `  [${job.source}] ${job.title} @ ${job.company ?? "?"} — ${job.location ?? "?"}, ${job.country ?? "?"}\n      ${bits.join(" · ")}`;
}

async function main(): Promise<void> {
  const what = process.argv.slice(2).join(" ") || "developer";
  const config = loadConfig();
  const providers = buildProviders(config);

  logger.info(`Searching ${providers.length} provider(s) for "${what}"...`);
  const jobs = await searchAll(providers, { what, limit: 5 });

  logger.info(`\nCombined pool: ${jobs.length} jobs\n`);
  for (const job of jobs) console.log(summarize(job));
}

main().catch((err: unknown) => {
  logger.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
