/**
 * Domänmodellen. Porterad från CLI-projektets `src/models/` och utökad med
 * fälten webben behöver (ansökningsdatum, arbetstidsandel, körkortskrav).
 *
 * Principen från CLI:t behålls: ett fält som källan saknar är `undefined` —
 * aldrig ett påhittat nollvärde. Rankningen hoppar över saknad data i stället
 * för att straffa den.
 */

export type WorkArrangement = "remote" | "hybrid" | "on-site";
export type EmploymentType = "full-time" | "part-time" | "contract" | "internship";

export interface Job {
  /** Stabilt id för avdubblering: källa + källans eget id. */
  id: string;
  /** Källans eget id, används mot API:et. */
  externalId: string;
  source: "jobtech";
  headline: string;
  employer?: string;
  employerUrl?: string;
  /** Kommun eller region, det som finns. */
  municipality?: string;
  municipalityId?: string;
  region?: string;
  country?: string;
  arrangement?: WorkArrangement;
  employmentType?: EmploymentType;
  /** Rå etikett från källan, t.ex. "Heltid". Visas när vi inte kan mappa den. */
  employmentLabel?: string;
  /** Arbetstidsandel i procent, 100 = heltid. */
  workingHoursMin?: number;
  workingHoursMax?: number;
  duration?: string;
  salaryDescription?: string;
  salaryType?: string;
  /** Yrkesområde, t.ex. "Hälso- och sjukvård". */
  occupationField?: string;
  occupationFieldId?: string;
  /** Yrkesbenämning, t.ex. "Undersköterska, hemtjänst". */
  occupation?: string;
  occupationId?: string;
  /** SSYK-kod — nyckeln till SCB:s lönestatistik. */
  ssyk?: string;
  requiredSkills: string[];
  preferredSkills: string[];
  requiredExperience: string[];
  drivingLicenceRequired?: boolean;
  experienceRequired?: boolean;
  description: string;
  descriptionHtml?: string;
  /** Länk att söka jobbet — alltid till arbetsgivaren eller Platsbanken. */
  applicationUrl?: string;
  applicationEmail?: string;
  applicationDeadline?: string;
  vacancies?: number;
  publishedAt?: string;
  /** Sant när annonsen hämtats ur arkivet, dvs. inte längre går att söka. */
  archived?: boolean;
  /** När annonsen togs bort ur Platsbanken. */
  removedAt?: string;
}

/**
 * "match" sorteras av oss, inte av API:et — det kräver en profil och sker
 * lokalt bland de träffar vi hämtat.
 */
export type SortOrder = "relevance" | "newest" | "deadline" | "match";

/** Sökningens tillstånd — speglar exakt vad som ligger i URL:en. */
export interface SearchParams {
  q?: string;
  /** Taxonomins concept_id för kommun. */
  municipality?: string[];
  region?: string[];
  occupationField?: string[];
  /** Taxonomins concept_id för yrkesbenämning — snävare än yrkesområde. */
  occupation?: string[];
  remote?: boolean;
  partTime?: boolean;
  /** Jobb som inte kräver tidigare erfarenhet. */
  noExperience?: boolean;
  /** Publicerade senaste N dagarna. */
  publishedWithinDays?: number;
  sort?: SortOrder;
  page?: number;
}

/** En facett från API:ets egen statistik — används för antalen i filtren. */
export interface Facet {
  id: string;
  label: string;
  count: number;
}

export interface SearchResult {
  jobs: Job[];
  total: number;
  /** Hur många träffar API:et faktiskt låter oss bläddra igenom. */
  reachable: number;
  page: number;
  pageSize: number;
  facets: {
    municipality: Facet[];
    occupationField: Facet[];
  };
  /** Sant när sökningen inte kunde nå källan — sidan visar då ett vänligt fel. */
  failed?: boolean;
}
