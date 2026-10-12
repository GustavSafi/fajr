import type { Facet, Job, SearchParams, SearchResult } from "@/lib/types";
import type { JobTechHit, JobTechResponse } from "./raw";
import { toJob } from "./map";
import { isMockMode, mockAd, mockSearch } from "./mock";

/**
 * Klient mot JobTech JobSearch (Arbetsförmedlingens öppna annonsdata).
 *
 * Porterad från CLI-projektets `src/apis/jobtech.ts` och utökad med filter,
 * paginering, sortering och facetter. Ingen nyckel krävs; `JOBTECH_API_KEY`
 * stöds ifall Arbetsförmedlingen inför en i framtiden.
 *
 * Klienten kastar aldrig. Går sökningen fel returneras ett tomt resultat med
 * `failed: true`, så att sidan kan visa ett vänligt fel i stället för att krascha.
 */

const BASE_URL = (process.env.JOBTECH_BASE_URL ?? "https://jobsearch.api.jobtechdev.se").replace(
  /\/$/,
  "",
);

/**
 * Arkivet med borttagna annonser — 8,2 miljoner stycken tillbaka till 2016.
 * Samma fältnamn som det publika API:et, så samma mappning fungerar.
 */
const ARCHIVE_URL = (
  process.env.JOBTECH_HISTORICAL_URL ?? "https://historical.api.jobtechdev.se"
).replace(/\/$/, "");

export const PAGE_SIZE = 20;

/** API:et låter oss bläddra som mest hit, oavsett hur många träffar som finns. */
const MAX_OFFSET = 2000;

function headers(): HeadersInit {
  const key = process.env.JOBTECH_API_KEY;
  return key ? { "api-key": key, Accept: "application/json" } : { Accept: "application/json" };
}

const SORT_PARAM: Record<NonNullable<SearchParams["sort"]>, string | undefined> = {
  relevance: undefined,
  newest: "pubdate-desc",
  deadline: "applydate-asc",
  // Matchning rankar vi själva — API:et ska leverera på relevans.
  match: undefined,
};

function isoDaysAgo(days: number): string {
  const d = new Date(Date.now() - days * 86_400_000);
  // API:et vill ha sekundprecision utan millisekunder eller tidszon.
  return d.toISOString().slice(0, 19);
}

function buildUrl(params: SearchParams, opts: { withStats: boolean; limit?: number }): URL {
  const url = new URL(`${BASE_URL}/search`);
  const set = url.searchParams;

  if (params.q?.trim()) set.set("q", params.q.trim());

  for (const id of params.municipality ?? []) set.append("municipality", id);
  for (const id of params.region ?? []) set.append("region", id);
  for (const id of params.occupationField ?? []) set.append("occupation-field", id);
  for (const id of params.occupation ?? []) set.append("occupation-name", id);

  if (params.remote) set.set("remote", "true");
  if (params.partTime) {
    // Allt under heltid räknas som deltid.
    set.set("parttime.max", "99");
  }
  if (params.noExperience) set.set("experience", "false");
  if (params.publishedWithinDays) {
    set.set("published-after", isoDaysAgo(params.publishedWithinDays));
  }

  const sort = SORT_PARAM[params.sort ?? "relevance"];
  if (sort) set.set("sort", sort);

  const limit = Math.min(opts.limit ?? PAGE_SIZE, 100);
  const page = Math.max(1, params.page ?? 1);
  const offset = opts.limit ? 0 : Math.min((page - 1) * PAGE_SIZE, MAX_OFFSET);
  set.set("offset", String(offset));
  set.set("limit", String(limit));

  if (opts.withStats) {
    set.append("stats", "municipality");
    set.append("stats", "occupation-field");
    set.set("stats.limit", "30");
  }

  return url;
}

function facetsFrom(data: JobTechResponse, type: string): Facet[] {
  const stat = (data.stats ?? []).find((s) => s.type === type);

  /*
   * API:et kan lista samma concept_id två gånger (samma kommun under olika
   * termer). Vi slår ihop dem i stället för att rendera dubbletter — React
   * kräver unika nycklar, och användaren ska inte se Stockholm två gånger.
   */
  const merged = new Map<string, Facet>();
  for (const v of stat?.values ?? []) {
    const id = v.concept_id ?? v.code ?? v.term ?? "";
    const label = v.term ?? "";
    const count = v.count ?? 0;
    if (!id || !label || count <= 0) continue;

    const existing = merged.get(id);
    if (existing) existing.count += count;
    else merged.set(id, { id, label, count });
  }

  return [...merged.values()].sort((a, b) => b.count - a.count);
}

