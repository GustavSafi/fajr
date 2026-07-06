import type { Question } from "./types.ts";
import type { EmploymentType, WorkArrangement } from "../models/index.ts";
import type { Lang } from "../i18n.ts";
import { selectedLabels } from "./ask.ts";

/** Merge new values into a profile string array, de-duplicated, order-preserving. */
function addUnique(existing: string[] | undefined, values: string[]): string[] {
  return [...new Set([...(existing ?? []), ...values])].filter(Boolean);
}

/** Localized industry name for each top-level field code. */
const INDUSTRY: Record<Lang, Record<string, string>> = {
  en: {
    software: "Software & Technology",
    teaching: "Education",
    design: "Design & Creative",
    healthcare: "Healthcare",
    business: "Business & Operations",
    other: "Other",
  },
  sv: {
    software: "IT & Teknik",
    teaching: "Utbildning",
    design: "Design & Kreativt",
    healthcare: "Vård & Omsorg",
    business: "Ekonomi & Verksamhet",
    other: "Övrigt",
  },
};

/** Adzuna marketplaces (Adzuna path is English-only). */
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

/** Store the localized labels of the selected options into a profile array. */
function storeLabels(
  target: (values: string[]) => void,
  q: Question,
  answer: Parameters<Question["apply"]>[1],
  lang: Lang,
): void {
  target(selectedLabels(q, answer, lang));
}

