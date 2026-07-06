import type { AppConfig } from "../config/config.ts";
import type { Job, JobProvider, JobQuery, JobSource } from "../models/index.ts";
import { JobTechProvider } from "./jobtech.ts";
import { AdzunaProvider } from "./adzuna.ts";
import { logger } from "../utils/logger.ts";

/**
 * Build the single provider for a chosen source. For Adzuna, `marketplace`
 * (e.g. "gb", "us") overrides the config default so the interview's country
 * choice selects the API marketplace.
 */
export function buildProviderForSource(
  config: AppConfig,
  source: JobSource,
  marketplace?: string,
): JobProvider {
  if (source === "adzuna") {
    const adzuna = marketplace ? { ...config.adzuna, country: marketplace } : config.adzuna;
    return new AdzunaProvider(adzuna);
  }
  return new JobTechProvider(config.jobtech);
}

/**
 * Build the list of usable job providers from config. Adding a new provider is
 * a single line here plus its class file — nothing else changes.
 * Unconfigured providers (e.g. Adzuna without keys) are filtered out.
 */
export function buildProviders(config: AppConfig): JobProvider[] {
  const all: JobProvider[] = [
    new JobTechProvider(config.jobtech),
    new AdzunaProvider(config.adzuna),
  ];
  return all.filter((p) => p.isConfigured());
}

/**
 * Search every provider concurrently and return the combined pool. Each
 * provider isolates its own failures (returns []), so one bad source never
 * sinks the search. De-duplication and ranking happen in later steps.
 */
export async function searchAll(providers: JobProvider[], query: JobQuery): Promise<Job[]> {
  const perProvider = await Promise.all(
    providers.map(async (p) => {
      const jobs = await p.search(query);
      logger.info(`  ${p.name}: ${jobs.length} jobs`);
      return jobs;
    }),
  );
  return perProvider.flat();
}
