/**
 * Temporary QA harness: exercises the real query → search → rank pipeline for
 * many professions on both sources (JobTech in Swedish, Adzuna in English) and
 * prints a compact report. Run: npm run proftest
 */

import { loadConfig } from "./config/config.ts";
import { emptyProfile } from "./models/index.ts";
import type { JobSource, UserProfile } from "./models/index.ts";
import { langForSource } from "./i18n.ts";
import { buildJobQuery } from "./profile/query.ts";
import { buildProviderForSource } from "./apis/index.ts";
import { rankJobs } from "./ranking/index.ts";

interface Scenario {
  name: string;
  source: JobSource;
  market?: string;
  build: (p: UserProfile) => void;
}

const SCENARIOS: Scenario[] = [
  // ---- JobTech (Swedish role terms) ----
  { name: "Nurse", source: "jobtech", build: (p) => { p.careerGoals.desiredRoles = ["Sjuksköterska"]; p.skills.soft = ["Empati / Omtanke"]; p.experience.totalYears = 5; p.preferences.arrangements = ["on-site"]; p.location.countries = ["Sweden"]; } },
  { name: "Primary teacher", source: "jobtech", build: (p) => { p.careerGoals.desiredRoles = ["Grundskollärare"]; p.skills.technical = ["Matematik", "Naturvetenskap"]; p.experience.totalYears = 8; p.location.countries = ["Sweden"]; } },
  { name: "Counselor", source: "jobtech", build: (p) => { p.careerGoals.desiredRoles = ["Psykolog / Kurator"]; p.skills.soft = ["Empati / Omtanke"]; p.experience.totalYears = 4; p.location.countries = ["Sweden"]; } },
  { name: "UX designer", source: "jobtech", build: (p) => { p.careerGoals.desiredRoles = ["UX-designer"]; p.experience.totalYears = 3; p.preferences.arrangements = ["hybrid"]; p.location.countries = ["Sweden"]; } },
  { name: "Backend dev", source: "jobtech", build: (p) => { p.careerGoals.desiredRoles = ["Backend-utvecklare"]; p.skills.programmingLanguages = ["Go", "Python"]; p.experience.totalYears = 6; p.preferences.arrangements = ["remote"]; p.location.countries = ["Sweden"]; } },
  { name: "Economist", source: "jobtech", build: (p) => { p.careerGoals.desiredRoles = ["Ekonom / Analytiker"]; p.experience.totalYears = 5; p.location.countries = ["Sweden"]; } },
  { name: "Manager", source: "jobtech", build: (p) => { p.careerGoals.desiredRoles = ["Chef / Ledarskap"]; p.experience.totalYears = 10; p.experience.hasLeadership = true; p.location.countries = ["Sweden"]; } },

  // ---- Adzuna (English, UK market) ----
  { name: "Nurse", source: "adzuna", market: "gb", build: (p) => { p.careerGoals.desiredRoles = ["Nurse"]; p.experience.totalYears = 5; p.location.countries = ["United Kingdom"]; } },
  { name: "Teacher", source: "adzuna", market: "gb", build: (p) => { p.careerGoals.desiredRoles = ["Primary School Teacher"]; p.experience.totalYears = 8; p.location.countries = ["United Kingdom"]; } },
  { name: "Counselor", source: "adzuna", market: "gb", build: (p) => { p.careerGoals.desiredRoles = ["Counselor / Advisor"]; p.experience.totalYears = 4; p.location.countries = ["United Kingdom"]; } },
  { name: "Backend dev", source: "adzuna", market: "gb", build: (p) => { p.careerGoals.desiredRoles = ["Backend Developer"]; p.skills.programmingLanguages = ["Go", "Python"]; p.experience.totalYears = 6; p.preferences.salaryMin = 60000; p.location.countries = ["United Kingdom"]; } },
  { name: "Graphic designer", source: "adzuna", market: "gb", build: (p) => { p.careerGoals.desiredRoles = ["Graphic Designer"]; p.experience.totalYears = 3; p.location.countries = ["United Kingdom"]; } },
];

async function run(): Promise<void> {
  const config = loadConfig();

  for (const s of SCENARIOS) {
    const profile = emptyProfile();
    s.build(profile);
    const lang = langForSource(s.source);
    const query = buildJobQuery(profile, 15);
    const provider = buildProviderForSource(config, s.source, s.market);

    let jobs = await provider.search(query);
    let used = query.what;
    if (jobs.length === 0) {
      const broad = query.what.split(/[\s-]+/)[0] ?? "";
      if (broad && broad.toLowerCase() !== query.what.toLowerCase()) {
        used = `${query.what} → ${broad}`;
        jobs = await provider.search({ ...query, what: broad });
      }
    }
    const ranked = rankJobs(profile, jobs, s.source, lang);

    console.log(`\n[${s.source}] ${s.name}  (search: "${used}") — ${jobs.length} found`);
    for (const r of ranked.slice(0, 3)) {
      console.log(`   ${String(r.score).padStart(3)}  ${r.job.title} — ${r.job.company ?? "?"}  | ${r.reasons[0] ?? "(no reason)"}`);
    }
    if (ranked.length === 0) console.log("   (no results)");
  }
}

run().catch((e: unknown) => console.error(e));
