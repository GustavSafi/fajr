import type { Job } from "@/lib/types";
import type { Locale } from "@/lib/i18n";
import { medianFor } from "@/lib/scb/salaries";
import type { MatchProfile } from "./profile";
import { reasonText, gapText } from "./strings";

/**
 * Regelbaserad matchning. Porterad från CLI-projektets `src/ranking/score.ts`
 * och anpassad till svenska annonser.
 *
 * Grundprincipen är densamma och är det som gör systemet trovärdigt: **en
 * dimension räknas bara när datan finns.** Saknar annonsen uppgift om distans
 * så hoppas den dimensionen över helt — den straffas aldrig som en nolla. Ett
 * jobb utan löneuppgift är inte ett dåligt jobb.
 *
 * Två saker skiljer från CLI-versionen. Platsmatchningen jämför kommun i
 * stället för land, eftersom vi bara har svenska annonser och land då är
 * meningslöst. Och lönedimensionen använder SCB:s statistik för yrket, för
 * JobTech-annonser anger nästan aldrig lön — det var något CLI:t inte kunde.
 */

export type Dimension =
  | "title"
  | "skills"
  | "experience"
  | "location"
  | "remote"
  | "salary"
  | "employment";

const WEIGHTS: Record<Dimension, number> = {
  title: 3,
  skills: 3,
  experience: 2,
  location: 2,
  remote: 1,
  salary: 1.5,
  employment: 1,
};

const SENIOR = /\b(senior|erfaren|ledande|chef|lead|specialist|samordnare|ansvarig)\b/i;
const JUNIOR = /\b(junior|nyexaminerad|praktik|trainee|assistent|lärling|introduktion)\b/i;

interface Dim {
  score: number;
  applicable: boolean;
}
const NA: Dim = { score: 0, applicable: false };

/** Helordsmatchning så att korta ord inte träffar inuti andra ord. */
function wordInText(haystack: string, needle: string): boolean {
  const s = needle.trim().toLowerCase();
  if (!s) return false;
  const esc = s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-zåäö0-9+#.])${esc}($|[^a-zåäö0-9+#.])`, "i").test(haystack);
}

function titleDim(p: MatchProfile, job: Job): Dim {
  const roles = p.roles ?? [];
  if (roles.length === 0 || !job.headline) return NA;

  const title = job.headline.toLowerCase();
  const occupation = (job.occupation ?? "").toLowerCase();

  // Hela frasen i titeln eller i yrkesbenämningen är en stark signal.
  if (roles.some((r) => title.includes(r.toLowerCase()) || occupation.includes(r.toLowerCase()))) {
    return { score: 1, applicable: true };
  }

  // Annars: hur stor andel av rollernas ord som finns i titeln.
  const roleWords = new Set(
    roles.flatMap((r) => r.toLowerCase().split(/\s+/)).filter((w) => w.length > 2),
  );
  if (roleWords.size === 0) return NA;

  let hits = 0;
  for (const w of roleWords) if (title.includes(w) || occupation.includes(w)) hits++;
  return { score: hits / roleWords.size, applicable: true };
}

/** De av användarens kunskaper som annonsen faktiskt nämner. */
export function matchedSkills(p: MatchProfile, job: Job): string[] {
  const skills = p.skills ?? [];
  if (skills.length === 0) return [];
  const haystack = [job.headline, job.description, ...job.requiredSkills, ...job.preferredSkills]
    .join(" ")
    .toLowerCase();
  return skills.filter((s) => wordInText(haystack, s));
}

function skillsDim(p: MatchProfile, matched: string[]): Dim {
  if (!p.skills?.length) return NA;
  // Tre träffar räknas som full pott — fler ska inte krävas för toppbetyg.
  return { score: Math.min(1, matched.length / 3), applicable: true };
}

function experienceDim(p: MatchProfile, job: Job): Dim {
  const years = p.years;
  if (years === undefined) return NA;

  // Annonsens egen flagga är bättre än att gissa ur texten.
  if (job.experienceRequired === false) {
    return { score: 1, applicable: true };
  }

  const text = `${job.headline} ${job.description.slice(0, 600)}`;
  const senior = SENIOR.test(text);
  const junior = JUNIOR.test(text);
  if (!senior && !junior) return NA;

  if (senior) return { score: years >= 5 ? 1 : years >= 2 ? 0.6 : 0.3, applicable: true };
  return { score: years <= 3 ? 1 : 0.7, applicable: true };
}

function locationDim(p: MatchProfile, job: Job): Dim {
  const wanted = p.municipalities ?? [];
  if (wanted.length === 0 || !job.municipalityId) return NA;
  if (wanted.includes(job.municipalityId)) return { score: 1, applicable: true };
  // Distansjobb spelar det mindre roll var de ligger.
  if (job.arrangement === "remote") return { score: 0.8, applicable: true };
  return { score: 0.15, applicable: true };
}

