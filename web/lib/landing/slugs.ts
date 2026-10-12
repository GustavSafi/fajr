import salaryData from "@/lib/scb/salaries.json";
import { MUNICIPALITIES } from "@/lib/jobtech/places";

/**
 * Adresserna till landningssidorna.
 *
 * `/lon/underskoterska` och `/lediga-jobb/goteborg` är sidor som ska leva i
 * flera år och samla auktoritet hos Google. Därför måste adressen vara stabil:
 * ändras den tappar sidan allt den byggt upp. Slugarna räknas ut deterministiskt
 * ur samma datafiler varje gång, så samma yrke får samma adress så länge SCB
 * inte byter namn på det.
 *
 * SCB:s yrkesnamn är långa ("Undersköterskor, hemtjänst, hemsjukvård och
 * äldreboende"). Vi tar första ledet, som är det folk faktiskt söker på, och
 * lägger bara till mer när två yrken annars skulle krocka.
 */

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/å|ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/é/g, "e")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface OccupationPage {
  ssyk: string;
  slug: string;
  /** Kort, läsbart namn för rubriker: "Undersköterskor". */
  name: string;
  /** SCB:s fullständiga benämning. */
  fullName: string;
  /** Det ord vi söker annonser på. Se searchTermFor. */
  searchTerm: string;
  /** Antal anställda i yrket i hela landet, enligt SCB. */
  headcount?: number;
  /** Yrken med samma förstaled delar grupp — se occupationSiblings. */
  group: string;
}

/**
 * Delar upp en SCB-benämning i dess led.
 *
 * Kommatecknet betyder två olika saker hos SCB. I "Undersköterskor, hemtjänst,
 * hemsjukvård" skiljer det led åt. I "General-, landstings- och
 * kommundirektörer" binder det ihop förled till ett och samma huvudord — delar
 * vi där får vi yrket "General-", vilket är precis vad som stod på sidan innan
 * den här funktionen fanns. Ett komma efter bindestreck delar alltså inte.
 */
