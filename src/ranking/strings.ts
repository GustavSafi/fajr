import type { EmploymentType, WorkArrangement } from "../models/index.ts";
import type { Lang } from "../i18n.ts";

const ARR: Record<Lang, Record<WorkArrangement, string>> = {
  en: { remote: "Remote", hybrid: "Hybrid", "on-site": "On-site" },
  sv: { remote: "Distans", hybrid: "Hybrid", "on-site": "På plats" },
};

const EMP: Record<Lang, Record<EmploymentType, string>> = {
  en: { "full-time": "Full-time", "part-time": "Part-time", contract: "Contract", internship: "Internship" },
  sv: { "full-time": "Heltid", "part-time": "Deltid", contract: "Konsult", internship: "Praktik" },
};

export function arrWord(a: WorkArrangement, lang: Lang): string {
  return ARR[lang][a];
}
export function empWord(e: EmploymentType, lang: Lang): string {
  return EMP[lang][e];
}

/** Localized reason/gap phrasings for a ranked job. */
export const RS = {
  titleMatch: (lang: Lang) =>
    lang === "sv" ? "Titeln matchar din önskade roll" : "Title matches your target role",
  skills: (s: string, lang: Lang) =>
    lang === "sv" ? `Matchar dina kunskaper: ${s}` : `Matches your skills: ${s}`,
  seniority: (years: number, lang: Lang) =>
    lang === "sv"
      ? `Senioriteten passar dina ${years} års erfarenhet`
      : `Seniority fits your ${years} years of experience`,
  location: (country: string, lang: Lang) =>
    lang === "sv" ? `Ligger i ${country}, där du vill jobba` : `Located in ${country}, where you want to work`,
  arrangement: (a: WorkArrangement, lang: Lang) =>
    lang === "sv"
      ? `${arrWord(a, lang)} — matchar dina önskemål`
      : `${arrWord(a, lang)} — matches your preference`,
  salary: (predicted: boolean, lang: Lang) =>
    predicted
      ? lang === "sv"
        ? "Uppskattad lön möter ditt mål"
        : "Estimated salary meets your target"
      : lang === "sv"
        ? "Uppfyller din minimilön"
        : "Meets your minimum salary",
  employment: (e: EmploymentType, lang: Lang) =>
    lang === "sv" ? `${empWord(e, lang)} — som du ville` : `${empWord(e, lang)} role, as you wanted`,

  gapRequirements: (s: string, lang: Lang) =>
    lang === "sv" ? `Krav att kontrollera: ${s}` : `Listed requirements to check: ${s}`,
  gapSalaryLow: (lang: Lang) => (lang === "sv" ? "Lönen kan vara under ditt mål" : "Salary may be below your target"),
  gapLocation: (lang: Lang) => (lang === "sv" ? "Inte på din önskade plats" : "Not in your preferred location"),
  gapArrangement: (a: WorkArrangement, lang: Lang) =>
    lang === "sv"
      ? `${arrWord(a, lang)} — inte din önskade arbetsform`
      : `${arrWord(a, lang)} — not your preferred arrangement`,
  gapNoSalary: (lang: Lang) => (lang === "sv" ? "Ingen lön angiven" : "No salary listed"),
};
