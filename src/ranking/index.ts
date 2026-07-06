import type { Job, JobSource, RankedJob, UserProfile } from "../models/index.ts";
import { scoreJob } from "./score.ts";

export { scoreJob } from "./score.ts";

/** De-duplicate a pool by normalized title+company (belt-and-suspenders). */
function dedupe(jobs: Job[]): Job[] {
  const seen = new Set<string>();
  const out: Job[] = [];
  for (const job of jobs) {
    const key = `${job.title}|${job.company ?? ""}`.toLowerCase().replace(/\s+/g, " ").trim();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(job);
  }
  return out;
}

/** Score every job and return them ranked best-first. */
export function rankJobs(profile: UserProfile, jobs: Job[], source: JobSource): RankedJob[] {
  return dedupe(jobs)
    .map((job) => scoreJob(profile, job, source))
    .sort((a, b) => b.score - a.score);
}
