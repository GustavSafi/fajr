import type { EmploymentType, Job, WorkArrangement } from "@/lib/types";
import type { JobTechHit, JobTechRequirements } from "./raw";

/**
 * Normaliserar en råträff till vår `Job`. Regeln från CLI-projektet gäller:
 * saknad data blir `undefined`, aldrig ett gissat värde.
 */

function mapEmployment(hit: JobTechHit): EmploymentType | undefined {
  const working = hit.working_hours_type?.label?.toLowerCase() ?? "";
  const employment = hit.employment_type?.label?.toLowerCase() ?? "";

  if (employment.includes("behovsanställning") || employment.includes("sommarjobb")) {
    return "contract";
  }
  if (employment.includes("praktik")) return "internship";
  if (working.includes("heltid")) return "full-time";
  if (working.includes("deltid")) return "part-time";
  return undefined;
}

/**
 * JobTech har en explicit distansflagga men ingen hybridflagga. Vi litar på
 * flaggan när den är satt och letar bara efter "hybrid" i texten som komplement
 * — aldrig efter "distans", eftersom annonser ofta skriver "ingen distans".
 */
function mapArrangement(hit: JobTechHit): WorkArrangement | undefined {
  if (hit.remote_work === true) return "remote";
  const text = `${hit.headline ?? ""} ${hit.description?.text ?? ""}`.toLowerCase();
  if (/\bhybrid(arbete|jobb|lösning)?\b/.test(text)) return "hybrid";
  return undefined;
}

function labels(req: JobTechRequirements | undefined, key: keyof JobTechRequirements): string[] {
  const list = req?.[key] ?? [];
  const out = list.map((item) => item.label).filter((l): l is string => Boolean(l));
  return [...new Set(out)];
}

/**
 * Platsbankens publika annonssida. Används som reserv när annonsen saknar
 * direktlänk, så att användaren alltid kan söka jobbet någonstans.
 */
function platsbankenUrl(id: string): string {
  return `https://arbetsformedlingen.se/platsbanken/annonser/${id}`;
}

export function toJob(hit: JobTechHit): Job {
  const address = hit.workplace_address ?? {};

  /*
   * Arkivet ger annonsen ett eget hash-id och lägger det publika id:t i
   * `original_id`. Vi vill alltid ha det publika — det är det som står i våra
   * adresser, och det ska peka på samma annons oavsett vilken källa den kom ur.
   */
  const externalId = hit.original_id ?? hit.id;

  const job: Job = {
    id: `jobtech:${externalId}`,
    externalId,
    source: "jobtech",
    headline: hit.headline?.trim() || "Namnlös annons",
    description: hit.description?.text?.trim() ?? "",
    requiredSkills: labels(hit.must_have, "skills"),
    preferredSkills: labels(hit.nice_to_have, "skills"),
    requiredExperience: labels(hit.must_have, "work_experiences"),
  };

  const formatted = hit.description?.text_formatted?.trim();
  if (formatted) job.descriptionHtml = formatted;

  if (hit.employer?.name) job.employer = hit.employer.name.trim();
  if (hit.employer?.url) job.employerUrl = hit.employer.url;

  if (address.municipality) job.municipality = address.municipality;
  if (address.municipality_concept_id) job.municipalityId = address.municipality_concept_id;
  if (address.region) job.region = address.region;
  if (address.country) job.country = address.country;

  const arrangement = mapArrangement(hit);
  if (arrangement) job.arrangement = arrangement;

  const employment = mapEmployment(hit);
  if (employment) job.employmentType = employment;
  if (hit.working_hours_type?.label) job.employmentLabel = hit.working_hours_type.label;

  if (typeof hit.scope_of_work?.min === "number") job.workingHoursMin = hit.scope_of_work.min;
  if (typeof hit.scope_of_work?.max === "number") job.workingHoursMax = hit.scope_of_work.max;

  if (hit.duration?.label) job.duration = hit.duration.label;
  if (hit.salary_description) job.salaryDescription = hit.salary_description.trim();
  if (hit.salary_type?.label) job.salaryType = hit.salary_type.label;

  if (hit.occupation_field?.label) job.occupationField = hit.occupation_field.label;
  if (hit.occupation_field?.concept_id) job.occupationFieldId = hit.occupation_field.concept_id;
  if (hit.occupation?.label) job.occupation = hit.occupation.label;
  if (hit.occupation?.concept_id) job.occupationId = hit.occupation.concept_id;

  // Yrkesgruppens gamla taxonomi-id är SSYK-koden på fyrsiffrig nivå, vilket är
  // exakt den nyckel SCB:s lönestatistik använder. Verifieras av taxonomiskriptet.
  const ssyk = hit.occupation_group?.legacy_ams_taxonomy_id;
  if (ssyk && /^\d{3,4}$/.test(ssyk)) job.ssyk = ssyk;

  if (typeof hit.driving_license_required === "boolean") {
    job.drivingLicenceRequired = hit.driving_license_required;
  }
  if (typeof hit.experience_required === "boolean") {
    job.experienceRequired = hit.experience_required;
  }
  if (typeof hit.number_of_vacancies === "number") job.vacancies = hit.number_of_vacancies;

  if (hit.application_deadline) job.applicationDeadline = hit.application_deadline;
  if (hit.publication_date) job.publishedAt = hit.publication_date;

  if (hit.removed === true) {
    job.archived = true;
    if (hit.removed_date) job.removedAt = hit.removed_date;
  }

  /*
   * En arkiverad annons får ingen ansökningslänk. Arbetsgivarens sida är nästan
   * alltid nere och Platsbankens annons är borttagen — att skicka någon dit vore
   * att lova något vi vet inte finns.
   */
  if (!job.archived) {
    job.applicationUrl =
      hit.application_details?.url || hit.webpage_url || platsbankenUrl(externalId);
    if (hit.application_details?.email) job.applicationEmail = hit.application_details.email;
  }

  return job;
}
