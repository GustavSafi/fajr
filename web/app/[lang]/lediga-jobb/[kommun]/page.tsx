import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fill, getDictionary, isLocale, path, type Locale } from "@/lib/i18n";
import { formatNumber } from "@/lib/format";
import { searchJobs } from "@/lib/jobtech/client";
import { medianFor } from "@/lib/scb/salaries";
import {
  MUNICIPALITY_PAGES,
  municipalityBySlug,
  occupationBySsyk,
  type OccupationPage,
} from "@/lib/landing/slugs";
import { JobCard } from "@/components/job-card";

/**
 * Kommunsida: `/lediga-jobb/goteborg`.
 *
 * "jobb göteborg" söks varje dag av tusentals människor. Sidan måste svara på
 * mer än "här är en lista" för att vara värd att ranka, så den visar vilka
 * yrkesområden som faktiskt annonseras i kommunen, vad de vanligaste yrkena
 * betalar enligt SCB, och de senast publicerade annonserna.
 *
 * Allt är hämtat i realtid. Står det 1 240 jobb i Göteborg finns det 1 240 jobb
 * i Göteborg — vi skriver aldrig ett tal vi inte kan visa annonserna bakom.
 */

type Props = { params: Promise<{ lang: string; kommun: string }> };

/**
 * Annonser tillkommer hela dygnet, men en halvtimmes fördröjning märker ingen
 * och den sparar 290 kommuner × varje besökare från onödiga anrop.
 */
export const revalidate = 1800;

export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

/** Hur stort urval vi tittar på när vi räknar vilka yrken som annonseras mest. */
const POOL = 100;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, kommun } = await params;
  const locale: Locale = isLocale(lang) ? lang : "sv";
  const t = getDictionary(locale);
  const place = municipalityBySlug(kommun);
  if (!place) return {};

  const jobs = await searchJobs({ municipality: [place.id] });

  return {
    title: fill(t.kommunTitle, { name: place.name }),
    description: fill(t.kommunMeta, {
      name: place.name,
      count: formatNumber(jobs.total, locale),
    }),
    alternates: { canonical: path(locale, `/lediga-jobb/${place.slug}`) },
  };
}

interface SalaryRow {
  page: OccupationPage;
  median: number;
  ads: number;
}

/**
 * Vilka yrken annonseras mest här, och vad betalar de?
 *
 * Vi räknar SSYK-koderna i annonserna i stället för att visa "Sveriges
 * vanligaste yrken" — en lista som vore identisk på alla 290 sidor och därmed
 * värdelös både för besökaren och för Google. Kommunens egen arbetsmarknad är
 * det enda som gör sidan unik.
 */
function salaryRows(ssykCounts: Map<string, number>): SalaryRow[] {
  const rows: SalaryRow[] = [];
  for (const [ssyk, ads] of ssykCounts) {
    const page = occupationBySsyk(ssyk);
    if (!page) continue;
    const median = medianFor(ssyk);
    if (!median) continue;
    rows.push({ page, median, ads });
  }
  return rows.sort((a, b) => b.ads - a.ads).slice(0, 8);
}

