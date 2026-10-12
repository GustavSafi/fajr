import { NextResponse, type NextRequest } from "next/server";

/**
 * Förslag medan man skriver.
 *
 * Går mot JobTechs `/complete`, som rankar efter hur ofta ordet faktiskt
 * förekommer i annonserna. Det är precis rätt beteende: skriver man bara "s"
 * kommer de vanligaste orden, och ju mer man skriver desto snävare blir det.
 * Vi behöver alltså ingen egen popularitetslista — annonserna är listan.
 *
 * Varför en egen route och inte ett anrop direkt från webbläsaren: vi slipper
 * CORS, vi kan filtrera på typ (yrken för ett fält, kunskaper för ett annat),
 * och svaren cachas så att varje tangenttryck inte blir ett anrop till
 * Arbetsförmedlingen.
 */

const BASE = (process.env.JOBTECH_BASE_URL ?? "https://jobsearch.api.jobtechdev.se").replace(
  /\/$/,
  "",
);

const ALLOWED_TYPES = new Set(["occupation", "skill", "location"]);

/**
 * Samma ord i olika böjning är samma förslag.
 *
 * JobTech föreslår "undersköterska", "undersköterskor" och "undersköterskan"
 * som tre rader, för så står det i annonserna. För den som skriver är det en
 * rad som upprepas tre gånger och tränger undan de riktiga alternativen. Vi
 * skalar av svenska ändelsevokaler och -konsonanter och behåller den form som
 * API:et rankat högst.
 *
 * Avsiktligt försiktig: två ord slås ihop bara om stammen är minst tre tecken
 * och längdskillnaden högst två. Det är längdskillnaden som gör jobbet —
 * utan den skulle "sälj" och "säljare" smälta samman, och det är två olika
 * saker att söka på.
 */
function stem(value: string): string {
  return value.toLowerCase().replace(/[aenor]+$/u, "");
}

function dropInflections(values: string[]): string[] {
  const kept: string[] = [];
  for (const value of values) {
    const key = stem(value);
    const duplicate =
      key.length >= 3 &&
      kept.some((k) => stem(k) === key && Math.abs(k.length - value.length) <= 2);
    if (!duplicate) kept.push(value);
  }
  return kept;
}

interface TypeaheadItem {
  value?: string;
  type?: string;
  occurrences?: number;
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const type = request.nextUrl.searchParams.get("type") ?? "";

  // Ett tecken räcker för att börja föreslå, men tomt ger inget.
  if (query.length < 1) return NextResponse.json({ suggestions: [] });

  const url = new URL(`${BASE}/complete`);
  url.searchParams.set("q", query.slice(0, 60));
  // Vi hämtar fler än vi visar, eftersom en del filtreras bort på typ.
  url.searchParams.set("limit", "30");

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 * 60 * 24 },
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return NextResponse.json({ suggestions: [] });

    const data = (await res.json()) as { typeahead?: TypeaheadItem[] };
    const wanted = ALLOWED_TYPES.has(type) ? type : null;

    const seen = new Set<string>();
    const deduped = (data.typeahead ?? [])
      .filter((item) => item.value && (!wanted || item.type === wanted))
      .map((item) => item.value!.trim())
      .filter((value) => {
        const key = value.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    const suggestions = dropInflections(deduped).slice(0, 8);

    return NextResponse.json(
      { suggestions },
      { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } },
    );
  } catch {
    // Förslag är en bekvämlighet. Går de inte att hämta skriver man bara själv.
    return NextResponse.json({ suggestions: [] });
  }
}
