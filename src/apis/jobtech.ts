import type { EmploymentType, Job, JobProvider, JobQuery } from "../models/index.ts";
import type { JobTechConfig } from "../config/config.ts";
import { fetchJson } from "./http.ts";
import { logger } from "../utils/logger.ts";

/** Minimal shape of the JobTech JobSearch response we rely on. */
interface JobTechResponse {
  hits?: JobTechHit[];
}

interface JobTechHit {
  id: string;
  headline?: string;
  description?: { text?: string };
  employer?: { name?: string };
  workplace_address?: { municipality?: string; region?: string; country?: string };
  remote_work?: boolean;
  working_hours_type?: { label?: string };
  webpage_url?: string;
  application_details?: { url?: string };
  publication_date?: string;
  occupation_field?: { label?: string };
  must_have?: JobTechRequirements;
  nice_to_have?: JobTechRequirements;
}

interface JobTechRequirements {
  skills?: Array<{ label?: string }>;
  work_experiences?: Array<{ label?: string }>;
}

function mapEmployment(label: string | undefined): EmploymentType | undefined {
  if (!label) return undefined;
  const l = label.toLowerCase();
  if (l.includes("heltid")) return "full-time";
  if (l.includes("deltid")) return "part-time";
  return undefined;
}

function mapCountry(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  return raw.toLowerCase().startsWith("sverige") ? "Sweden" : raw;
}

function labels(req: JobTechRequirements | undefined): string[] {
  if (!req) return [];
  const out = [
    ...(req.skills ?? []).map((s) => s.label),
    ...(req.work_experiences ?? []).map((s) => s.label),
  ].filter((x): x is string => Boolean(x));
  return [...new Set(out)];
}

function toJob(hit: JobTechHit): Job {
  const address = hit.workplace_address ?? {};
  const job: Job = {
    id: `jobtech:${hit.id}`,
    source: "jobtech",
    title: hit.headline ?? "(untitled)",
    description: hit.description?.text ?? "",
    url: hit.application_details?.url ?? hit.webpage_url ?? "",
  };

  const company = hit.employer?.name;
  if (company) job.company = company;

  const location = address.municipality ?? address.region;
  if (location) job.location = location;

  const country = mapCountry(address.country);
  if (country) job.country = country;

  // Only assert remote when the flag is explicitly true; absence is unknown.
  if (hit.remote_work === true) job.arrangement = "remote";

  const employment = mapEmployment(hit.working_hours_type?.label);
  if (employment) job.employmentType = employment;

  if (hit.occupation_field?.label) job.category = hit.occupation_field.label;
  if (hit.publication_date) job.postedAt = hit.publication_date;

  const required = labels(hit.must_have);
  if (required.length) job.requiredSkills = required;
  const preferred = labels(hit.nice_to_have);
  if (preferred.length) job.preferredSkills = preferred;

  return job;
}

/** Job provider backed by the open JobTech Dev JobSearch API (no key needed). */
export class JobTechProvider implements JobProvider {
  readonly name = "jobtech";
  private readonly baseUrl: string;

  constructor(config: JobTechConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
  }

  isConfigured(): boolean {
    return true; // open API
  }

  async search(query: JobQuery): Promise<Job[]> {
    const url = new URL(`${this.baseUrl}/search`);
    url.searchParams.set("q", query.what);
    url.searchParams.set("limit", String(Math.min(query.limit ?? 25, 100)));
    if (query.remoteOnly) url.searchParams.set("remote", "true");

    try {
      const data = await fetchJson<JobTechResponse>(url);
      return (data.hits ?? []).map(toJob);
    } catch (err) {
      logger.warn(`JobTech search failed: ${err instanceof Error ? err.message : String(err)}`);
      return [];
    }
  }
}
