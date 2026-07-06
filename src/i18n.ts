import type { JobSource } from "./models/index.ts";

/** Supported interface languages. */
export type Lang = "en" | "sv";

/** A string that may be provided per-language. A plain string is used as-is. */
export type LocalizedText = string | Record<Lang, string>;

/** Resolve localized text to a concrete string for the given language. */
export function t(text: LocalizedText, lang: Lang): string {
  return typeof text === "string" ? text : text[lang];
}

/**
 * Language for each source: JobTech is a Swedish job board, so the interview,
 * search terms, and explanations run in Swedish; Adzuna covers English-language
 * markets, so it runs in English.
 */
export function langForSource(source: JobSource): Lang {
  return source === "jobtech" ? "sv" : "en";
}
