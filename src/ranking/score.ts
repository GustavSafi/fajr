import type {
  Job,
  JobSource,
  RankedJob,
  ScoreDimension,
  SubScore,
  UserProfile,
} from "../models/index.ts";

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

const SENIOR = /\b(senior|lead|principal|staff|head|chef|manager)\b/;
const JUNIOR = /\b(junior|graduate|entry|intern|trainee|assistant)\b/;

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
  return hardSkills(p).filter((s) => s && haystack.includes(s.toLowerCase()));
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
  if (wanted.some((c) => c.toLowerCase() === job.country!.toLowerCase())) {
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

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Score one job for the given profile and source. */
export function scoreJob(profile: UserProfile, job: Job, source: JobSource): RankedJob {
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

  const reasons = buildReasons(profile, job, dims, matched);
  const gaps = buildGaps(profile, job, dims, matched);

  return { job, score, subScores, reasons, gaps };
}

function buildReasons(
  p: UserProfile,
  job: Job,
  dims: Record<ScoreDimension, Dim>,
  matched: string[],
): string[] {
  const reasons: string[] = [];
  if (dims.title.applicable && dims.title.score >= 0.7) reasons.push("Title matches your target role");
  if (dims.skills.applicable && matched.length > 0) {
    reasons.push(`Matches your skills: ${matched.slice(0, 4).join(", ")}`);
  }
  if (dims.experience.applicable && dims.experience.score >= 0.7 && p.experience.totalYears !== undefined) {
    reasons.push(`Seniority fits your ${p.experience.totalYears} years of experience`);
  }
  if (dims.location.applicable && dims.location.score >= 0.9 && job.country) {
    reasons.push(`Located in ${job.country}, where you want to work`);
  }
  if (dims.remote.applicable && dims.remote.score >= 0.9 && job.arrangement) {
    reasons.push(`${cap(job.arrangement)} — matches your preference`);
  }
  if (dims.salary.applicable && dims.salary.score >= 0.85) {
    reasons.push(job.salaryPredicted ? "Estimated salary meets your target" : "Meets your minimum salary");
  }
  if (dims.employment.applicable && dims.employment.score >= 0.9 && job.employmentType) {
    reasons.push(`${job.employmentType} role, as you wanted`);
  }
  return reasons;
}

function buildGaps(
  p: UserProfile,
  job: Job,
  dims: Record<ScoreDimension, Dim>,
  matched: string[],
): string[] {
  const gaps: string[] = [];

  // Listed requirements the candidate's skills don't obviously cover.
  const required = job.requiredSkills ?? [];
  if (required.length > 0) {
    const have = new Set(matched.map((m) => m.toLowerCase()));
    const missing = required.filter(
      (r) => ![...have].some((h) => r.toLowerCase().includes(h)),
    );
    if (missing.length > 0) gaps.push(`Listed requirements to check: ${missing.slice(0, 3).join(", ")}`);
  }

  if (dims.salary.applicable && dims.salary.score < 0.85) gaps.push("Salary may be below your target");
  if (dims.location.applicable && dims.location.score < 0.5) gaps.push("Not in your preferred location");
  if (dims.remote.applicable && dims.remote.score < 0.5 && job.arrangement) {
    gaps.push(`${cap(job.arrangement)} — not your preferred arrangement`);
  }
  if (p.preferences.salaryMin !== undefined && job.salaryMin === undefined && job.salaryMax === undefined) {
    gaps.push("No salary listed");
  }
  return gaps;
}
