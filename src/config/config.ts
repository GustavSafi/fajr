/**
 * Central, typed access to all environment configuration.
 *
 * Nothing else in the app reads `process.env` directly — everything goes
 * through here so validation lives in one place and secrets never get scattered
 * across the codebase.
 *
 * The interview is fully rule-based and needs no keys. Configuration here is
 * only for the job-search providers (added in later steps).
 */

const DEFAULT_JOBTECH_URL = "https://jobsearch.api.jobtechdev.se";

function optional(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export interface AdzunaConfig {
  appId: string | undefined;
  appKey: string | undefined;
  country: string;
}

export interface JobTechConfig {
  baseUrl: string;
}

export interface AppConfig {
  adzuna: AdzunaConfig;
  jobtech: JobTechConfig;
}

/** Read and normalize configuration from the environment. */
export function loadConfig(): AppConfig {
  return {
    adzuna: {
      appId: optional("ADZUNA_APP_ID"),
      appKey: optional("ADZUNA_APP_KEY"),
      country: optional("ADZUNA_COUNTRY") ?? "gb",
    },
    jobtech: {
      baseUrl: optional("JOBTECH_BASE_URL") ?? DEFAULT_JOBTECH_URL,
    },
  };
}

/**
 * Validate provider configuration. Job providers are checked individually at
 * search time so the app still works with just one (or none, for a dry run).
 * Fails loudly on a half-configured provider rather than at request time.
 */
export function assertRunnable(config: AppConfig): void {
  const problems: string[] = [];

  const adzunaPartial = Boolean(config.adzuna.appId) !== Boolean(config.adzuna.appKey);
  if (adzunaPartial) {
    problems.push(
      "Adzuna is half-configured — set BOTH ADZUNA_APP_ID and ADZUNA_APP_KEY, or neither.",
    );
  }

  if (problems.length > 0) {
    throw new Error(
      "Configuration error:\n" +
        problems.map((p) => `  • ${p}`).join("\n") +
        "\n\nCopy .env.example to .env and fill in the values.",
    );
  }
}
