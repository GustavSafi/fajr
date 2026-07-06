import type { Question } from "./types.ts";
import type { EmploymentType, WorkArrangement } from "../models/index.ts";

/** Merge new values into a profile string array, de-duplicated, order-preserving. */
function addUnique(existing: string[] | undefined, values: string[]): string[] {
  return [...new Set([...(existing ?? []), ...values])];
}

/** Human-readable industry name for each top-level field code. */
const INDUSTRY_BY_FIELD: Record<string, string> = {
  software: "Software & Technology",
  teaching: "Education",
  design: "Design & Creative",
  healthcare: "Healthcare",
  business: "Business & Operations",
  other: "Other",
};

/** Adzuna marketplaces we let the user search, with display country + currency. */
export const ADZUNA_MARKETS: Array<{
  value: string;
  label: string;
  country: string;
  currency: string;
}> = [
  { value: "gb", label: "United Kingdom", country: "United Kingdom", currency: "GBP" },
  { value: "us", label: "United States", country: "United States", currency: "USD" },
  { value: "de", label: "Germany", country: "Germany", currency: "EUR" },
  { value: "fr", label: "France", country: "France", currency: "EUR" },
  { value: "nl", label: "Netherlands", country: "Netherlands", currency: "EUR" },
  { value: "au", label: "Australia", country: "Australia", currency: "AUD" },
  { value: "ca", label: "Canada", country: "Canada", currency: "CAD" },
];

/**
 * The interview as data. Questions are asked in order; `when` skips the ones
 * that don't apply (branching), and `apply` records the answer in the profile.
 * Fully deterministic — no AI, no external calls.
 */
