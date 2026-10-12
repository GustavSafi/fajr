import type { Locale } from "@/lib/i18n";
import type { EmploymentType } from "@/lib/types";

/**
 * Texterna som förklarar *varför* ett jobb matchar.
 *
 * De står i en egen fil och inte i ordboken, för de tar argument och byggs
 * ihop av siffror och listor. Varje mening ska gå att läsa som ett påstående
 * användaren kan kontrollera mot annonsen — det är hela poängen med att vi
 * visar skäl i stället för bara en siffra.
 */

const list = (items: string[]) => items.join(", ");

export const reasonText = {
  title: (l: Locale) =>
    l === "sv" ? "Titeln matchar det du vill jobba med" : "The title matches what you want to do",

  skills: (skills: string[], l: Locale) =>
    l === "sv"
      ? `Annonsen nämner dina kunskaper: ${list(skills)}`
      : `The listing mentions your skills: ${list(skills)}`,

  experience: (years: number, l: Locale) =>
    l === "sv"
      ? `Dina ${years} års erfarenhet ligger rätt för nivån`
      : `Your ${years} years of experience fit the level`,

  noExperience: (l: Locale) =>
    l === "sv" ? "Kräver ingen tidigare erfarenhet" : "No previous experience required",

  location: (municipality: string, l: Locale) =>
    l === "sv" ? `Ligger i ${municipality}, där du vill jobba` : `Located in ${municipality}, where you want to work`,

  remote: (l: Locale) =>
    l === "sv" ? "Går att utföra på distans" : "Can be done remotely",

  salary: (l: Locale) =>
    l === "sv"
      ? "Yrkets lönenivå når ditt löneanspråk"
      : "The occupation's pay level meets your salary expectation",

  employment: (type: EmploymentType, l: Locale) => {
    const sv: Record<EmploymentType, string> = {
      "full-time": "Heltid, som du önskade",
      "part-time": "Deltid, som du önskade",
      contract: "Tidsbegränsad anställning, som du önskade",
      internship: "Praktik, som du önskade",
    };
    const en: Record<EmploymentType, string> = {
      "full-time": "Full-time, as you wanted",
      "part-time": "Part-time, as you wanted",
      contract: "Fixed-term, as you wanted",
      internship: "Internship, as you wanted",
    };
    return l === "sv" ? sv[type] : en[type];
  },
};

export const gapText = {
  requirements: (missing: string[], l: Locale) =>
    l === "sv"
      ? `Krav du inte angett att du har: ${list(missing)}`
      : `Requirements you haven't said you meet: ${list(missing)}`,

  location: (municipality: string, l: Locale) =>
    l === "sv"
      ? `Ligger i ${municipality} — utanför de orter du valt`
      : `Located in ${municipality} — outside the places you chose`,

  salary: (l: Locale) =>
    l === "sv"
      ? "Yrkets typiska lön ligger under ditt löneanspråk"
      : "The occupation's typical pay is below your salary expectation",

  remote: (l: Locale) =>
    l === "sv" ? "Verkar kräva att du är på plats" : "Appears to require being on site",

  experience: (l: Locale) =>
    l === "sv"
      ? "Nivån verkar ligga över din erfarenhet"
      : "The level appears to be above your experience",
};