export default async function MunicipalityPage({ params }: Props) {
  const { lang, kommun } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);

  const place = municipalityBySlug(kommun);
  if (!place) notFound();

  const [local, national] = await Promise.all([
    searchJobs({ municipality: [place.id], sort: "newest" }, POOL),
    // Samma anrop på varje kommunsida, så Next cachar det en gång för alla.
    searchJobs({}, 1),
  ]);

  const ssykCounts = new Map<string, number>();
  for (const job of local.jobs) {
    if (!job.ssyk) continue;
    ssykCounts.set(job.ssyk, (ssykCounts.get(job.ssyk) ?? 0) + 1);
  }
  const salaries = salaryRows(ssykCounts);

  const fields = local.facets.occupationField.slice(0, 12);
  const latest = local.jobs.slice(0, 8);

  const slugById = new Map(MUNICIPALITY_PAGES.map((m) => [m.id, m.slug]));
  const elsewhere = national.facets.municipality
    .filter((f) => f.id !== place.id && slugById.has(f.id))
    .slice(0, 16);

  const searchHref = path(lang, `/jobb?kommun=${encodeURIComponent(place.id)}`);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-[30px] leading-tight sm:text-[36px]">
        {fill(t.kommunTitle, { name: place.name })}
      </h1>
      <p className="mt-2 text-[15px] font-medium text-brand">
        {fill(t.kommunCount, { count: formatNumber(local.total, lang) })}
      </p>
      <p className="mt-3 max-w-[62ch] text-[15.5px] leading-relaxed text-ink-soft">
        {fill(t.kommunIntro, { name: place.name })}
      </p>

      {local.total === 0 ? (
        <p className="mt-8 rounded-xl border border-line bg-surface px-4 py-6 text-[14.5px] text-ink-mute">
          {t.kommunNoJobs}
        </p>
      ) : (
        <>
          <Link
            href={searchHref}
            className="mt-6 inline-block rounded-lg bg-brand px-5 py-2.5 font-display text-[14.5px] font-semibold text-brand-contrast transition-colors hover:bg-brand-hover"
          >
            {fill(t.kommunAll, {
              count: formatNumber(local.total, lang),
              name: place.name,
            })}
          </Link>

          {fields.length > 0 && (
            <section className="mt-12">
              <h2 className="font-display text-[19px] font-semibold">
                {fill(t.kommunFields, { name: place.name })}
              </h2>
              <ul className="mt-4 flex flex-col divide-y divide-line border-y border-line">
                {fields.map((facet) => (
                  <li key={facet.id}>
                    <Link
                      href={`${searchHref}&omrade=${encodeURIComponent(facet.id)}`}
                      className="flex items-center justify-between gap-4 py-2.5 text-[14.5px] text-ink-soft transition-colors hover:text-brand"
                    >
                      <span>{facet.label}</span>
                      <span className="tnum shrink-0 text-[13.5px] text-ink-mute">
                        {formatNumber(facet.count, lang)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {salaries.length > 0 && (
            <section className="mt-12">
              <h2 className="font-display text-[19px] font-semibold">{t.kommunSalaries}</h2>
              <p className="mt-1 max-w-[62ch] text-[13.5px] text-ink-mute">
                {fill(t.kommunSalariesHelp, { name: place.name })}
              </p>
              <ul className="mt-4 flex flex-col divide-y divide-line border-y border-line">
                {salaries.map((row) => (
                  <li key={row.page.ssyk}>
                    <Link
                      href={path(lang, `/lon/${row.page.slug}`)}
                      className="flex items-baseline justify-between gap-4 py-2.5 transition-colors hover:text-brand"
                    >
                      <span className="text-[14.5px] text-ink-soft">{row.page.name}</span>
                      <span className="tnum shrink-0 text-[14px] font-medium text-ink">
                        {formatNumber(row.median, lang)}{" "}
                        <span className="font-normal text-ink-mute">{t.salaryPerMonth}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-12">
            <h2 className="font-display text-[19px] font-semibold">{t.kommunLatest}</h2>
            <ul className="mt-4 flex flex-col gap-3">
              {latest.map((job) => (
                <JobCard key={job.id} job={job} locale={lang} />
              ))}
            </ul>
            <Link
              href={searchHref}
              className="mt-5 inline-block font-display text-[14.5px] font-semibold text-brand hover:underline"
            >
              {fill(t.kommunAll, {
                count: formatNumber(local.total, lang),
                name: place.name,
              })}
            </Link>
          </section>
        </>
      )}

      <p className="mt-12 border-t border-line pt-5 text-[12.5px] text-ink-mute">
        {t.landingSource}
      </p>

      {elsewhere.length > 0 && (
        <nav className="mt-6">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-mute">
            {t.kommunOtherPlaces}
          </h2>
          <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-ink-mute">
            {elsewhere.map((facet) => (
              <li key={facet.id}>
                <Link
                  href={path(lang, `/lediga-jobb/${slugById.get(facet.id)}`)}
                  className="hover:text-brand"
                >
                  {facet.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