export const QUESTION_BANK: Question[] = [
  {
    id: "source",
    kind: "single",
    prompt: "Which job source would you like to search?",
    why: "Each source covers different regions and data, so I'll tailor the questions",
    options: [
      { value: "jobtech", label: "JobTech — jobs in Sweden (Arbetsförmedlingen)" },
      { value: "adzuna", label: "Adzuna — international jobs (UK, US, Germany, ...)" },
    ],
    apply: () => {
      /* source drives branching via `when`; nothing to store on the profile */
    },
  },
  {
    id: "field",
    kind: "single",
    prompt: "What field are you hoping to work in?",
    why: "It lets me ask the right follow-up questions for your profession",
    options: [
      { value: "software", label: "Software & Technology" },
      { value: "teaching", label: "Teaching & Education" },
      { value: "design", label: "Design & Creative" },
      { value: "healthcare", label: "Healthcare" },
      { value: "business", label: "Business, Sales & Operations" },
      { value: "other", label: "Something else" },
    ],
    apply: (p, a) => {
      p.careerGoals.industries = addUnique(p.careerGoals.industries, [
        INDUSTRY_BY_FIELD[a as string] ?? "Other",
      ]);
    },
  },

  // ---- Role, branched by field ----
  {
    id: "roleSoftware",
    kind: "multi",
    prompt: "Which kind of software role fits you best?",
    when: (a) => a["field"] === "software",
    options: [
      { value: "Backend Engineer", label: "Backend Engineer" },
      { value: "Frontend Engineer", label: "Frontend Engineer" },
      { value: "Full-Stack Engineer", label: "Full-Stack Engineer" },
      { value: "Mobile Engineer", label: "Mobile Engineer" },
      { value: "Data Engineer / Scientist", label: "Data Engineer / Scientist" },
      { value: "DevOps / Platform Engineer", label: "DevOps / Platform Engineer" },
      { value: "QA Engineer", label: "QA / Test Engineer" },
    ],
    apply: (p, a) => {
      p.careerGoals.desiredRoles = addUnique(p.careerGoals.desiredRoles, a as string[]);
    },
  },
  {
    id: "roleTeaching",
    kind: "multi",
    prompt: "What kind of teaching role are you after?",
    when: (a) => a["field"] === "teaching",
    options: [
      { value: "Primary School Teacher", label: "Primary school" },
      { value: "Secondary School Teacher", label: "Secondary school" },
      { value: "University Lecturer", label: "University / higher ed" },
      { value: "Private Tutor", label: "Private tutor" },
      { value: "Teaching Assistant", label: "Teaching assistant" },
    ],
    apply: (p, a) => {
      p.careerGoals.desiredRoles = addUnique(p.careerGoals.desiredRoles, a as string[]);
    },
  },
  {
    id: "roleDesign",
    kind: "multi",
    prompt: "Which design role suits you?",
    when: (a) => a["field"] === "design",
    options: [
      { value: "UX Designer", label: "UX Designer" },
      { value: "UI Designer", label: "UI Designer" },
      { value: "Product Designer", label: "Product Designer" },
      { value: "Graphic Designer", label: "Graphic Designer" },
    ],
    apply: (p, a) => {
      p.careerGoals.desiredRoles = addUnique(p.careerGoals.desiredRoles, a as string[]);
    },
  },
  {
    id: "roleHealthcare",
    kind: "multi",
    prompt: "Which healthcare role are you looking for?",
    when: (a) => a["field"] === "healthcare",
    options: [
      { value: "Nurse", label: "Nurse" },
      { value: "Physician", label: "Physician / Doctor" },
      { value: "Therapist", label: "Therapist" },
      { value: "Medical Technician", label: "Medical technician" },
      { value: "Care Assistant", label: "Care assistant" },
    ],
    apply: (p, a) => {
      p.careerGoals.desiredRoles = addUnique(p.careerGoals.desiredRoles, a as string[]);
    },
  },
  {
    id: "roleOther",
    kind: "single",
    prompt: "Which best describes the work you want?",
    when: (a) => a["field"] === "business" || a["field"] === "other",
    options: [
      { value: "Management", label: "Management / Leadership" },
      { value: "Sales", label: "Sales" },
      { value: "Marketing", label: "Marketing" },
      { value: "Operations", label: "Operations" },
      { value: "Customer Support", label: "Customer support" },
      { value: "Administration", label: "Administration" },
    ],
    apply: (p, a) => {
      p.careerGoals.desiredRoles = addUnique(p.careerGoals.desiredRoles, [a as string]);
    },
  },

  // ---- Skills, branched ----
  {
    id: "langs",
    kind: "multi",
    prompt: "Which programming languages are you most confident in?",
    when: (a) => a["field"] === "software",
    optional: true,
    options: [
      { value: "JavaScript", label: "JavaScript / TypeScript" },
      { value: "Python", label: "Python" },
      { value: "Java", label: "Java" },
      { value: "Go", label: "Go" },
      { value: "C#", label: "C#" },
      { value: "Rust", label: "Rust" },
      { value: "SQL", label: "SQL" },
    ],
    apply: (p, a) => {
      p.skills.programmingLanguages = addUnique(p.skills.programmingLanguages, a as string[]);
    },
  },
  {
    id: "stack",
    kind: "multi",
    prompt: "Which tools or frameworks do you work with?",
    when: (a) => a["field"] === "software",
    optional: true,
    options: [
      { value: "React", label: "React" },
      { value: "Node.js", label: "Node.js" },
      { value: "Docker", label: "Docker / Kubernetes" },
      { value: "AWS", label: "AWS / Cloud" },
      { value: "PostgreSQL", label: "SQL databases" },
      { value: "TensorFlow", label: "ML / data tooling" },
    ],
    apply: (p, a) => {
      p.skills.frameworks = addUnique(p.skills.frameworks, a as string[]);
    },
  },
  {
    id: "subjects",
    kind: "multi",
    prompt: "Which subjects do you teach?",
    when: (a) => a["field"] === "teaching",
    optional: true,
    options: [
      { value: "Mathematics", label: "Mathematics" },
      { value: "Science", label: "Science" },
      { value: "Languages", label: "Languages" },
      { value: "Humanities", label: "Humanities / Social studies" },
      { value: "Arts", label: "Arts" },
      { value: "Computing", label: "Computing / IT" },
    ],
    apply: (p, a) => {
      p.skills.technical = addUnique(p.skills.technical, a as string[]);
    },
  },

  // ---- Experience ----
  {
    id: "years",
    kind: "number",
    prompt: "How many years of experience do you have in this area?",
    min: 0,
    max: 60,
    unit: "years",
    apply: (p, a) => {
      p.experience.totalYears = a as number;
    },
  },
  {
    id: "leadership",
    kind: "yesno",
    prompt: "Have you held a leadership or management role?",
    apply: (p, a) => {
      p.experience.hasLeadership = a as boolean;
    },
  },

  // ---- Soft skills ----
  {
    id: "soft",
    kind: "multi",
    prompt: "Which of these are your strongest soft skills?",
    optional: true,
    options: [
      { value: "Communication", label: "Communication" },
      { value: "Teamwork", label: "Teamwork" },
      { value: "Problem-solving", label: "Problem-solving" },
      { value: "Leadership", label: "Leadership" },
      { value: "Adaptability", label: "Adaptability" },
      { value: "Time management", label: "Time management" },
    ],
    apply: (p, a) => {
      p.skills.soft = addUnique(p.skills.soft, a as string[]);
    },
  },

  // ---- Work preferences ----
  {
    id: "arrangement",
    kind: "multi",
    prompt: "How do you want to work?",
    options: [
      { value: "remote", label: "Remote" },
      { value: "hybrid", label: "Hybrid" },
      { value: "on-site", label: "On-site" },
    ],
    apply: (p, a) => {
      p.preferences.arrangements = (a as string[]).filter((v) =>
        ["remote", "hybrid", "on-site"].includes(v),
      ) as WorkArrangement[];
    },
  },
  {
    id: "employment",
    kind: "multi",
    prompt: "What type of employment are you looking for?",
    options: [
      { value: "full-time", label: "Full-time" },
      { value: "part-time", label: "Part-time" },
      { value: "contract", label: "Contract" },
      { value: "internship", label: "Internship" },
    ],
    apply: (p, a) => {
      p.preferences.employmentTypes = (a as string[]).filter((v) =>
        ["full-time", "part-time", "contract", "internship"].includes(v),
      ) as EmploymentType[];
    },
  },
  {
    id: "companyType",
    kind: "single",
    prompt: "Do you prefer startups or established companies?",
    optional: true,
    options: [
      { value: "startup", label: "Startup" },
      { value: "enterprise", label: "Established / enterprise" },
      { value: "no-preference", label: "No preference" },
    ],
    apply: (p, a) => {
      if (a !== null) p.preferences.startupVsEnterprise = a as "startup" | "enterprise" | "no-preference";
    },
  },

  // ---- Location (source-specific) ----
  {
    // JobTech is Sweden-only, so we ask which Swedish city and fix the country.
    id: "jtCity",
    kind: "single",
    prompt: "Where in Sweden would you like to work?",
    when: (a) => a["source"] === "jobtech",
    options: [
      { value: "Stockholm", label: "Stockholm" },
      { value: "Göteborg", label: "Gothenburg" },
      { value: "Malmö", label: "Malmö" },
      { value: "Uppsala", label: "Uppsala" },
      { value: "any", label: "Anywhere in Sweden" },
    ],
    apply: (p, a) => {
      p.location.countries = ["Sweden"];
      p.preferences.salaryCurrency = "SEK";
      if (a !== null && a !== "any") p.location.cities = [a as string];
    },
  },
  {
    // Adzuna is international — the choice also selects the API marketplace and currency.
    id: "adzMarket",
    kind: "single",
    prompt: "Which country's job market should I search?",
    when: (a) => a["source"] === "adzuna",
    options: ADZUNA_MARKETS.map((m) => ({ value: m.value, label: m.label })),
    apply: (p, a) => {
      const market = ADZUNA_MARKETS.find((m) => m.value === a);
      if (market) {
        p.location.countries = [market.country];
        p.preferences.salaryCurrency = market.currency;
      }
    },
  },
  {
    id: "relocate",
    kind: "yesno",
    prompt: "Would you be open to relocating for the right role?",
    apply: (p, a) => {
      p.location.willingToRelocate = a as boolean;
    },
  },

  // ---- Compensation ----
  {
    id: "salaryMin",
    kind: "number",
    prompt: "What's the minimum annual salary you'd accept?",
    why: "I'll rank jobs that meet it higher",
    min: 0,
    optional: true,
    apply: (p, a) => {
      if (a !== null) p.preferences.salaryMin = a as number;
    },
  },

  // ---- Motivation ----
  {
    id: "motivations",
    kind: "multi",
    prompt: "What matters most to you in your next role?",
    optional: true,
    options: [
      { value: "Compensation", label: "Pay & benefits" },
      { value: "Growth", label: "Learning & growth" },
      { value: "Work-life balance", label: "Work-life balance" },
      { value: "Impact", label: "Meaningful impact" },
      { value: "Autonomy", label: "Autonomy" },
      { value: "Team", label: "Great team / culture" },
    ],
    apply: (p, a) => {
      p.personal.motivations = addUnique(p.personal.motivations, a as string[]);
    },
  },
];
