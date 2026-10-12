import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { fill, getDictionary, isLocale, path, type Locale } from "@/lib/i18n";
import { formatNumber } from "@/lib/format";
import { PAGE_SIZE, lookupMunicipality, searchJobs } from "@/lib/jobtech/client";
import { findMunicipality, municipalityLabel } from "@/lib/jobtech/places";
import {
  dedupeJobs,
  parseSearchParams,
  toQueryString,
  type RawSearchParams,
} from "@/lib/search-params";
import type { SearchParams, SortOrder } from "@/lib/types";
import { SearchForm } from "@/components/search-form";
import { FilterPanel } from "@/components/filter-panel";
import { JobCard } from "@/components/job-card";
import { Pagination } from "@/components/pagination";
import { PROFILE_COOKIE, hasProfile, parseProfileCookie } from "@/lib/matching/profile";
import { isScoreTrustworthy, scoreJob, type MatchResult } from "@/lib/matching/score";

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<RawSearchParams>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "sv";
  const t = getDictionary(locale);
  const raw = await searchParams;
  const q = typeof raw.q === "string" ? raw.q : undefined;
  const place = typeof raw.plats === "string" ? raw.plats : undefined;

  const parts = [q, place].filter(Boolean).join(" · ");
  return {
    title: parts ? `${parts} — ${t.searchTitle}` : t.searchTitle,
    description: t.heroBody,
  };
}

/** Sorteringsval som länkar, så att valet syns i URL:en. */
function SortLinks({
  params,
  locale,
  withMatch,
}: {
  params: SearchParams;
  locale: Locale;
  withMatch: boolean;
}) {
  const t = getDictionary(locale);
  const options: Array<{ value: SortOrder; label: string }> = [
    ...(withMatch ? [{ value: "match" as SortOrder, label: t.sortMatch }] : []),
    { value: "relevance", label: t.sortRelevance },
    { value: "newest", label: t.sortNewest },
    { value: "deadline", label: t.sortDeadline },
  ];
  const current = params.sort ?? "relevance";

  return (
    <div className="flex items-center gap-1 text-[13.5px]">
      <span className="mr-1 text-ink-mute">{t.sortLabel}</span>
      {options.map((o) => {
        const active = current === o.value;
        const next: SearchParams = { ...params, sort: o.value, page: 1 };
        return (
          <Link
            key={o.value}
            href={path(locale, `/jobb${toQueryString(next)}`)}
            aria-current={active ? "true" : undefined}
            className={`rounded-md px-2.5 py-1 transition-colors ${
              active ? "bg-brand-wash font-medium text-brand" : "text-ink-soft hover:bg-sunk"
            }`}
          >
            {o.label}
          </Link>
        );
      })}
    </div>
  );
}