function labelParts(fullName: string): string[] {
  return fullName
    .split(/(?<!-)\s*,\s*|\s*\/\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** "Soldater m.fl." → "Soldater". Bra i en rubrik, fel i en källhänvisning. */
function stripEtAl(value: string): string {
  return value.replace(/\s*\bm\.?\s*(fl|m)\.?\s*$/i, "").trim();
}

/** SCB delar chefsyrken i "nivå 1" (högre chefer) och "nivå 2" (mellanchefer). */
const LEVEL_SUFFIX = /\s*,\s*niv\u00e5\s*\d+\s*$/i;

/**
 * Vilket ord vi ska söka annonser på för ett yrke.
 *
 * SCB:s benämningar är beskrivande, inte sökbara: "Grundutbildade
 * sjuksköterskor" ger fyra träffar hos JobTech medan "sjuksköterskor" ger
 * nästan två tusen. Huvudordet står sist på svenska, så vi plockar det — men
 * i "Bagare och konditorer" vill vi ha det första ledet, inte det sista.
 */
export function searchTermFor(fullName: string): string {
  const segment = stripEtAl(labelParts(fullName)[0] ?? fullName).replace(LEVEL_SUFFIX, "");

  /*
   * "Driftchefer inom bygg, anläggning och gruva", "Lärare i yrkesämnen" —
   * allt efter "inom"/"i" är bransch eller ämne, inte yrke. Utan det här skulle
   * sidan om driftchefer söka på ordet "bygg".
   */
  const head = (segment.split(/\s+(?:inom|i)\s+/)[0] ?? segment).trim();

  /*
   * "Försäljnings- och marknadschefer", "Ljus-, ljud och scentekniker": leden
   * före "och" är bara förled, huvudordet står sist. Bindestrecket avslöjar dem.
   */
  const beforeAnd = (head.split(/\s+och\s+/)[0] ?? head).trim();
  const compound = /-\s*,/.test(head) || /-\s+och\b/.test(head) || beforeAnd.endsWith("-");

  const base = compound || beforeAnd.length < 4 ? head : beforeAnd;
  const words = base.split(/\s+/).filter(Boolean);
  const last = words[words.length - 1] ?? base;
  return last.replace(/[^\wåäöÅÄÖ-]/g, "");
}

interface SalaryFileShape {
  items?: Record<string, { label?: string; headcount?: number }>;
}

/** Yrken med för få anställda ger statistik vi inte vågar publicera. */
const MIN_HEADCOUNT = 500;

/** "Samtliga yrken" är SCB:s totalrad, inte ett yrke någon söker jobb inom. */
const EXCLUDED_SSYK = new Set(["0000"]);

interface Candidate {
  ssyk: string;
  fullName: string;
  headcount?: number;
}

/**
 * Yrken som delar förstaled hör ihop: "Butikssäljare, dagligvaror" och
 * "Butikssäljare, fackhandel" är två rader hos SCB men ett yrke i folkmun.
 */
function groupKey(fullName: string): string {
  return slugify(stripEtAl(labelParts(fullName.replace(LEVEL_SUFFIX, ""))[0] ?? fullName));
}

/**
 * Ett yrke, en sida.
 *
 * Chefsyrkena finns i två rader hos SCB, nivå 1 och nivå 2, och utan den här
 * hopslagningen blir det två sidor för samma yrke — där den med den fina
 * adressen godtyckligt visar den ena nivåns lön. Vi behåller den nivå som flest
 * människor faktiskt tillhör, och lönepanelen skriver ändå ut vilken rad
 * siffran kommer ifrån.
 */
function dedupeLevels(candidates: Candidate[]): { kept: Candidate[]; aliases: Map<string, string> } {
  const best = new Map<string, Candidate>();
  const members = new Map<string, string[]>();

  for (const c of candidates) {
    const key = c.fullName.replace(LEVEL_SUFFIX, "").toLowerCase();
    members.set(key, [...(members.get(key) ?? []), c.ssyk]);
    const current = best.get(key);
    if (!current || (c.headcount ?? 0) > (current.headcount ?? 0)) best.set(key, c);
  }

  const aliases = new Map<string, string>();
  for (const [key, ssyks] of members) {
    const winner = best.get(key);
    if (!winner) continue;
    for (const ssyk of ssyks) if (ssyk !== winner.ssyk) aliases.set(ssyk, winner.ssyk);
  }

  return { kept: [...best.values()].sort((a, b) => a.ssyk.localeCompare(b.ssyk)), aliases };
}

const LEVEL_ALIASES = new Map<string, string>();

function buildOccupations(): OccupationPage[] {
  const items = (salaryData as SalaryFileShape).items ?? {};

  const candidates: Candidate[] = [];
  // Stabil ordning: utan den kan två yrken byta slug mellan två bygg.
  for (const ssyk of Object.keys(items).sort()) {
    if (EXCLUDED_SSYK.has(ssyk)) continue;
    const entry = items[ssyk];
    const fullName = entry?.label?.trim();
    if (!fullName) continue;
    if (entry?.headcount !== undefined && entry.headcount < MIN_HEADCOUNT) continue;
    candidates.push({ ssyk, fullName, headcount: entry?.headcount });
  }

  const { kept, aliases } = dedupeLevels(candidates);
  for (const [from, to] of aliases) LEVEL_ALIASES.set(from, to);

  const pages: OccupationPage[] = [];
  const taken = new Map<string, string>();

  /*
   * "Butikssäljare, dagligvaror" och "Butikssäljare, fackhandel" heter båda
   * bara "Butikssäljare" i första ledet. Tog vi dem i tur och ordning skulle
   * den första lägga beslag på namnet och visa dagligvarulönen under rubriken
   * "Lön för Butikssäljare" — en siffra som gäller halva yrket. Delar två yrken
   * förstaled måste alltså båda breddas.
   */
  const members = new Map<string, Candidate[]>();
  for (const c of kept) {
    const key = groupKey(c.fullName);
    members.set(key, [...(members.get(key) ?? []), c]);
  }

  /*
   * Inom en grupp får det yrke flest människor har behålla det korta namnet.
   * "Undersköterskor, hemtjänst" är 120 000 personer och "Undersköterskor,
   * vård- och specialavdelning" betydligt färre — den som googlar
   * "undersköterska lön" ska landa på den första, och lönepanelen skriver ändå
   * ut exakt vilken SCB-rad siffran kommer ifrån.
   */
  const winner = new Map<string, string>();
  for (const [key, group] of members) {
    const best = [...group].sort(
      (a, b) => (b.headcount ?? 0) - (a.headcount ?? 0) || a.ssyk.localeCompare(b.ssyk),
    )[0];
    if (best) winner.set(key, best.ssyk);
  }

  for (const { ssyk, fullName, headcount } of kept) {
    // "Undersköterskor, hemtjänst, …" → ["Undersköterskor", "hemtjänst", …]
    const parts = labelParts(fullName.replace(LEVEL_SUFFIX, ""));
    const key = groupKey(fullName);
    const ambiguous =
      (members.get(key)?.length ?? 0) > 1 && winner.get(key) !== ssyk && parts.length > 1;

    let slug = "";
    let name = parts[0] ?? fullName;
    for (let depth = ambiguous ? 2 : 1; depth <= parts.length; depth++) {
      const candidate = slugify(stripEtAl(parts.slice(0, depth).join(" ")));
      if (!taken.has(candidate)) {
        slug = candidate;
        name = parts.slice(0, depth).join(", ");
        break;
      }
    }
    // Krockar allt är SSYK-koden sista utvägen — ful men unik.
    if (!slug) slug = `${slugify(parts[0] ?? fullName)}-${ssyk}`;

    taken.set(slug, ssyk);
    pages.push({
      ssyk,
      slug,
      name: stripEtAl(name),
      fullName,
      searchTerm: searchTermFor(fullName),
      group: key,
      ...(headcount !== undefined ? { headcount } : {}),
    });
  }

  return pages;
}

export const OCCUPATION_PAGES: OccupationPage[] = buildOccupations();

const BY_SLUG = new Map(OCCUPATION_PAGES.map((p) => [p.slug, p]));
const BY_SSYK = new Map(OCCUPATION_PAGES.map((p) => [p.ssyk, p]));

// En annons klassad som "nivå 1" ska hitta fram till sidan även när vi behållit
// nivå 2 — annars tappar kommunsidorna hälften av chefsyrkena.
for (const [from, to] of LEVEL_ALIASES) {
  const page = BY_SSYK.get(to);
  if (page && !BY_SSYK.has(from)) BY_SSYK.set(from, page);
}

/**
 * Yrkena flest människor har. Används till korslänkarna: en länklista som
 * börjar med "Officerare" är alfabetiskt korrekt och fullständigt oanvändbar.
 */
export const POPULAR_OCCUPATIONS: OccupationPage[] = [...OCCUPATION_PAGES].sort(
  (a, b) => (b.headcount ?? 0) - (a.headcount ?? 0),
);

export function occupationBySlug(slug: string): OccupationPage | null {
  return BY_SLUG.get(slug) ?? null;
}

/**
 * De andra SCB-raderna för samma yrke. Sidan om undersköterskor i hemtjänsten
 * ska kunna säga "undersköterskor på vårdavdelning tjänar så här mycket" —
 * annars ser det ut som om vi påstår att yrket har en enda lön.
 */
export function occupationSiblings(page: OccupationPage): OccupationPage[] {
  return OCCUPATION_PAGES.filter((p) => p.group === page.group && p.ssyk !== page.ssyk);
}

export function occupationBySsyk(ssyk: string | undefined): OccupationPage | null {
  return ssyk ? (BY_SSYK.get(ssyk) ?? null) : null;
}

export interface MunicipalityPage {
  id: string;
  slug: string;
  name: string;
}

function buildMunicipalities(): MunicipalityPage[] {
  const taken = new Set<string>();
  const pages: MunicipalityPage[] = [];

  for (const m of [...MUNICIPALITIES].sort((a, b) => a.label.localeCompare(b.label, "sv"))) {
    let slug = slugify(m.label);
    // Två kommuner kan slugifieras lika (Malung-Sälen m.fl. är unika, men
    // regeln kostar inget och skyddar mot framtida namnändringar).
    if (taken.has(slug)) slug = `${slug}-kommun`;
    if (taken.has(slug)) continue;
    taken.add(slug);
    pages.push({ id: m.id, slug, name: m.label });
  }

  return pages;
}

export const MUNICIPALITY_PAGES: MunicipalityPage[] = buildMunicipalities();

const MUNICIPALITY_BY_SLUG = new Map(MUNICIPALITY_PAGES.map((p) => [p.slug, p]));

export function municipalityBySlug(slug: string): MunicipalityPage | null {
  return MUNICIPALITY_BY_SLUG.get(slug) ?? null;
}

/**
 * Kommunerna som hör hemma i sidfoten.
 *
 * Folkmängd, inte annonsvolym: listan ska se likadan ut i augusti som i
 * januari. En sidfot som byter länkar varje gång Platsbanken andas är precis
 * den sortens instabilitet Google tolkar som brus.
 */
const MAJOR_MUNICIPALITY_SLUGS = [
  "stockholm",
  "goteborg",
  "malmo",
  "uppsala",
  "linkoping",
  "vasteras",
  "orebro",
  "helsingborg",
  "norrkoping",
  "jonkoping",
  "umea",
  "lund",
];

export const MAJOR_MUNICIPALITIES: MunicipalityPage[] = MAJOR_MUNICIPALITY_SLUGS.map((slug) =>
  municipalityBySlug(slug),
).filter((p): p is MunicipalityPage => p !== null);
