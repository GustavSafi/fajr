import data from "./salaries.json";
import { inferSector, type SectorCode } from "./sector";

/**
 * Lönestatistik per yrke från SCB:s lönestrukturstatistik (AM0110).
 *
 * Nyckeln är den fyrsiffriga SSYK-koden, som vi får ur JobTech-annonsens
 * `occupation_group.legacy_ams_taxonomy_id`. Samma kodverk i båda källorna —
 * det är hela anledningen till att kopplingen går att göra.
 *
 * Filen genereras av `npm run loner` och innehåller tre saker per yrke:
 * spridning per sektor, genomsnittslön per åldersband, och antal anställda.
 */

export interface SalarySpread {
  mean?: number;
  median?: number;
  p10?: number;
  p25?: number;
  p75?: number;
  p90?: number;
}

export interface SalaryEntry {
  label: string;
  sectors: Partial<Record<SectorCode, SalarySpread>>;
  /** Genomsnittlig månadslön per åldersband, t.ex. "18-24". */
  ages?: Record<string, number>;
  /** Ungefärligt antal anställda i yrket, summerat över åldersbanden. */
  headcount?: number;
}

export interface SalaryResult extends SalarySpread {
  ssyk: string;
  year: string;
  label: string;
  /** Vilken sektor siffrorna gäller. "0" betyder samtliga. */
  sector: SectorCode;
  /** Genomsnittslön för 18–24-åringar — den riktiga ingångslönen. */
  entrySalary?: number;
  ages?: Record<string, number>;
  headcount?: number;
}

interface SalaryFile {
  generatedAt: string | null;
  year: string | null;
  items: Record<string, SalaryEntry>;
}

const file = data as unknown as SalaryFile;

export const SALARY_YEAR = file.year;
export const AGE_BANDS = ["18-24", "25-34", "35-44", "45-54", "55-64"] as const;

/**
 * Ett yrke med väldigt få anställda ger opålitliga siffror. SCB döljer de
 * värsta fallen själv, men vi sätter en egen undre gräns också — hellre ingen
 * lön än en som bygger på en handfull personer.
 */
const MIN_HEADCOUNT = 500;

const MEASURES = {
  mean: "000007CD",
  median: "000007CE",
  p10: "000007CF",
  p25: "000007CG",
  p75: "000007CH",
  p90: "000007CI",
} as const;

const SCB_TABLE_URL =
  process.env.SCB_TABLE_URL ??
  "https://api.scb.se/OV0104/v1/doris/sv/ssd/AM/AM0110/AM0110A/LoneSpridSektYrk4AN";

interface PxWebResponse {
  data?: Array<{ key?: string[]; values?: string[] }>;
}

function toNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}


/**
 * Hämtar spridningen för en sektor ur en post.
 *
 * Klarar även den äldre filen där varje yrke var en platt post utan sektorer —
 * då finns bara "samtliga sektorer", vilket är precis vad den filen innehöll.
 * Så sajten fungerar även innan `npm run loner` körts om.
 */
function spreadFor(entry: SalaryEntry, sector: SectorCode): SalarySpread | undefined {
  if (entry.sectors) return entry.sectors[sector] ?? entry.sectors["0"];
  const legacy = entry as unknown as SalarySpread;
  return legacy.median !== undefined || legacy.mean !== undefined ? legacy : undefined;
}

/**
 * Reserv när den genererade filen saknas: hämtar ett yrke live från SCB.
 * Ger bara samtliga sektorer och inga åldersband — kör `npm run loner` för
 * den fulla bilden.
 */