function remoteDim(p: MatchProfile, job: Job): Dim {
  if (p.remote !== true || !job.arrangement) return NA;
  if (job.arrangement === "remote") return { score: 1, applicable: true };
  if (job.arrangement === "hybrid") return { score: 0.7, applicable: true };
  return { score: 0.2, applicable: true };
}

/**
 * Lönedimensionen lutar sig mot SCB i stället för annonsen, eftersom svenska
 * annonser nästan aldrig anger lön. Vi jämför alltså användarens önskemål mot
 * vad yrket faktiskt betalar — inte mot vad just den här arbetsgivaren betalar,
 * vilket vi inte vet.
 */
function salaryDim(p: MatchProfile, job: Job): Dim {
  const wanted = p.salaryMin;
  if (wanted === undefined) return NA;
  const median = medianFor(job.ssyk, job.employer);
  if (median === null) return NA;
  if (median >= wanted) return { score: 1, applicable: true };
  return { score: Math.max(0, median / wanted), applicable: true };
}

function employmentDim(p: MatchProfile, job: Job): Dim {
  const wanted = p.employment ?? [];
  if (wanted.length === 0 || !job.employmentType) return NA;
  return { score: wanted.includes(job.employmentType) ? 1 : 0.3, applicable: true };
}

export interface MatchResult {
  /** 0–100. */
  score: number;
  reasons: string[];
  gaps: string[];
  /** Hur många dimensioner som faktiskt gick att bedöma. */
  basis: number;
}

export function scoreJob(profile: MatchProfile, job: Job, locale: Locale): MatchResult {
  const matched = matchedSkills(profile, job);

  const dims: Record<Dimension, Dim> = {
    title: titleDim(profile, job),
    skills: skillsDim(profile, matched),
    experience: experienceDim(profile, job),
    location: locationDim(profile, job),
    remote: remoteDim(profile, job),
    salary: salaryDim(profile, job),
    employment: employmentDim(profile, job),
  };

  let weightSum = 0;
  let weighted = 0;
  let basis = 0;
  for (const key of Object.keys(dims) as Dimension[]) {
    const dim = dims[key];
    if (!dim.applicable) continue;
    basis++;
    weightSum += WEIGHTS[key];
    weighted += WEIGHTS[key] * dim.score;
  }

  const score = weightSum > 0 ? Math.round((weighted / weightSum) * 100) : 0;

  const reasons: string[] = [];
  if (dims.title.applicable && dims.title.score >= 0.7) reasons.push(reasonText.title(locale));
  if (matched.length > 0) reasons.push(reasonText.skills(matched.slice(0, 4), locale));
  if (dims.experience.applicable && dims.experience.score >= 0.9) {
    reasons.push(
      job.experienceRequired === false
        ? reasonText.noExperience(locale)
        : reasonText.experience(profile.years ?? 0, locale),
    );
  }
  if (dims.location.applicable && dims.location.score >= 0.9 && job.municipality) {
    reasons.push(reasonText.location(job.municipality, locale));
  }
  if (dims.remote.applicable && dims.remote.score >= 0.9) reasons.push(reasonText.remote(locale));
  if (dims.salary.applicable && dims.salary.score >= 1) reasons.push(reasonText.salary(locale));
  if (dims.employment.applicable && dims.employment.score >= 0.9 && job.employmentType) {
    reasons.push(reasonText.employment(job.employmentType, locale));
  }

  const gaps: string[] = [];
  if (job.requiredSkills.length > 0 && profile.skills?.length) {
    const have = matched.map((m) => m.toLowerCase());
    const missing = job.requiredSkills.filter(
      (r) => !have.some((h) => r.toLowerCase().includes(h)),
    );
    if (missing.length > 0) gaps.push(gapText.requirements(missing.slice(0, 3), locale));
  }
  if (dims.location.applicable && dims.location.score < 0.5 && job.municipality) {
    gaps.push(gapText.location(job.municipality, locale));
  }
  if (dims.salary.applicable && dims.salary.score < 0.9) gaps.push(gapText.salary(locale));
  if (dims.remote.applicable && dims.remote.score < 0.5) gaps.push(gapText.remote(locale));
  if (dims.experience.applicable && dims.experience.score < 0.5) {
    gaps.push(gapText.experience(locale));
  }

  return { score, reasons, gaps, basis };
}

/**
 * Hur mycket vi vågar säga om poängen.
 *
 * Bygger den på en eller två dimensioner är den för tunn för att visas som en
 * siffra — då hade vi låtsats veta mer än vi gör.
 */
export function isScoreTrustworthy(result: MatchResult): boolean {
  return result.basis >= 3;
}
