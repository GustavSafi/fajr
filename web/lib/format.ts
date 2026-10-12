import type { Job } from "@/lib/types";
import type { Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n";

/** Dagar mellan idag och ett datum. Negativt när datumet passerat. */
export function daysUntil(iso: string | undefined): number | null {
  if (!iso) return null;
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return null;
  const startOfDay = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.round((startOfDay(then) - startOfDay(new Date())) / 86_400_000);
}

/** "idag", "igår", "3 dagar sedan" — annars ett datum. */
export function publishedLabel(iso: string | undefined, locale: Locale): string | null {
  const diff = daysUntil(iso);
  if (diff === null) return null;
  const t = getDictionary(locale);
  const ago = -diff;
  if (ago <= 0) return t.today;
  if (ago === 1) return t.yesterday;
  if (ago <= 30) return `${ago} ${t.daysAgo}`;
  return formatDate(iso, locale);
}

export function formatDate(iso: string | undefined, locale: Locale): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(locale === "sv" ? "sv-SE" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === "sv" ? "sv-SE" : "en-GB").format(value);
}

/** Plats som en rad: "Göteborg" eller "Göteborg, Västra Götalands län". */
export function placeLabel(job: Job): string | null {
  if (job.municipality && job.region && !job.region.startsWith(job.municipality)) {
    return `${job.municipality}, ${job.region}`;
  }
  return job.municipality ?? job.region ?? job.country ?? null;
}

/**
 * Kort utdrag ur annonstexten. JobTech-beskrivningar börjar ofta med
 * företagspresentation och radbrytningar — vi plattar ut och kapar rent.
 */
export function excerpt(text: string, maxChars = 220): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= maxChars) return flat;
  const cut = flat.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 120 ? lastSpace : maxChars).trimEnd()}…`;
}
