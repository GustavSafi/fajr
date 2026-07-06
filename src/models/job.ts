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

/** The breakdown behind a compatibility score — makes ranking explainable. */
export interface ScoreBreakdown {
  title: number;
  skills: number;
  experience: number;
  location: number;
  remote: number;
  salary: number;
  industry: number;
  keywords: number;
}

/** A job paired with its compatibility score and human-readable reasoning. */
export interface RankedJob {
  job: Job;
  /** Overall compatibility, 0–100. */
  score: number;
  breakdown: ScoreBreakdown;
  /** Why this job is a good match. */
  reasons: string[];
  /** Requirements the candidate appears to be missing, if any. */
  gaps: string[];
}