async function fetchLive(ssyk: string): Promise<SalaryResult | null> {
  const year = file.year ?? "2025";
  try {
    const res = await fetch(SCB_TABLE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: [
          { code: "Sektor", selection: { filter: "item", values: ["0"] } },
          { code: "Yrke2012", selection: { filter: "item", values: [ssyk] } },
          { code: "Kon", selection: { filter: "item", values: ["1+2"] } },
          { code: "ContentsCode", selection: { filter: "item", values: Object.values(MEASURES) } },
          { code: "Tid", selection: { filter: "item", values: [year] } },
        ],
        response: { format: "json" },
      }),
      next: { revalidate: 60 * 60 * 24 * 30 },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;

    const json = (await res.json()) as PxWebResponse;
    const row = json.data?.[0];
    if (!row?.values) return null;

    const spread: SalarySpread = {};
    (Object.keys(MEASURES) as Array<keyof typeof MEASURES>).forEach((key, i) => {
      const n = toNumber(row.values?.[i]);
      if (n !== undefined) spread[key] = n;
    });
    if (spread.median === undefined && spread.mean === undefined) return null;

    return { ...spread, ssyk, year, label: "", sector: "0" };
  } catch {
    return null;
  }
}

/**
 * Slår upp lönestatistik för en yrkeskod.
 *
 * Kan vi avgöra arbetsgivarens sektor och SCB har siffror för den, använder vi
 * dem — en undersköterska i en kommun ska jämföras med kommunal sektor, inte
 * med alla sektorer blandat. Annars faller vi tillbaka på samtliga sektorer,
 * vilket alltid är ett korrekt svar.
 */
export async function getSalary(
  ssyk: string | undefined,
  employer?: string,
): Promise<SalaryResult | null> {
  if (!ssyk || !/^\d{4}$/.test(ssyk)) return null;

  const entry = file.items?.[ssyk];
  if (!entry || !file.year) return fetchLive(ssyk);

  if (entry.headcount !== undefined && entry.headcount < MIN_HEADCOUNT) return null;

  const guessed = inferSector(employer);
  const sector: SectorCode = guessed && entry.sectors?.[guessed] ? guessed : "0";
  const spread = spreadFor(entry, sector);
  if (!spread) return null;

  const result: SalaryResult = {
    ...spread,
    ssyk,
    year: file.year,
    label: entry.label,
    sector,
  };

  if (entry.ages) {
    result.ages = entry.ages;
    const entrySalary = entry.ages["18-24"];
    if (entrySalary !== undefined) result.entrySalary = entrySalary;
  }
  if (entry.headcount !== undefined) result.headcount = entry.headcount;

  return result;
}

/**
 * Snabb uppslagning för jobbkorten i träfflistan. Synkron, läser bara filen,
 * och ger bara medianen — inga nätverksanrop, så den kan köras på varje kort
 * i en lista utan att kosta något.
 */
export function medianFor(ssyk: string | undefined, employer?: string): number | null {
  if (!ssyk || !/^\d{4}$/.test(ssyk)) return null;

  const entry = file.items?.[ssyk];
  if (!entry) return null;
  if (entry.headcount !== undefined && entry.headcount < MIN_HEADCOUNT) return null;

  const guessed = inferSector(employer);
  const sector: SectorCode = guessed && entry.sectors?.[guessed] ? guessed : "0";
  const spread = spreadFor(entry, sector);
  return spread?.median ?? spread?.mean ?? null;
}

export interface SectorBreakdown {
  sector: SectorCode;
  median?: number;
  mean?: number;
  p10?: number;
  p90?: number;
}

/**
 * Lönen per sektor för ett yrke. Används på lönesidorna, där jämförelsen
 * mellan kommunal, statlig och privat är det innehåll ingen annan har.
 *
 * "Samtliga sektorer" utelämnas — den står redan som huvudsiffra ovanför, och
 * att upprepa den i tabellen gör bara jämförelsen svårare att läsa.
 */
export function sectorBreakdown(ssyk: string | undefined): SectorBreakdown[] {
  if (!ssyk) return [];
  const entry = file.items?.[ssyk];
  if (!entry?.sectors) return [];

  const order: SectorCode[] = ["2", "3", "1", "4-5"];
  const out: SectorBreakdown[] = [];

  for (const sector of order) {
    const spread = entry.sectors[sector];
    if (!spread) continue;
    if (spread.median === undefined && spread.mean === undefined) continue;
    out.push({ sector, ...spread });
  }

  // En ensam sektor är ingen jämförelse.
  return out.length >= 2 ? out : [];
}
