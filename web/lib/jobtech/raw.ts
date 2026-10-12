/**
 * Råformerna från JobTech JobSearch API. Bara de fält vi faktiskt läser är
 * typade; API:et returnerar betydligt mer.
 *
 * Källa: https://jobsearch.api.jobtechdev.se — öppen data från
 * Arbetsförmedlingen, ingen nyckel krävs.
 */

export interface JobTechConcept {
  concept_id?: string;
  label?: string;
  legacy_ams_taxonomy_id?: string;
}

export interface JobTechWeightedConcept extends JobTechConcept {
  weight?: number;
}

export interface JobTechRequirements {
  skills?: JobTechWeightedConcept[];
  languages?: JobTechWeightedConcept[];
  work_experiences?: JobTechWeightedConcept[];
  education?: JobTechWeightedConcept[];
  education_level?: JobTechWeightedConcept[];
}

export interface JobTechHit {
  id: string;
  external_id?: string;
  /** Bara i arkivet: annonsens id i det publika API:et. */
  original_id?: string;
  /** Bara i arkivet. */
  removed?: boolean;
  removed_date?: string;
  headline?: string;
  description?: {
    text?: string;
    text_formatted?: string;
    company_information?: string;
    needs?: string;
    requirements?: string;
    conditions?: string;
  };
  employer?: {
    name?: string;
    workplace?: string;
    url?: string;
    organization_number?: string;
  };
  workplace_address?: {
    municipality?: string;
    municipality_concept_id?: string;
    region?: string;
    region_concept_id?: string;
    country?: string;
    street_address?: string;
    postcode?: string;
    city?: string;
    coordinates?: (number | null)[];
  };
  remote_work?: boolean;
  working_hours_type?: JobTechConcept;
  employment_type?: JobTechConcept;
  duration?: JobTechConcept;
  salary_type?: JobTechConcept;
  salary_description?: string;
  scope_of_work?: { min?: number; max?: number };
  occupation?: JobTechConcept;
  occupation_group?: JobTechConcept;
  occupation_field?: JobTechConcept;
  must_have?: JobTechRequirements;
  nice_to_have?: JobTechRequirements;
  driving_license_required?: boolean;
  experience_required?: boolean;
  number_of_vacancies?: number;
  application_deadline?: string;
  publication_date?: string;
  webpage_url?: string;
  application_details?: {
    url?: string;
    email?: string;
    reference?: string;
  };
}

export interface JobTechStatItem {
  term?: string;
  concept_id?: string;
  code?: string;
  count?: number;
}

export interface JobTechStat {
  type?: string;
  values?: JobTechStatItem[];
}

export interface JobTechResponse {
  total?: { value?: number };
  positions?: number;
  hits?: JobTechHit[];
  stats?: JobTechStat[];
}
