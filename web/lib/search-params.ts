import type { SearchParams, SortOrder } from "@/lib/types";

/**
 * URL:en är sökningens enda tillstånd. Allt filtrering går genom vanliga
 * länkar, vilket ger fungerande bakåtknapp, delbara sökningar och sidor som
 * Google kan indexera — och gör att sidan fungerar utan JavaScript.
 */

export type RawSearchParams = Record<string, string | string[] | undefined>;

function list(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const items = Array.isArray(value) ? value : value.split(",");
  return items.map((v) => v.trim()).filter(Boolean);
}

function flag(value: string | string[] | undefined): boolean {
  const v = Array.isArray(value) ? value[0] : value;
  return v === "1" || v === "true";
}

const SORTS: SortOrder[] = ["relevance", "newest", "deadline", "match"];
const PUBLISHED_WINDOWS = [1, 7, 30];

export function parseSearchParams(raw: RawSearchParams): SearchParams {
  const params: SearchParams = {};

  const q = Array.isArray(raw.q) ? raw.q[0] : raw.q;
  if (q?.trim()) params.q = q.trim().slice(0, 120);

  const municipality = list(raw.kommun);
  if (municipality.length) params.municipality = municipality;

  const region = list(raw.lan);
  if (region.length) params.region = region;

  const field = list(raw.omrade);
  if (field.length) params.occupationField = field;

  if (flag(raw.distans)) params.remote = true;
  if (flag(raw.deltid)) params.partTime = true;
  if (flag(raw.nyborjare)) params.noExperience = true;

  const days = Number(Array.isArray(raw.dagar) ? raw.dagar[0] : raw.dagar);
  if (PUBLISHED_WINDOWS.includes(days)) params.publishedWithinDays = days;

  const sort = Array.isArray(raw.sortera) ? raw.sortera[0] : raw.sortera;
  if (sort && (SORTS as string[]).includes(sort)) params.sort = sort as SortOrder;

  const page = Number(Array.isArray(raw.sida) ? raw.sida[0] : raw.sida);
  if (Number.isFinite(page) && page > 1) params.page = Math.min(Math.floor(page), 101);

  return params;
}

/** Serialiserar tillbaka till en query-sträng. Tomma värden utelämnas helt. */
export function toQueryString(params: SearchParams): string {
  const sp = new URLSearchParams();

  if (params.q) sp.set("q", params.q);
  if (params.municipality?.length) sp.set("kommun", params.municipality.join(","));
  if (params.region?.length) sp.set("lan", params.region.join(","));
  if (params.occupationField?.length) sp.set("omrade", params.occupationField.join(","));
  if (params.remote) sp.set("distans", "1");
  if (params.partTime) sp.set("deltid", "1");
  if (params.noExperience) sp.set("nyborjare", "1");
  if (params.publishedWithinDays) sp.set("dagar", String(params.publishedWithinDays));
  if (params.sort && params.sort !== "relevance") sp.set("sortera", params.sort);
  if (params.page && params.page > 1) sp.set("sida", String(params.page));

  const s = sp.toString();
  return s ? `?${s}` : "";
}

/** Slår på eller av ett värde i en flervalslista och nollställer sidnumret. */
export function toggleValue(
  params: SearchParams,
  key: "municipality" | "occupationField" | "region",
  value: string,
): SearchParams {
  const current = params[key] ?? [];
  const next = current.includes(value)
    ? current.filter((v) => v !== value)
    : [...current, value];
  const updated: SearchParams = { ...params, page: 1 };
  if (next.length) updated[key] = next;
  else delete updated[key];
  return updated;
}

/** Slår på eller av ett ja/nej-filter och nollställer sidnumret. */
export function toggleFlag(
  params: SearchParams,
  key: "remote" | "partTime" | "noExperience",
): SearchParams {
  const updated: SearchParams = { ...params, page: 1 };
  if (params[key]) delete updated[key];
  else updated[key] = true;
  return updated;
}

export function withPage(params: SearchParams, page: number): SearchParams {
  return { ...params, page };
}

export function countActiveFilters(params: SearchParams): number {
  return (
    (params.municipality?.length ?? 0) +
    (params.region?.length ?? 0) +
    (params.occupationField?.length ?? 0) +
    (params.remote ? 1 : 0) +
    (params.partTime ? 1 : 0) +
    (params.noExperience ? 1 : 0) +
    (params.publishedWithinDays ? 1 : 0)
  );
}

/**
 * Tar bort exakta dubbletter ur en resultatsida.
 *
 * Bemanningsföretag lägger regelbundet upp samma annons flera gånger, och då
 * står den två gånger i rad i listan. Vi slår bara ihop när titel, arbetsgivare
 * och kommun är identiska — samma tjänst i olika orter är två riktiga jobb och
 * ska stå kvar var för sig.
 *
 * Bara inom den sida vi visar. Att avdubblera över hela träffmängden kräver den
 * egna databasen; det här löser det man faktiskt ser.
 */
export function dedupeJobs<T extends { headline: string; employer?: string; municipality?: string }>(
  jobs: T[],
): T[] {
  const seen = new Set<string>();
  return jobs.filter((job) => {
    const key = [job.headline, job.employer ?? "", job.municipality ?? ""]
      .join("|")
      .toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