export const QUESTION_BANK: Question[] = [
  {
    id: "source",
    kind: "single",
    prompt:
      "Which job source would you like to search? / Vilken jobbkälla vill du söka i?",
    why: "JobTech covers Sweden (in Swedish); Adzuna covers international jobs (in English). / JobTech täcker Sverige (på svenska); Adzuna täcker internationella jobb (på engelska).",
    options: [
      { value: "jobtech", label: "JobTech — jobb i Sverige (Arbetsförmedlingen)" },
      { value: "adzuna", label: "Adzuna — international jobs (UK, US, Germany, ...)" },
    ],
    apply: () => {
      /* source drives branching + language via `when`; nothing to store */
    },
  },
  {
    id: "field",
    kind: "single",
    prompt: { en: "What field are you hoping to work in?", sv: "Vilket område vill du arbeta inom?" },
    why: {
      en: "It lets me ask the right follow-up questions for your profession",
      sv: "Så att jag kan ställa rätt följdfrågor för ditt yrke",
    },
    options: [
      { value: "software", label: { en: "Software & Technology", sv: "IT & Teknik" } },
      { value: "teaching", label: { en: "Teaching & Education", sv: "Undervisning & Utbildning" } },
      { value: "design", label: { en: "Design & Creative", sv: "Design & Kreativt" } },
      { value: "healthcare", label: { en: "Healthcare", sv: "Vård & Omsorg" } },
      { value: "business", label: { en: "Business, Sales & Operations", sv: "Ekonomi, Försäljning & Verksamhet" } },
      { value: "other", label: { en: "Something else", sv: "Något annat" } },
    ],
    apply: (p, a, ctx) => {
      const industry = INDUSTRY[ctx.lang][a as string] ?? INDUSTRY[ctx.lang]["other"]!;
      p.careerGoals.industries = addUnique(p.careerGoals.industries, [industry]);
    },
  },

  // ---- Role, branched by field. Swedish labels double as JobTech search terms. ----
  {
    id: "roleSoftware",
    kind: "multi",
    prompt: { en: "Which kind of software role fits you best?", sv: "Vilken typ av IT-roll passar dig bäst?" },
    when: (a) => a["field"] === "software",
    options: [
      { value: "backend", label: { en: "Backend Developer", sv: "Backend-utvecklare" } },
      { value: "frontend", label: { en: "Frontend Developer", sv: "Frontend-utvecklare" } },
      { value: "fullstack", label: { en: "Full-Stack Developer", sv: "Fullstack-utvecklare" } },
      { value: "mobile", label: { en: "Mobile Developer", sv: "Apputvecklare" } },
      { value: "data", label: { en: "Data Engineer / Scientist", sv: "Datavetare / Data Scientist" } },
      { value: "devops", label: { en: "DevOps / Platform Engineer", sv: "DevOps-ingenjör" } },
      { value: "qa", label: { en: "QA / Test Engineer", sv: "Testare" } },
    ],
    apply: (p, a, ctx) =>
      storeLabels((v) => (p.careerGoals.desiredRoles = addUnique(p.careerGoals.desiredRoles, v)), ctx.question, a, ctx.lang),
  },
  {
    id: "roleTeaching",
    kind: "multi",
    prompt: { en: "What kind of teaching role are you after?", sv: "Vilken typ av lärartjänst söker du?" },
    when: (a) => a["field"] === "teaching",
    options: [
      { value: "preschool", label: { en: "Preschool Teacher", sv: "Förskollärare" } },
      { value: "primary", label: { en: "Primary School Teacher", sv: "Grundskollärare" } },
      { value: "secondary", label: { en: "Secondary School Teacher", sv: "Gymnasielärare" } },
      { value: "university", label: { en: "University Lecturer", sv: "Universitetslektor" } },
      { value: "tutor", label: { en: "Private Tutor", sv: "Privatlärare" } },
      { value: "ta", label: { en: "Teaching Assistant", sv: "Lärarassistent" } },
    ],
    apply: (p, a, ctx) =>
      storeLabels((v) => (p.careerGoals.desiredRoles = addUnique(p.careerGoals.desiredRoles, v)), ctx.question, a, ctx.lang),
  },
  {
    id: "roleDesign",
    kind: "multi",
    prompt: { en: "Which design role suits you?", sv: "Vilken designroll passar dig?" },
    when: (a) => a["field"] === "design",
    options: [
      { value: "ux", label: { en: "UX Designer", sv: "UX-designer" } },
      { value: "ui", label: { en: "UI Designer", sv: "UI-designer" } },
      { value: "product", label: { en: "Product Designer", sv: "Produktdesigner" } },
      { value: "graphic", label: { en: "Graphic Designer", sv: "Grafisk designer" } },
    ],
    apply: (p, a, ctx) =>
      storeLabels((v) => (p.careerGoals.desiredRoles = addUnique(p.careerGoals.desiredRoles, v)), ctx.question, a, ctx.lang),
  },
  {
    id: "roleHealthcare",
    kind: "multi",
    prompt: { en: "Which healthcare role are you looking for?", sv: "Vilken vårdroll söker du?" },
    when: (a) => a["field"] === "healthcare",
    options: [
      { value: "nurse", label: { en: "Nurse", sv: "Sjuksköterska" } },
      { value: "assistant", label: { en: "Care Assistant", sv: "Undersköterska" } },
      { value: "physician", label: { en: "Physician / Doctor", sv: "Läkare" } },
      { value: "therapist", label: { en: "Therapist", sv: "Terapeut" } },
      { value: "counselor", label: { en: "Psychologist / Counselor", sv: "Psykolog / Kurator" } },
    ],
    apply: (p, a, ctx) =>
      storeLabels((v) => (p.careerGoals.desiredRoles = addUnique(p.careerGoals.desiredRoles, v)), ctx.question, a, ctx.lang),
  },
  {
    id: "roleOther",
    kind: "single",
    prompt: { en: "Which best describes the work you want?", sv: "Vad beskriver bäst arbetet du vill ha?" },
    when: (a) => a["field"] === "business" || a["field"] === "other",
    options: [
      { value: "management", label: { en: "Management / Leadership", sv: "Chef / Ledarskap" } },
      { value: "sales", label: { en: "Sales", sv: "Försäljning" } },
      { value: "marketing", label: { en: "Marketing", sv: "Marknadsföring" } },
      { value: "operations", label: { en: "Operations", sv: "Verksamhet / Drift" } },
      { value: "support", label: { en: "Customer Support", sv: "Kundtjänst" } },
      { value: "counselor", label: { en: "Counselor / Advisor", sv: "Rådgivare / Kurator" } },
      { value: "economist", label: { en: "Economist / Analyst", sv: "Ekonom / Analytiker" } },
      { value: "admin", label: { en: "Administration", sv: "Administration" } },
    ],
    apply: (p, a, ctx) =>
      storeLabels((v) => (p.careerGoals.desiredRoles = addUnique(p.careerGoals.desiredRoles, v)), ctx.question, a, ctx.lang),
  },

  // ---- Skills, branched ----
  {
    id: "langs",
    kind: "multi",
    prompt: { en: "Which programming languages are you most confident in?", sv: "Vilka programmeringsspråk behärskar du bäst?" },
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
    prompt: { en: "Which tools or frameworks do you work with?", sv: "Vilka verktyg eller ramverk arbetar du med?" },
    when: (a) => a["field"] === "software",
    optional: true,
    options: [
      { value: "React", label: "React" },
      { value: "Node.js", label: "Node.js" },
      { value: "Docker", label: { en: "Docker / Kubernetes", sv: "Docker / Kubernetes" } },
      { value: "AWS", label: { en: "AWS / Cloud", sv: "AWS / Moln" } },
      { value: "PostgreSQL", label: { en: "SQL databases", sv: "SQL-databaser" } },
      { value: "TensorFlow", label: { en: "ML / data tooling", sv: "ML / dataverktyg" } },
    ],
    apply: (p, a) => {
      p.skills.frameworks = addUnique(p.skills.frameworks, a as string[]);
    },
  },
  {
    id: "subjects",
    kind: "multi",
    prompt: { en: "Which subjects do you teach?", sv: "Vilka ämnen undervisar du i?" },
    when: (a) => a["field"] === "teaching",
    optional: true,
    options: [
      { value: "math", label: { en: "Mathematics", sv: "Matematik" } },
      { value: "science", label: { en: "Science", sv: "Naturvetenskap" } },
      { value: "languages", label: { en: "Languages", sv: "Språk" } },
      { value: "humanities", label: { en: "Humanities / Social studies", sv: "Samhällskunskap / Humaniora" } },
      { value: "arts", label: { en: "Arts", sv: "Estetiska ämnen" } },
      { value: "pe", label: { en: "Physical Education", sv: "Idrott & hälsa" } },
      { value: "computing", label: { en: "Computing / IT", sv: "Data / IT" } },
    ],
    apply: (p, a, ctx) =>
      storeLabels((v) => (p.skills.technical = addUnique(p.skills.technical, v)), ctx.question, a, ctx.lang),
  },

  // ---- Experience ----
  {
    id: "years",
    kind: "number",
    prompt: { en: "How many years of experience do you have in this area?", sv: "Hur många års erfarenhet har du inom detta?" },
    min: 0,
    max: 60,
    unit: { en: "years", sv: "år" },
    apply: (p, a) => {
      p.experience.totalYears = a as number;
    },
  },
  {
    id: "leadership",
    kind: "yesno",
    prompt: { en: "Have you held a leadership or management role?", sv: "Har du haft en lednings- eller chefsroll?" },
    apply: (p, a) => {
      p.experience.hasLeadership = a as boolean;
    },
  },

  // ---- Soft skills ----
  {
    id: "soft",
    kind: "multi",
    prompt: { en: "Which of these are your strongest soft skills?", sv: "Vilka är dina starkaste personliga egenskaper?" },
    optional: true,
    options: [
      { value: "communication", label: { en: "Communication", sv: "Kommunikation" } },
      { value: "teamwork", label: { en: "Teamwork", sv: "Samarbete" } },
      { value: "problem", label: { en: "Problem-solving", sv: "Problemlösning" } },
      { value: "leadership", label: { en: "Leadership", sv: "Ledarskap" } },
      { value: "empathy", label: { en: "Empathy / Care", sv: "Empati / Omtanke" } },
      { value: "adaptability", label: { en: "Adaptability", sv: "Flexibilitet" } },
      { value: "time", label: { en: "Time management", sv: "Tidshantering" } },
    ],
    apply: (p, a, ctx) =>
      storeLabels((v) => (p.skills.soft = addUnique(p.skills.soft, v)), ctx.question, a, ctx.lang),
  },

  // ---- Work preferences ----
  {
    id: "arrangement",
    kind: "multi",
    prompt: { en: "How do you want to work?", sv: "Hur vill du arbeta?" },
    options: [
      { value: "remote", label: { en: "Remote", sv: "Distans" } },
      { value: "hybrid", label: { en: "Hybrid", sv: "Hybrid" } },
      { value: "on-site", label: { en: "On-site", sv: "På plats" } },
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
    prompt: { en: "What type of employment are you looking for?", sv: "Vilken anställningsform söker du?" },
    options: [
      { value: "full-time", label: { en: "Full-time", sv: "Heltid" } },
      { value: "part-time", label: { en: "Part-time", sv: "Deltid" } },
      { value: "contract", label: { en: "Contract", sv: "Konsult / Kontrakt" } },
      { value: "internship", label: { en: "Internship", sv: "Praktik" } },
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
    prompt: { en: "Do you prefer startups or established companies?", sv: "Föredrar du startups eller etablerade företag?" },
    optional: true,
    options: [
      { value: "startup", label: { en: "Startup", sv: "Startup" } },
      { value: "enterprise", label: { en: "Established / enterprise", sv: "Etablerat / storföretag" } },
      { value: "no-preference", label: { en: "No preference", sv: "Ingen preferens" } },
    ],
    apply: (p, a) => {
      if (a !== null) p.preferences.startupVsEnterprise = a as "startup" | "enterprise" | "no-preference";
    },
  },

  // ---- Location (source-specific) ----
  {
    id: "jtCity",
    kind: "single",
    prompt: { en: "Where in Sweden would you like to work?", sv: "Var i Sverige vill du arbeta?" },
    when: (a) => a["source"] === "jobtech",
    options: [
      { value: "Stockholm", label: "Stockholm" },
      { value: "Göteborg", label: { en: "Gothenburg", sv: "Göteborg" } },
      { value: "Malmö", label: "Malmö" },
      { value: "Uppsala", label: "Uppsala" },
      { value: "any", label: { en: "Anywhere in Sweden", sv: "Var som helst i Sverige" } },
    ],
    apply: (p, a) => {
      p.location.countries = ["Sverige"];
      p.preferences.salaryCurrency = "SEK";
      if (a !== null && a !== "any") p.location.cities = [a as string];
    },
  },
  {
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
    prompt: { en: "Would you be open to relocating for the right role?", sv: "Är du öppen för att flytta för rätt jobb?" },
    apply: (p, a) => {
      p.location.willingToRelocate = a as boolean;
    },
  },

  // ---- Compensation ----
  {
    id: "salaryMin",
    kind: "number",
    prompt: { en: "What's the minimum annual salary you'd accept?", sv: "Vilken är den lägsta årslön du kan tänka dig?" },
    why: { en: "I'll rank jobs that meet it higher", sv: "Jag rankar jobb som uppfyller den högre" },
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
    prompt: { en: "What matters most to you in your next role?", sv: "Vad är viktigast för dig i nästa jobb?" },
    optional: true,
    options: [
      { value: "compensation", label: { en: "Pay & benefits", sv: "Lön & förmåner" } },
      { value: "growth", label: { en: "Learning & growth", sv: "Lärande & utveckling" } },
      { value: "balance", label: { en: "Work-life balance", sv: "Balans i livet" } },
      { value: "impact", label: { en: "Meaningful impact", sv: "Meningsfullt arbete" } },
      { value: "autonomy", label: { en: "Autonomy", sv: "Självständighet" } },
      { value: "team", label: { en: "Great team / culture", sv: "Bra team / kultur" } },
    ],
    apply: (p, a, ctx) =>
      storeLabels((v) => (p.personal.motivations = addUnique(p.personal.motivations, v)), ctx.question, a, ctx.lang),
  },
];
