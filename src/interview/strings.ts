import type { Lang } from "../i18n.ts";

/** UI strings for the interview + results, per language. */
interface UiStrings {
  greeting: string;
  closing: string;
  chooseOne: string;
  chooseAny: string;
  skip: string;
  enterNumber: string;
  yesNo: string;
  invalidOption: string;
  invalidMulti: string;
  invalidYesNo: string;
  invalidNumber: string;
  between: (min: number, max: number) => string;
  profileHeader: string;
  searching: (source: string, what: string) => string;
  broadening: (what: string) => string;
  found: (n: number) => string;
  notConfigured: (source: string) => string;
  topMatches: (shown: number, source: string, total: number) => string;
  noJobs: string;
}

export const UI: Record<Lang, UiStrings> = {
  en: {
    greeting:
      "Hi! I'd love to help you find jobs that actually fit you — not just jobs that happen to contain certain keywords.\n" +
      "I'll ask you a few quick questions to understand what you're looking for. Just pick the options that fit.",
    closing: "Thanks — that's everything I need. Let me put together your profile and start searching.",
    chooseOne: "Choose one",
    chooseAny: "Choose any (comma-separated, e.g. 1,3)",
    skip: " (or press Enter to skip)",
    enterNumber: "Enter a number",
    yesNo: "(yes/no)",
    invalidOption: "Please enter the number of one option.",
    invalidMulti: "Please enter option numbers separated by commas.",
    invalidYesNo: "Please answer yes or no.",
    invalidNumber: "Please enter a valid number",
    between: (min, max) => ` between ${min} and ${max}`,
    profileHeader: "Here's the profile I built:",
    searching: (source, what) => `Searching ${source} for "${what}"...`,
    broadening: (what) => `No exact matches — broadening to "${what}"...`,
    found: (n) => `Found ${n} listings; ranking...`,
    notConfigured: (source) => `The ${source} source isn't configured. Add its keys to .env (see .env.example) and try again.`,
    topMatches: (shown, source, total) => `\nTop ${shown} matches from ${source} (of ${total} found):\n`,
    noJobs: "No jobs found. Try broadening your answers (e.g. a different role or location).",
  },
  sv: {
    greeting:
      "Hej! Jag hjälper dig gärna att hitta jobb som verkligen passar dig — inte bara jobb som råkar innehålla vissa nyckelord.\n" +
      "Jag ställer några snabba frågor för att förstå vad du söker. Välj bara de alternativ som passar.",
    closing: "Tack — det var allt jag behövde. Nu sätter jag ihop din profil och börjar söka.",
    chooseOne: "Välj ett",
    chooseAny: "Välj valfria (kommaseparerat, t.ex. 1,3)",
    skip: " (eller tryck Enter för att hoppa över)",
    enterNumber: "Ange ett tal",
    yesNo: "(ja/nej)",
    invalidOption: "Ange numret för ett av alternativen.",
    invalidMulti: "Ange alternativens nummer separerade med komma.",
    invalidYesNo: "Svara ja eller nej.",
    invalidNumber: "Ange ett giltigt tal",
    between: (min, max) => ` mellan ${min} och ${max}`,
    profileHeader: "Här är profilen jag byggde:",
    searching: (source, what) => `Söker på ${source} efter "${what}"...`,
    broadening: (what) => `Inga exakta träffar — breddar sökningen till "${what}"...`,
    found: (n) => `Hittade ${n} annonser; rankar...`,
    notConfigured: (source) => `Källan ${source} är inte konfigurerad. Lägg till nycklarna i .env (se .env.example) och försök igen.`,
    topMatches: (shown, source, total) => `\nTopp ${shown} matchningar från ${source} (av ${total} funna):\n`,
    noJobs: "Inga jobb hittades. Prova att bredda dina svar (t.ex. en annan roll eller plats).",
  },
};

/** Accept yes/no in both languages regardless of interface language. */
export const YES_WORDS = ["y", "yes", "j", "ja"];
export const NO_WORDS = ["n", "no", "nej"];
