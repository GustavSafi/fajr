/**
 * The structured candidate profile produced by the interview.
 *
 * Every field is optional and starts empty; the interview engine fills it in
 * incrementally as the conversation progresses. Completeness of these fields is
 * what drives the interview to ask its next question (or decide it's done).
 */

export type WorkArrangement = "remote" | "hybrid" | "on-site";
export type EmploymentType = "full-time" | "part-time" | "contract" | "internship";

export interface CareerGoals {
  desiredRoles?: string[];
  dreamJob?: string;
  industries?: string[];
  preferredResponsibilities?: string[];
  ambitions?: string;
}

export interface PastRole {
  title?: string;
  company?: string;
  durationYears?: number;
  responsibilities?: string[];
  liked?: string[];
  disliked?: string[];
}

export interface Experience {
  totalYears?: number;
  roles?: PastRole[];
  hasLeadership?: boolean;
  hasFreelance?: boolean;
  hasInternship?: boolean;
}

export interface Skills {
  technical?: string[];
  soft?: string[];
  programmingLanguages?: string[];
  frameworks?: string[];
  tools?: string[];
  certifications?: string[];
  learning?: string[];
}

export interface Education {
  degrees?: string[];
  courses?: string[];
  bootcamps?: string[];
  certificates?: string[];
}

export interface Preferences {
  arrangements?: WorkArrangement[];
  employmentTypes?: EmploymentType[];
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  companySize?: string;
  startupVsEnterprise?: "startup" | "enterprise" | "no-preference";
  culture?: string[];
  benefits?: string[];
  travelWillingness?: string;
}

export interface Location {
  countries?: string[];
  cities?: string[];
  willingToRelocate?: boolean;
}

export interface LanguageAbility {
  language: string;
  spoken?: string;
  written?: string;
}

export interface PersonalPreferences {
  motivations?: string[];
  preferredEnvironment?: string;
  dislikes?: string[];
  longTermPlan?: string;
}

export interface UserProfile {
  careerGoals: CareerGoals;
  experience: Experience;
  skills: Skills;
  education: Education;
  preferences: Preferences;
  location: Location;
  languages: LanguageAbility[];
  personal: PersonalPreferences;
  /** Natural-language summary describing the candidate, generated at the end. */
  summary: string;
}

/** An empty profile — the starting point before any interview answers. */
export function emptyProfile(): UserProfile {
  return {
    careerGoals: {},
    experience: {},
    skills: {},
    education: {},
    preferences: {},
    location: {},
    languages: [],
    personal: {},
    summary: "",
  };
}
