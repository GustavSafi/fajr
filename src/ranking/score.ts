import type {
  Job,
  JobSource,
  RankedJob,
  ScoreDimension,
  SubScore,
  UserProfile,
} from "../models/index.ts";
import type { Lang } from "../i18n.ts";
import { RS } from "./strings.ts";

/**
 * Per-source weights. The two sources expose different data, so they lean on
 * different signals: JobTech has structured skills but no salary; Adzuna has
 * numeric salary but no remote flag or structured skills. A weight of 0 means
 * the dimension never counts for that source.
 */
const WEIGHTS: Record<JobSource, Record<ScoreDimension, number>> = {
  jobtech: { title: 3, skills: 3, experience: 2, location: 1.5, remote: 1, salary: 0, employment: 1 },
  adzuna: { title: 3, skills: 2, experience: 2, location: 1, remote: 1, salary: 2.5, employment: 1 },
};

const SENIOR = /\b(senior|lead|principal|staff|head|chef|manager|erfaren|ledande)\b/;
const JUNIOR = /\b(junior|graduate|entry|intern|trainee|assistant|nyexaminerad|praktik)\b/;

/** Canonical country codes so "United Kingdom" matches Adzuna's "UK", etc. */
const COUNTRY_ALIASES: Record<string, string> = {
  uk: "uk", "united kingdom": "uk", "great britain": "uk", gb: "uk",
  us: "us", usa: "us", "united states": "us", "united states of america": "us",
  sweden: "se", sverige: "se", se: "se",
  germany: "de", deutschland: "de", de: "de",
  france: "fr", fr: "fr",
  netherlands: "nl", nl: "nl",
  australia: "au", au: "au",
  canada: "ca", ca: "ca",
};
function normCountry(c: string): string {
  const k = c.toLowerCase().trim();
  return COUNTRY_ALIASES[k] ?? k;
}

/** Whole-word skill match so short skills ("Go", "R") don't hit substrings. */
function skillInText(haystack: string, skill: string): boolean {
  const s = skill.trim().toLowerCase();
  if (!s) return false;
  const esc = s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9+#.])${esc}($|[^a-z0-9+#.])`, "i").test(haystack);
}

interface Dim {
  score: number;
  applicable: boolean;
}
const NA: Dim = { score: 0, applicable: false };

function hardSkills(p: UserProfile): string[] {
  return [
    ...(p.skills.programmingLanguages ?? []),
    ...(p.skills.frameworks ?? []),
    ...(p.skills.technical ?? []),
    ...(p.skills.tools ?? []),
  ];
}

function titleDim(p: UserProfile, job: Job): Dim {
  const roles = p.careerGoals.desiredRoles ?? [];
  if (roles.length === 0 || !job.title) return NA;
  const title = job.title.toLowerCase();
  // Full-phrase match is a strong signal.
  if (roles.some((r) => title.includes(r.toLowerCase()))) return { score: 1, applicable: true };
  // Otherwise, fraction of role words present in the title.
  const roleWords = new Set(roles.flatMap((r) => r.toLowerCase().split(/\s+/)).filter(Boolean));
  const titleWords = new Set(title.split(/\s+/));
  let hits = 0;
  for (const w of roleWords) if (titleWords.has(w)) hits++;
  return { score: roleWords.size ? hits / roleWords.size : 0, applicable: true };
}

/** Skills the job text mentions from the candidate's skill set. */
function matchedSkills(p: UserProfile, job: Job): string[] {
  const haystack = [
    job.title,
    job.description,
    ...(job.requiredSkills ?? []),
    ...(job.preferredSkills ?? []),
  ]
    .join(" ")
    .toLowerCase();
  return hardSkills(p).filter((s) => skillInText(haystack, s));
}

function skillsDim(p: UserProfile, matched: string[]): Dim {
  if (hardSkills(p).length === 0) return NA;
  // Matching ~3 of the candidate's skills counts as a full match.
  return { score: Math.min(1, matched.length / 3), applicable: true };
}

function experienceDim(p: UserProfile, job: Job): Dim {
  const years = p.experience.totalYears;
  if (years === undefined) return NA;
  const text = `${job.title} ${job.description}`.toLowerCase();
  const senior = SENIOR.test(text);
  const junior = JUNIOR.test(text);
  if (!senior && !junior) return NA; // no seniority signal to judge against
  if (senior) return { score: years >= 5 ? 1 : 0.5, applicable: true };
  return { score: years <= 3 ? 1 : 0.6, applicable: true }; // junior role
}

function locationDim(p: UserProfile, job: Job): Dim {
  const wanted = p.location.countries ?? [];
  if (!job.country || wanted.length === 0) return NA;
  const jobCountry = normCountry(job.country);
  if (wanted.some((c) => normCountry(c) === jobCountry)) {
    return { score: 1, applicable: true };
  }
  return { score: p.location.willingToRelocate ? 0.5 : 0.2, applicable: true };
}

