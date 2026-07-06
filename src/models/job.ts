import type { EmploymentType, WorkArrangement } from "./profile.ts";

/**
 * A single job opening, normalized into one common shape regardless of which
 * provider it came from. Every provider client maps its raw response into this
 * interface. Optional fields reflect reality: no single provider fills them all
 * (e.g. JobTech rarely has salary; Adzuna has no remote flag or structured
 * skills), so the ranker must score what is present and stay neutral otherwise.
 */
export interface Job {
  /** Stable id used for de-duplication (provider name + provider's own id). */
  id: string;
  /** Which provider surfaced this job (e.g. "adzuna", "jobtech"). */
  source: string;
  title: string;
  company?: string;
  location?: string;
  /** Country name, when derivable (e.g. "Sweden", "UK"). */
  country?: string;
  arrangement?: WorkArrangement;
  employmentType?: EmploymentType;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  /** True when the salary is provider-estimated, not advertised (Adzuna). */
  salaryPredicted?: boolean;
  /** Provider category/occupation label, when available. */
  category?: string;
  /** Structured requirements, when the provider supplies them (JobTech). */
  requiredSkills?: string[];
  preferredSkills?: string[];
  description: string;
  /** Direct link the user can open to apply. */
  url: string;
  /** ISO date string when the posting was published, if known. */
  postedAt?: string;
}

/** The dimensions the ranker scores a job on. */
export type ScoreDimension =
  | "title"
  | "skills"
  | "experience"
  | "location"
  | "remote"
  | "salary"
  | "employment";

/**
 * One dimension's contribution to a job's score. `applicable` is false when the
 * job (or profile) lacks the data for this dimension — in which case it is left
 * out of the weighted average entirely rather than counted as a zero.
 */
export interface SubScore {
  dimension: ScoreDimension;
  /** 0–1 quality on this dimension (only meaningful when applicable). */
  score: number;
  applicable: boolean;
  /** Weight this dimension carried for this job's source. */
  weight: number;
}

/** A job paired with its compatibility score and human-readable reasoning. */
export interface RankedJob {
  job: Job;
  /** Overall compatibility, 0–100 (weighted average of applicable sub-scores). */
  score: number;
  subScores: SubScore[];
  /** Why this job is a good match. */
  reasons: string[];
  /** Requirements the candidate appears to be missing, if any. */
  gaps: string[];
}
