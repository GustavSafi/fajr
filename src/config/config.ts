/**
 * Central, typed access to all environment configuration.
 *
 * Nothing else in the app reads `process.env` directly — everything goes
 * through here so validation lives in one place and secrets never get scattered
 * across the codebase.
 */

const DEFAULT_MODEL = "claude-opus-4-8";
const DEFAULT_JOBTECH_URL = "https://jobsearch.api.jobtechdev.se";

function optional(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export interface AnthropicConfig {
  apiKey: string | undefined;
  model: string;
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
  anthropic: AnthropicConfig;
  adzuna: AdzunaConfig;
  jobtech: JobTechConfig;
}

/** Read and normalize configuration from the environment. */
export function loadConfig(): AppConfig {
  return {
    anthropic: {
      apiKey: optional("ANTHROPIC_API_KEY"),
      model: optional("ANTHROPIC_MODEL") ?? DEFAULT_MODEL,
    },
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
 * Assert that the config required to actually run is present. Fails loudly with
 * a clear message rather than making a half-configured API call later.
 *
 * The Anthropic key is mandatory (it drives the interview). Job providers are
 * checked individually at search time so the app still works with just one.
 */
export function assertRunnable(config: AppConfig): void {
  const problems: string[] = [];

  if (!config.anthropic.apiKey) {
    problems.push("ANTHROPIC_API_KEY is missing — the interview cannot run without it.");
  }

  const adzunaPartial =
    Boolean(config.adzuna.appId) !== Boolean(config.adzuna.appKey);
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