function remoteDim(p: UserProfile, job: Job): Dim {
  const wanted = p.preferences.arrangements ?? [];
  if (!job.arrangement || wanted.length === 0) return NA;
  return { score: wanted.includes(job.arrangement) ? 1 : 0.3, applicable: true };
}

function salaryDim(p: UserProfile, job: Job): Dim {
  const min = p.preferences.salaryMin;
  if (min === undefined || (job.salaryMin === undefined && job.salaryMax === undefined)) return NA;
  const jobTop = job.salaryMax ?? job.salaryMin ?? 0;
  let score = jobTop >= min ? 1 : Math.max(0, jobTop / min);
  if (job.salaryPredicted) score *= 0.85; // estimated salary → less confidence
  return { score, applicable: true };
}

function employmentDim(p: UserProfile, job: Job): Dim {
  const wanted = p.preferences.employmentTypes ?? [];
  if (!job.employmentType || wanted.length === 0) return NA;
  return { score: wanted.includes(job.employmentType) ? 1 : 0.3, applicable: true };
}

/** Score one job for the given profile and source. */
export function scoreJob(
  profile: UserProfile,
  job: Job,
  source: JobSource,
  lang: Lang = "en",
): RankedJob {
  const weights = WEIGHTS[source];
  const matched = matchedSkills(profile, job);

  const dims: Record<ScoreDimension, Dim> = {
    title: titleDim(profile, job),
    skills: skillsDim(profile, matched),
    experience: experienceDim(profile, job),
    location: locationDim(profile, job),
    remote: remoteDim(profile, job),
    salary: salaryDim(profile, job),
    employment: employmentDim(profile, job),
  };

  const subScores: SubScore[] = (Object.keys(dims) as ScoreDimension[]).map((d) => ({
    dimension: d,
    score: dims[d].score,
    applicable: dims[d].applicable,
    weight: weights[d],
  }));

  // Weighted average over applicable dimensions with non-zero weight.
  let weightSum = 0;
  let weightedScore = 0;
  for (const s of subScores) {
    if (s.applicable && s.weight > 0) {
      weightSum += s.weight;
      weightedScore += s.weight * s.score;
    }
  }
  const score = weightSum > 0 ? Math.round((weightedScore / weightSum) * 100) : 0;

  const reasons = buildReasons(profile, job, dims, matched, lang);
  const gaps = buildGaps(profile, job, dims, matched, lang);

  return { job, score, subScores, reasons, gaps };
}

function buildReasons(
  p: UserProfile,
  job: Job,
  dims: Record<ScoreDimension, Dim>,
  matched: string[],
  lang: Lang,
): string[] {
  const reasons: string[] = [];
  if (dims.title.applicable && dims.title.score >= 0.7) reasons.push(RS.titleMatch(lang));
  if (dims.skills.applicable && matched.length > 0) {
    reasons.push(RS.skills(matched.slice(0, 4).join(", "), lang));
  }
  if (dims.experience.applicable && dims.experience.score >= 0.7 && p.experience.totalYears !== undefined) {
    reasons.push(RS.seniority(p.experience.totalYears, lang));
  }
  if (dims.location.applicable && dims.location.score >= 0.9 && job.country) {
    reasons.push(RS.location(job.country, lang));
  }
  if (dims.remote.applicable && dims.remote.score >= 0.9 && job.arrangement) {
    reasons.push(RS.arrangement(job.arrangement, lang));
  }
  if (dims.salary.applicable && dims.salary.score >= 0.85) {
    reasons.push(RS.salary(Boolean(job.salaryPredicted), lang));
  }
  if (dims.employment.applicable && dims.employment.score >= 0.9 && job.employmentType) {
    reasons.push(RS.employment(job.employmentType, lang));
  }
  return reasons;
}

function buildGaps(
  p: UserProfile,
  job: Job,
  dims: Record<ScoreDimension, Dim>,
  matched: string[],
  lang: Lang,
): string[] {
  const gaps: string[] = [];

  // Listed requirements the candidate's skills don't obviously cover.
  const required = job.requiredSkills ?? [];
  if (required.length > 0) {
    const have = new Set(matched.map((m) => m.toLowerCase()));
    const missing = required.filter((r) => ![...have].some((h) => r.toLowerCase().includes(h)));
    if (missing.length > 0) gaps.push(RS.gapRequirements(missing.slice(0, 3).join(", "), lang));
  }

  if (dims.salary.applicable && dims.salary.score < 0.85) gaps.push(RS.gapSalaryLow(lang));
  if (dims.location.applicable && dims.location.score < 0.5) gaps.push(RS.gapLocation(lang));
  if (dims.remote.applicable && dims.remote.score < 0.5 && job.arrangement) {
    gaps.push(RS.gapArrangement(job.arrangement, lang));
  }
  if (p.preferences.salaryMin !== undefined && job.salaryMin === undefined && job.salaryMax === undefined) {
    gaps.push(RS.gapNoSalary(lang));
  }
  return gaps;
}
