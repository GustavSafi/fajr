import type { EmploymentType, Job, JobProvider, JobQuery, WorkArrangement } from "../models/index.ts";
import type { AdzunaConfig } from "../config/config.ts";
import { fetchJson } from "./http.ts";
import { logger } from "../utils/logger.ts";

interface AdzunaResponse {
  results?: AdzunaResult[];
}

interface AdzunaResult {
  id: string;
  title?: string;
  description?: string;
  company?: { display_name?: string };
  location?: { display_name?: string; area?: string[] };
  category?: { label?: string };
  contract_time?: string; // full_time | part_time
  contract_type?: string; // permanent | contract
  salary_min?: number;
  salary_max?: number;
  salary_is_predicted?: string; // "1" | "0"
  created?: string;
  redirect_url?: string;
}

/** Currency for each Adzuna marketplace we might target. */
const CURRENCY_BY_COUNTRY: Record<string, string> = {
  gb: "GBP",
  us: "USD",
  de: "EUR",
  fr: "EUR",
  nl: "EUR",
  au: "AUD",
  ca: "CAD",
};

function mapEmployment(result: AdzunaResult): EmploymentType | undefined {
  if (result.contract_type === "contract") return "contract";
  if (result.contract_time === "full_time") return "full-time";
  if (result.contract_time === "part_time") return "part-time";
  return undefined;
}

/** Adzuna has no remote flag — infer conservatively from title + description. */
function inferArrangement(text: string): WorkArrangement | undefined {
  const t = text.toLowerCase();
  if (/\bhybrid\b/.test(t)) return "hybrid";
  if (/\b(fully remote|remote|work from home|wfh)\b/.test(t)) return "remote";
  return undefined;
}

export class AdzunaProvider implements JobProvider {
  readonly name = "adzuna";
  private readonly appId: string | undefined;
  private readonly appKey: string | undefined;
  private readonly country: string;

  constructor(config: AdzunaConfig) {
    this.appId = config.appId;
    this.appKey = config.appKey;
    this.country = config.country;
  }

  isConfigured(): boolean {
    return Boolean(this.appId && this.appKey);
  }

  private toJob(result: AdzunaResult): Job {
    const job: Job = {
      id: `adzuna:${result.id}`,
      source: "adzuna",
      title: result.title ?? "(untitled)",
      description: result.description ?? "",
      url: result.redirect_url ?? "",
    };

    const company = result.company?.display_name;
    if (company) job.company = company;

    const location = result.location?.display_name;
    if (location) job.location = location;

    const country = result.location?.area?.[0];
    if (country) job.country = country;

    const employment = mapEmployment(result);
    if (employment) job.employmentType = employment;

    const arrangement = inferArrangement(`${result.title ?? ""} ${result.description ?? ""}`);
    if (arrangement) job.arrangement = arrangement;

    if (typeof result.salary_min === "number") job.salaryMin = result.salary_min;
    if (typeof result.salary_max === "number") job.salaryMax = result.salary_max;
    if (result.salary_min !== undefined || result.salary_max !== undefined) {
      const currency = CURRENCY_BY_COUNTRY[this.country];
      if (currency) job.salaryCurrency = currency;
      job.salaryPredicted = result.salary_is_predicted === "1";
    }

    if (result.category?.label) job.category = result.category.label;
    if (result.created) job.postedAt = result.created;

    return job;
  }

  async search(query: JobQuery): Promise<Job[]> {
    if (!this.isConfigured()) return [];

    const url = new URL(`https://api.adzuna.com/v1/api/jobs/${this.country}/search/1`);
    url.searchParams.set("app_id", this.appId!);
    url.searchParams.set("app_key", this.appKey!);
    url.searchParams.set("results_per_page", String(Math.min(query.limit ?? 25, 50)));
    // Adzuna has no remote flag; fold the intent into the keyword search.
    url.searchParams.set("what", query.remoteOnly ? `${query.what} remote` : query.what);
    if (query.where) url.searchParams.set("where", query.where);
    if (query.salaryMin) url.searchParams.set("salary_min", String(Math.round(query.salaryMin)));

    try {
      const data = await fetchJson<AdzunaResponse>(url);
      return (data.results ?? []).map((r) => this.toJob(r));
    } catch (err) {
      logger.warn(`Adzuna search failed: ${err instanceof Error ? err.message : String(err)}`);
      return [];
    }
  }
}
