import type { Job } from "./job.ts";

/**
 * A normalized job-search query, derived from the user's profile. Provider
 * clients translate this into whatever parameters their own API expects.
 */
export interface JobQuery {
  /** Free-text "what" — role titles / keywords. */
  what: string;
  /** Free-text "where" — city / country, if the user has a location preference. */
  where?: string;
  remoteOnly?: boolean;
  salaryMin?: number;
  /** Max results to request from each provider. */
  limit?: number;
}

/**
 * The contract every job source implements. Adding a new API later means
 * writing one class that implements this interface — nothing else changes.
 */
export interface JobProvider {
  /** Short, stable identifier used in logs and job ids (e.g. "adzuna"). */
  readonly name: string;
  /** Whether this provider is configured and usable (e.g. has its keys). */
  isConfigured(): boolean;
  /** Run a search and return normalized jobs. Should not throw on empty results. */
  search(query: JobQuery): Promise<Job[]>;
}