export default async function SearchPage({ params, searchParams }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);

  const raw = await searchParams;
  const parsed = parseSearchParams(raw);

  /*
   * "Var?"-fältet skickar fritext i `plats`. Kan vi slå upp den mot taxonomin
   * skriver vi om till en kanonisk adress med kommun-id — då blir filtret exakt
   * och URL:en delbar. Hittar vi inget lägger vi orten i sökordet i stället,
   * vilket ger sämre precision men aldrig noll träffar av fel anledning.
   */
  const placeInput = typeof raw.plats === "string" ? raw.plats.trim() : "";
  if (placeInput) {
    // Först taxonomifilen (snabb, ingen nätverkstrafik), sedan API:ets egna
    // facetter som reserv om filen inte är genererad.
    const match =
      findMunicipality(placeInput) ?? (await lookupMunicipality(parsed, placeInput));

    const next: SearchParams = { ...parsed, page: 1 };
    if (match) {
      next.municipality = [...new Set([...(parsed.municipality ?? []), match.id])];
    } else {
      next.q = [parsed.q, placeInput].filter(Boolean).join(" ");
    }
    redirect(path(lang, `/jobb${toQueryString(next)}`));
  }

  /*
   * Profilen ligger i en cookie, inte i en databas — matchningen fungerar
   * utan konto. Serverkomponenten läser den och rankar här, så ingen
   * profildata behöver skickas till klienten eller sparas hos oss.
   */
  const store = await cookies();
  const profile = parseProfileCookie(store.get(PROFILE_COOKIE)?.value);
  const matching = hasProfile(profile);
  const matchSort = matching && parsed.sort === "match";

  /*
   * För att kunna ranka måste vi ha något att ranka bland. I matchningsläge
   * hämtar vi därför API:ets 100 mest relevanta och sorterar om dem själva,
   * i stället för att ranka de 20 som råkade hamna på sidan.
   */
  const POOL = 100;
  const result = await searchJobs(parsed, matchSort ? POOL : undefined);
  let jobs = dedupeJobs(result.jobs);

  const matches = new Map<string, MatchResult>();
  if (matching) {
    for (const job of jobs) {
      const match = scoreJob(profile, job, lang);
      // En poäng som vilar på en enda dimension säger inget — då visar vi ingen.
      if (isScoreTrustworthy(match)) matches.set(job.id, match);
    }
  }

  if (matchSort) {
    jobs = [...jobs]
      .sort((a, b) => (matches.get(b.id)?.score ?? -1) - (matches.get(a.id)?.score ?? -1))
      .slice(0, PAGE_SIZE);
  }

  const totalPages = matchSort ? 1 : Math.max(1, Math.ceil(result.reachable / PAGE_SIZE));
  const page = Math.min(result.page, totalPages);

  const selectedPlaces = (parsed.municipality ?? [])
    .map((id) => municipalityLabel(id) ?? result.facets.municipality.find((f) => f.id === id)?.label)
    .filter(Boolean) as string[];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <SearchForm
        locale={lang}
        size="compact"
        defaultQuery={parsed.q ?? ""}
        defaultPlace={selectedPlaces[0] ?? ""}
      />

      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        {/*
          Filtret får vara ett eget rullningsområde. Utan det fastnar en lång
          filterlista i toppen och botten går inte att nå — man kan inte rulla
          fram Kommun-listan utan att först rulla förbi hela resultatlistan.
        */}
        <aside className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto lg:overscroll-contain">
          <FilterPanel params={parsed} facets={result.facets} locale={lang} />
        </aside>

        <section>
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line pb-4">
            <h1 className="font-display text-[20px] font-semibold">
              {result.failed ? (
                t.searchFailed
              ) : (
                <>
                  <span className="tnum">{formatNumber(result.total, lang)}</span>{" "}
                  <span className="font-normal text-ink-soft">
                    {result.total === 1 ? t.searchResultsOne : t.searchResultsMany}
                  </span>
                </>
              )}
            </h1>
            {!result.failed && result.total > 0 && (
              <SortLinks params={parsed} locale={lang} withMatch={matching} />
            )}
          </div>

          {result.failed && (
            <p className="py-16 text-center text-[15px] text-ink-mute">{t.searchFailedBody}</p>
          )}

          {!result.failed && jobs.length === 0 && (
            <div className="py-16 text-center">
              <p className="font-display text-[18px] font-semibold">{t.searchEmpty}</p>
              <p className="mt-2 text-[14.5px] text-ink-mute">{t.searchEmptyBody}</p>
              <Link
                href={path(lang, "/jobb")}
                className="mt-5 inline-block rounded-lg border border-line px-4 py-2 text-[14px] font-medium transition-colors hover:bg-sunk"
              >
                {t.searchClearAll}
              </Link>
            </div>
          )}

          {jobs.length > 0 && (
            <>
              <ul className="mt-5 flex flex-col gap-3">
                {jobs.map((job) => (
                  <JobCard key={job.id} job={job} locale={lang} match={matches.get(job.id)} />
                ))}
              </ul>
              {matchSort ? (
                <p className="mt-6 border-t border-line pt-4 text-center text-[12.5px] text-ink-mute">
                  {fill(t.sortMatchNote, { pool: formatNumber(Math.min(POOL, result.total), lang) })}
                </p>
              ) : (
                <Pagination params={parsed} page={page} totalPages={totalPages} locale={lang} />
              )}
              {result.total > result.reachable && (
                <p className="mt-4 text-center text-[12.5px] text-ink-mute">
                  {fill(
                    lang === "sv"
                      ? "Källan låter oss visa de {reachable} mest relevanta av {total} träffar. Förfina sökningen för att se fler."
                      : "The source lets us page through the {reachable} most relevant of {total} matches. Refine your search to see more.",
                    {
                      reachable: formatNumber(result.reachable, lang),
                      total: formatNumber(result.total, lang),
                    },
                  )}
                </p>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