async function getJson(url: URL, revalidate: number): Promise<JobTechResponse | null> {
  if (isMockMode()) return mockSearch(url.searchParams.get("q") ?? undefined);

  try {
    const res = await fetch(url, {
      headers: headers(),
      next: { revalidate },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) {
      console.warn(`JobTech svarade ${res.status} på ${url.pathname}`);
      return null;
    }
    return (await res.json()) as JobTechResponse;
  } catch (err) {
    console.warn(`JobTech-anrop misslyckades: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

/**
 * `poolSize` hämtar fler träffar än en sida rymmer. Används av
 * matchningssorteringen: för att kunna ranka måste vi ha något att ranka
 * bland, och API:et ger som mest 100 i ett svar.
 */
export async function searchJobs(
  params: SearchParams,
  poolSize?: number,
): Promise<SearchResult> {
  const page = Math.max(1, params.page ?? 1);
  const url = buildUrl(params, { withStats: true, ...(poolSize ? { limit: poolSize } : {}) });
  const data = await getJson(url, 300);

  if (!data) {
    return {
      jobs: [],
      total: 0,
      reachable: 0,
      page,
      pageSize: PAGE_SIZE,
      facets: { municipality: [], occupationField: [] },
      failed: true,
    };
  }

  const total = data.total?.value ?? 0;
  return {
    jobs: (data.hits ?? []).map(toJob),
    total,
    reachable: Math.min(total, MAX_OFFSET + PAGE_SIZE),
    page,
    pageSize: PAGE_SIZE,
    facets: {
      municipality: facetsFrom(data, "municipality"),
      occupationField: facetsFrom(data, "occupation-field"),
    },
  };
}

async function getAd(base: string, id: string, revalidate: number): Promise<JobTechHit | null> {
  try {
    const res = await fetch(`${base}/ad/${encodeURIComponent(id)}`, {
      headers: headers(),
      next: { revalidate },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const hit = (await res.json()) as JobTechHit;
    return hit?.id ? hit : null;
  } catch {
    return null;
  }
}

/**
 * Hämtar en enskild annons — först bland de aktiva, sedan ur arkivet.
 *
 * Annonser försvinner ur Platsbanken när de gått ut, och då skulle vår sida bli
 * en återvändsgränd för alla som kommer från Google eller en delad länk. I
 * stället visar vi annonsen som den såg ut, tydligt märkt som stängd, och låter
 * sidan peka vidare till liknande jobb som faktiskt går att söka.
 *
 * Arkiverade annonser markeras `noindex` på sidan — de ska inte konkurrera med
 * aktiva annonser i sökresultaten, bara finnas kvar för den som redan har länken.
 */
export async function getJob(id: string): Promise<Job | null> {
  if (isMockMode()) {
    const hit = mockAd(id);
    return hit ? toJob(hit) : null;
  }

  const live = await getAd(BASE_URL, id, 1800);
  if (live) return toJob(live);

  const archived = await getAd(ARCHIVE_URL, id, 60 * 60 * 24 * 7);
  if (!archived) return null;

  // Arkivet svarar inte alltid med removed-flaggan, men allt som ligger där är
  // per definition borttaget.
  return { ...toJob({ ...archived, removed: true }), archived: true };
}

/**
 * Slår upp en ort mot API:ets egna kommunfacetter för den aktuella sökningen.
 *
 * Finns som reserv när taxonomifilen inte är genererad: då kan vi ändå
 * översätta "Göteborg" till rätt concept_id utan en egen ortlista. API:et ger
 * som mest 30 facetter, så en liten kommun med få träffar kan falla utanför —
 * kör `npm run taxonomy` för att få exakt uppslagning för alla 290.
 */
export async function lookupMunicipality(
  params: SearchParams,
  name: string,
): Promise<{ id: string; label: string } | null> {
  const needle = name.trim().toLowerCase();
  if (!needle) return null;

  const url = buildUrl({ ...params, page: 1 }, { withStats: true });
  // API:et tillåter som mest 30 facetter — fler ger 400.
  url.searchParams.set("stats.limit", "30");

  const data = await getJson(url, 900);
  if (!data) return null;

  const facets = facetsFrom(data, "municipality");
  const exact = facets.find((f) => f.label.toLowerCase() === needle);
  if (exact) return { id: exact.id, label: exact.label };

  const prefixed = facets.filter((f) => f.label.toLowerCase().startsWith(needle));
  return prefixed.length === 1 ? { id: prefixed[0]!.id, label: prefixed[0]!.label } : null;
}

/**
 * Liknande jobb. Vi går från snävt till brett: samma yrke i samma kommun är
 * bäst, samma yrke någon annanstans är näst bäst, och först därefter faller vi
 * tillbaka på hela yrkesområdet — annars föreslås sjuksköterskejobb till den
 * som tittar på en undersköterskeannons.
 */
export async function relatedJobs(job: Job, limit = 6): Promise<Job[]> {
  const attempts: SearchParams[] = [];

  if (job.occupationId && job.municipalityId) {
    attempts.push({ occupation: [job.occupationId], municipality: [job.municipalityId] });
  }
  if (job.occupationId) attempts.push({ occupation: [job.occupationId] });
  if (job.occupationFieldId && job.municipalityId) {
    attempts.push({
      occupationField: [job.occupationFieldId],
      municipality: [job.municipalityId],
    });
  }
  if (attempts.length === 0) attempts.push({ q: job.headline });

  for (const attempt of attempts) {
    const url = buildUrl({ ...attempt, page: 1, sort: "newest" }, { withStats: false });
    const data = await getJson(url, 900);
    const jobs = (data?.hits ?? [])
      .map(toJob)
      .filter((j) => j.externalId !== job.externalId)
      .slice(0, limit);

    // Ett ensamt förslag är sällan värt en rubrik — gå vidare och sök bredare.
    if (jobs.length >= 2) return jobs;
  }

  return [];
}
