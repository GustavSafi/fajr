/**
 * Två språk, en ordbok. Svenska ligger på rot (jobbare.se/jobb) och engelska
 * under /en — separata URL:er, vilket är det Google vill ha.
 *
 * Ordboken är avsiktligt platt och typad: lägger du till en nyckel på svenska
 * vägrar TypeScript bygga förrän engelskan finns också.
 */

export const LOCALES = ["sv", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "sv";

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** Bygger en länk med rätt språkprefix. Svenska får inget prefix. */
export function path(locale: Locale, href: string): string {
  const clean = href.startsWith("/") ? href : `/${href}`;
  return locale === DEFAULT_LOCALE ? clean : `/${locale}${clean}`;
}

const sv = {
  brand: "Jobbare",
  tagline: "Hitta jobbet som faktiskt passar dig",
  skipToContent: "Hoppa till innehållet",

  navSearch: "Sök jobb",
  navSalaries: "Löner",
  navCv: "CV",
  navLanguage: "In English",

  heroTitle: "Alla Sveriges lediga jobb, sorterade efter hur väl de passar dig",
  heroBody:
    "Vi hämtar varje annons från Arbetsförmedlingens öppna data och visar dig varför ett jobb matchar — inte bara att det gör det.",
  heroSearchLabel: "Vad vill du jobba med?",
  heroSearchPlaceholder: "Undersköterska, snickare, systemutvecklare …",
  heroWhereLabel: "Var?",
  heroWherePlaceholder: "Hela Sverige",
  heroCta: "Sök jobb",
  heroFree: "Gratis. Inget konto behövs för att söka.",

  popularSearches: "Vanliga sökningar",
  browseByField: "Bläddra efter yrkesområde",

  searchTitle: "Lediga jobb",
  searchResultsOne: "ledigt jobb",
  searchResultsMany: "lediga jobb",
  searchEmpty: "Inga träffar",
  searchEmptyBody: "Prova ett bredare sökord, färre filter eller en annan kommun.",
  searchFailed: "Vi når inte Arbetsförmedlingens tjänst just nu",
  searchFailedBody: "Det är nästan alltid tillfälligt. Prova igen om en liten stund.",
  searchClearAll: "Rensa alla filter",

  filters: "Filter",
  filterMunicipality: "Kommun",
  filterField: "Yrkesområde",
  filterEmployment: "Anställning",
  filterRemote: "Kan utföras på distans",
  filterPartTime: "Deltid",
  filterNoExperience: "Kräver ingen erfarenhet",
  filterPublished: "Publicerat",
  filterPublishedAny: "När som helst",
  filterPublishedDay: "Senaste dygnet",
  filterPublishedWeek: "Senaste veckan",
  filterPublishedMonth: "Senaste månaden",
  showMore: "Visa fler",
  showLess: "Visa färre",

  sortLabel: "Sortera",
  sortRelevance: "Mest relevanta",
  sortNewest: "Nyast först",
  sortDeadline: "Sista ansökningsdag",

  previous: "Föregående",
  next: "Nästa",
  pageOf: "Sida {page} av {total}",

  jobFullTime: "Heltid",
  jobPartTime: "Deltid",
  jobRemote: "Distans",
  jobHybrid: "Hybrid",
  jobNoExperience: "Ingen erfarenhet krävs",
  jobDrivingLicence: "Körkort krävs",
  jobVacancies: "platser",
  jobVacancy: "plats",
  jobVacanciesLabel: "Antal platser",
  jobExtent: "Omfattning",
  jobPublished: "Publicerad",
  jobDeadline: "Sök senast",
  jobDeadlineToday: "Sök senast idag",
  jobDeadlinePassed: "Ansökningstiden har gått ut",
  jobDayLeft: "1 dag kvar",
  jobDaysLeft: "dagar kvar",
  jobApply: "Sök jobbet",
  jobApplyNote: "Du skickar din ansökan hos arbetsgivaren.",
  jobRequirements: "Krav",
  jobPreferred: "Meriterande",
  jobExperience: "Erfarenhet",
  jobAbout: "Om jobbet",
  jobSalary: "Lön",
  jobEmployer: "Arbetsgivare",
  salaryTitle: "Lön för yrket",
  salaryPerMonth: "kr/mån",
  salaryMedianOf: "medianlön för",
  salaryMeanOf: "genomsnittslön för",
  salaryRangeNote:
    "Åtta av tio i yrket tjänar mellan {low} och {high} kr i månaden. Markören visar medianen.",
  salaryRangeAria:
    "Lönespann från {low} till {high} kronor i månaden, median {median} kronor.",
  salaryEntry: "Ingångslön",
  salaryEntryAges: "18–24 år",
  salaryByAge: "Så utvecklas lönen med åldern",
  salaryAgeAria: "Genomsnittlig månadslön per åldersgrupp i yrket.",
  salaryCountNote: "Omkring {count} personer i Sverige har det här yrket.",
  salarySourceNote:
    "Yrket är arbetsgivarens egen klassning av annonsen — den stämmer inte alltid.",
  salarySource: "Källa: SCB:s lönestrukturstatistik {year}, {sector} i hela landet.",
  salaryDisclaimer: "Statistik för yrket — inte lönen för just den här tjänsten.",
  jobArchived: "Stängd annons",
  jobArchivedTitle: "Den här annonsen går inte att söka längre",
  jobArchivedBody:
    "Arbetsgivaren har tagit bort den. Vi visar den som den såg ut — och nedan finns liknande jobb som är öppna just nu.",
  jobArchivedRemoved: "Borttagen {date}",
  navProfile: "Min profil",
  profileTitle: "Berätta kort om dig",
  profileLead:
    "Fyra frågor räcker för att vi ska kunna ranka jobben efter hur väl de passar dig. Inget konto, inget sparas hos oss — svaren ligger kvar i din webbläsare.",
  profileRoles: "Vad vill du jobba med?",
  profileRolesHelp: "Skriv ett yrke och tryck Enter. Du kan lägga till flera.",
  profileWhere: "Var vill du jobba?",
  profileWhereHelp: "Välj en eller flera kommuner.",
  profileYears: "Hur många års arbetslivserfarenhet har du?",
  profileEmployment: "Vilken anställningsform söker du?",
  profileMore: "Förbättra matchningen",
  profileMoreHelp: "Frivilligt — men varje svar gör rankningen bättre.",
  profileSkills: "Vad är du bra på?",
  profileSkillsHelp: "Kunskaper, verktyg, språk, körkort. Enter mellan varje.",
  profileRemote: "Jag vill kunna jobba på distans",
  profileSalary: "Önskad månadslön",
  profileSalaryHelp: "Vi jämför mot vad yrket faktiskt betalar enligt SCB.",
  profileSave: "Spara och visa matchade jobb",
  profileSaved: "Profilen är sparad i din webbläsare.",
  profileClear: "Rensa profilen",
  profileComplete: "Profilen är {percent} % ifylld",
  profileAdd: "Lägg till",
  profileRemove: "Ta bort",
  profileCta: "Få jobben rankade efter dig",
  profileCtaBody: "Svara på fyra frågor så sorterar vi träffarna efter hur väl de passar.",
  matchLabel: "matchning",
  matchWhy: "Varför",
  matchGaps: "Att tänka på",
  sortMatch: "Bäst matchning",
  sortMatchNote:
    "Rankat bland de {pool} mest relevanta träffarna, inte hela listan.",
  lonTitle: "Lön för {name}",
  lonMeta: "{name} lön {year} — medianlön, ingångslön och lönespann enligt SCB. Plus {count} lediga jobb just nu.",
  lonIntro:
    "Siffrorna kommer från SCB:s lönestrukturstatistik och gäller hela landet. Här är vad yrket betalar, hur lönen utvecklas och vilka jobb som är lediga just nu.",
  lonBySector: "Lön per sektor",
  lonBySectorHelp:
    "Samma yrke betalar olika beroende på vem som är arbetsgivare. Saknas en sektor har SCB för få uppgifter för att redovisa den.",
  lonOpenJobs: "Lediga jobb som {name}",
  lonNoJobs: "Inga lediga jobb i yrket just nu.",
  lonAllJobs: "Visa alla {count} lediga jobb",
  lonWhere: "Var finns jobben?",
  lonWhereHelp: "Kommuner med flest lediga jobb i yrket just nu.",
  lonNoData: "Vi har ingen lönestatistik för det här yrket.",
  lonSiblings: "Samma yrke, andra inriktningar",
  lonSiblingsHelp:
    "SCB delar upp yrket i flera grupper. Siffrorna ovanför gäller en av dem — här är de andra.",

  kommunTitle: "Lediga jobb i {name}",
  kommunMeta: "{count} lediga jobb i {name} just nu. Sök bland alla annonser från Arbetsförmedlingen, med lönestatistik för varje yrke.",
  kommunIntro:
    "Alla annonser som publicerats för {name}, hämtade direkt från Arbetsförmedlingen och uppdaterade löpande.",
  kommunFields: "Yrkesområden i {name}",
  kommunLatest: "Senast publicerade",
  kommunAll: "Visa alla {count} jobb i {name}",
  kommunNoJobs: "Inga lediga jobb i kommunen just nu.",
  kommunSalaries: "Vad tjänar man?",
  kommunSalariesHelp:
    "Medianlön enligt SCB för de yrken som annonseras mest i {name} just nu.",
  kommunCount: "{count} lediga jobb just nu",
  kommunOtherPlaces: "Lediga jobb i andra kommuner",
  landingSource: "Lönestatistik från SCB. Annonser från Arbetsförmedlingen.",
  footerSalaries: "Lön per yrke",
  footerPlaces: "Lediga jobb per kommun",
  aiTitle: "Ska du söka det här jobbet?",
  aiBody:
    "Vi läser hela annonsen mot din profil och säger rakt ut om det är värt att söka — även när svaret är nej.",
  aiCta: "Gör en analys",
  aiFree: "Gratis första gången. Inget konto.",
  aiNeedProfile: "Analysen behöver veta vem du är.",
  aiNeedProfileBody: "Fyra frågor räcker för att komma igång.",
  aiNeedProfileCta: "Fyll i profilen",
  aiRunning: "Läser annonsen mot din profil …",
  aiVerdict: "Omdöme",
  aiVerdictStark: "Sök",
  aiVerdictMojlig: "Värt att söka",
  aiVerdictSvag: "Svag ansökan",
  aiVerdictUtesluten: "Du uppfyller inte kravet",
  aiStrengths: "Det här talar för dig",
  aiGaps: "Det här väger emot",
  aiBlocking: "Krav",
  aiUnknowns: "Det här kunde vi inte bedöma",
  aiUnknownsHelp:
    "Din profil säger ingenting om det — det betyder inte att det saknas. Fyll på så blir nästa analys skarpare.",
  aiAdvice: "Vad du bör göra",
  aiDisclaimer:
    "Analysen bygger bara på annonsen och din profil. Den vet ingenting om dig som du inte har skrivit, och den fattar inte beslutet åt arbetsgivaren.",
  aiErrorUsed: "Du har använt ditt gratisförsök",
  aiErrorUsedBody:
    "Obegränsat med analyser kommer att ingå i abonnemanget. Det är inte igång än.",
  aiErrorClosed: "Gratisanalysen är tillfälligt avstängd",
  aiErrorGeneric: "Analysen gick inte att hämta just nu",
  aiErrorGenericBody: "Försök igen om en stund. Ditt gratisförsök är kvar.",
  aiRetry: "Försök igen",
  jobRelated: "Liknande jobb",
  jobNotFound: "Annonsen finns inte längre",
  jobNotFoundBody: "Den kan ha tagits bort eller passerat sista ansökningsdag.",
  jobBackToSearch: "Tillbaka till sökningen",

  today: "idag",
  yesterday: "igår",
  daysAgo: "dagar sedan",

  footerSource: "Annonsdata från Arbetsförmedlingen via JobTech Dev, uppdaterad dagligen.",
  footerAbout: "Om Jobbare",
  footerPrivacy: "Integritetspolicy",
} as const;

/**
 * Nycklarna kommer från svenskan, värdena är vanliga strängar. Saknas en
 * nyckel i engelskan vägrar TypeScript bygga — översättningar kan inte glömmas
 * bort, men texterna behöver förstås inte vara identiska.
 */
type Dictionary = { [K in keyof typeof sv]: string };

const en: Dictionary = {
  brand: "Jobbare",
  tagline: "Find the job that actually fits you",
  skipToContent: "Skip to content",

  navSearch: "Find jobs",
  navSalaries: "Salaries",
  navCv: "CV",
  navLanguage: "På svenska",

  heroTitle: "Every job in Sweden, ranked by how well it fits you",
  heroBody:
    "We pull every listing from the Swedish Public Employment Service's open data and show you why a job matches — not just that it does.",
  heroSearchLabel: "What do you want to do?",
  heroSearchPlaceholder: "Nurse, carpenter, software developer …",
  heroWhereLabel: "Where?",
  heroWherePlaceholder: "All of Sweden",
  heroCta: "Search jobs",
  heroFree: "Free. No account needed to search.",

  popularSearches: "Popular searches",
  browseByField: "Browse by field",

  searchTitle: "Open positions",
  searchResultsOne: "open position",
  searchResultsMany: "open positions",
  searchEmpty: "No matches",
  searchEmptyBody: "Try a broader term, fewer filters, or a different municipality.",
  searchFailed: "We can't reach the job data service right now",
  searchFailedBody: "This is almost always temporary. Try again in a moment.",
  searchClearAll: "Clear all filters",

  filters: "Filters",
  filterMunicipality: "Municipality",
  filterField: "Field",
  filterEmployment: "Employment",
  filterRemote: "Can be done remotely",
  filterPartTime: "Part-time",
  filterNoExperience: "No experience required",
  filterPublished: "Published",
  filterPublishedAny: "Any time",
  filterPublishedDay: "Past 24 hours",
  filterPublishedWeek: "Past week",
  filterPublishedMonth: "Past month",
  showMore: "Show more",
  showLess: "Show fewer",

  sortLabel: "Sort",
  sortRelevance: "Most relevant",
  sortNewest: "Newest first",
  sortDeadline: "Application deadline",

  previous: "Previous",
  next: "Next",
  pageOf: "Page {page} of {total}",

  jobFullTime: "Full-time",
  jobPartTime: "Part-time",
  jobRemote: "Remote",
  jobHybrid: "Hybrid",
  jobNoExperience: "No experience required",
  jobDrivingLicence: "Driving licence required",
  jobVacancies: "positions",
  jobVacancy: "position",
  jobVacanciesLabel: "Positions",
  jobExtent: "Extent",
  jobPublished: "Published",
  jobDeadline: "Apply by",
  jobDeadlineToday: "Apply by today",
  jobDeadlinePassed: "The application period has closed",
  jobDayLeft: "1 day left",
  jobDaysLeft: "days left",
  jobApply: "Apply for this job",
  jobApplyNote: "You apply directly with the employer.",
  jobRequirements: "Requirements",
  jobPreferred: "Nice to have",
  jobExperience: "Experience",
  jobAbout: "About the job",
  jobSalary: "Salary",
  jobEmployer: "Employer",
  salaryTitle: "Salary for this occupation",
  salaryPerMonth: "SEK/month",
  salaryMedianOf: "median salary for",
  salaryMeanOf: "average salary for",
  salaryRangeNote:
    "Eight in ten people in this occupation earn between {low} and {high} SEK a month. The marker shows the median.",
  salaryRangeAria: "Salary range from {low} to {high} SEK per month, median {median} SEK.",
  salaryEntry: "Starting salary",
  salaryEntryAges: "ages 18–24",
  salaryByAge: "How pay develops with age",
  salaryAgeAria: "Average monthly salary by age group in this occupation.",
  salaryCountNote: "About {count} people in Sweden work in this occupation.",
  salarySourceNote:
    "The occupation is the employer's own classification of the listing — it isn't always right.",
  salarySource: "Source: Statistics Sweden salary structure statistics {year}, {sector}, nationwide.",
  salaryDisclaimer: "Statistics for the occupation — not the salary for this specific job.",
  jobArchived: "Closed listing",
  jobArchivedTitle: "This job can no longer be applied for",
  jobArchivedBody:
    "The employer has removed it. We show it as it was — and below are similar jobs that are open right now.",
  jobArchivedRemoved: "Removed {date}",
  navProfile: "My profile",
  profileTitle: "Tell us a little about you",
  profileLead:
    "Four questions is enough for us to rank jobs by how well they fit you. No account, nothing stored with us — your answers stay in your browser.",
  profileRoles: "What do you want to work with?",
  profileRolesHelp: "Type an occupation and press Enter. You can add several.",
  profileWhere: "Where do you want to work?",
  profileWhereHelp: "Pick one or more municipalities.",
  profileYears: "How many years of work experience do you have?",
  profileEmployment: "What kind of employment are you looking for?",
  profileMore: "Improve your match",
  profileMoreHelp: "Optional — but every answer makes the ranking better.",
  profileSkills: "What are you good at?",
  profileSkillsHelp: "Skills, tools, languages, licences. Enter between each.",
  profileRemote: "I want to be able to work remotely",
  profileSalary: "Desired monthly salary",
  profileSalaryHelp: "We compare it with what the occupation actually pays, per Statistics Sweden.",
  profileSave: "Save and show matched jobs",
  profileSaved: "Your profile is saved in your browser.",
  profileClear: "Clear profile",
  profileComplete: "Profile is {percent} % complete",
  profileAdd: "Add",
  profileRemove: "Remove",
  profileCta: "Get jobs ranked for you",
  profileCtaBody: "Answer four questions and we'll sort the results by how well they fit.",
  matchLabel: "match",
  matchWhy: "Why",
  matchGaps: "Worth noting",
  sortMatch: "Best match",
  sortMatchNote: "Ranked among the {pool} most relevant hits, not the whole list.",
  lonTitle: "Salary for {name}",
  lonMeta: "{name} salary {year} — median, starting salary and range from Statistics Sweden. Plus {count} open jobs right now.",
  lonIntro:
    "The figures come from Statistics Sweden's salary structure statistics and cover the whole country. Here is what the occupation pays, how pay develops, and which jobs are open right now.",
  lonBySector: "Pay by sector",
  lonBySectorHelp:
    "The same occupation pays differently depending on the employer. A missing sector means Statistics Sweden has too little data to report it.",
  lonOpenJobs: "Open jobs as {name}",
  lonNoJobs: "No open jobs in this occupation right now.",
  lonAllJobs: "Show all {count} open jobs",
  lonWhere: "Where are the jobs?",
  lonWhereHelp: "Municipalities with the most open jobs in this occupation right now.",
  lonNoData: "We have no salary statistics for this occupation.",
  lonSiblings: "Same occupation, other specialisations",
  lonSiblingsHelp:
    "Statistics Sweden splits this occupation into several groups. The figures above cover one of them — here are the others.",

  kommunTitle: "Jobs in {name}",
  kommunMeta: "{count} open jobs in {name} right now. Search every listing from the Swedish Public Employment Service, with salary statistics for each occupation.",
  kommunIntro:
    "Every listing published for {name}, taken straight from the Swedish Public Employment Service and updated continuously.",
  kommunFields: "Fields in {name}",
  kommunLatest: "Most recently published",
  kommunAll: "Show all {count} jobs in {name}",
  kommunNoJobs: "No open jobs in this municipality right now.",
  kommunSalaries: "What do people earn?",
  kommunSalariesHelp:
    "Median salary from Statistics Sweden for the occupations most advertised in {name} right now.",
  kommunCount: "{count} open jobs right now",
  kommunOtherPlaces: "Jobs in other municipalities",
  landingSource: "Salary statistics from Statistics Sweden. Listings from the Swedish Public Employment Service.",
  footerSalaries: "Salary by occupation",
  footerPlaces: "Jobs by municipality",
  aiTitle: "Should you apply for this job?",
  aiBody:
    "We read the whole ad against your profile and say plainly whether it is worth applying — including when the answer is no.",
  aiCta: "Run an analysis",
  aiFree: "Free the first time. No account.",
  aiNeedProfile: "The analysis needs to know who you are.",
  aiNeedProfileBody: "Four questions is enough to start.",
  aiNeedProfileCta: "Fill in your profile",
  aiRunning: "Reading the ad against your profile …",
  aiVerdict: "Verdict",
  aiVerdictStark: "Apply",
  aiVerdictMojlig: "Worth applying",
  aiVerdictSvag: "Weak application",
  aiVerdictUtesluten: "You do not meet the requirement",
  aiStrengths: "This works in your favour",
  aiGaps: "This weighs against you",
  aiBlocking: "Requirement",
  aiUnknowns: "We could not judge this",
  aiUnknownsHelp:
    "Your profile says nothing about it — that does not mean it is missing. Fill it in and the next analysis gets sharper.",
  aiAdvice: "What you should do",
  aiDisclaimer:
    "The analysis is based only on the ad and your profile. It knows nothing about you that you have not written, and it does not make the employer's decision.",
  aiErrorUsed: "You have used your free analysis",
  aiErrorUsedBody: "Unlimited analyses will be part of the subscription. It is not live yet.",
  aiErrorClosed: "The free analysis is temporarily switched off",
  aiErrorGeneric: "The analysis could not be fetched right now",
  aiErrorGenericBody: "Try again in a moment. Your free attempt is still there.",
  aiRetry: "Try again",
  jobRelated: "Similar jobs",
  jobNotFound: "This listing is no longer available",
  jobNotFoundBody: "It may have been removed or passed its application deadline.",
  jobBackToSearch: "Back to search",

  today: "today",
  yesterday: "yesterday",
  daysAgo: "days ago",

  footerSource:
    "Job data from the Swedish Public Employment Service via JobTech Dev, updated daily.",
  footerAbout: "About Jobbare",
  footerPrivacy: "Privacy policy",
};

const DICTIONARIES: Record<Locale, Dictionary> = { sv, en };

export type TranslationKey = keyof Dictionary;

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}

/** Enkel platshållarersättning: t(d, "pageOf", { page: 2, total: 9 }) */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in values ? String(values[key]) : `{${key}}`,
  );
}
