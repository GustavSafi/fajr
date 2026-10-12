import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fill, getDictionary, isLocale, path, type Locale } from "@/lib/i18n";
import { formatNumber } from "@/lib/format";
import { searchJobs } from "@/lib/jobtech/client";
import { getSalary, medianFor, sectorBreakdown, type SectorBreakdown } from "@/lib/scb/salaries";
import { SECTOR_LABEL } from "@/lib/scb/sector";
import {
  MUNICIPALITY_PAGES,
  POPULAR_OCCUPATIONS,
  occupationSiblings,
  occupationBySlug,
} from "@/lib/landing/slugs";
import { SalaryPanel } from "@/components/salary-panel";
import { JobCard } from "@/components/job-card";

/**
 * Lönesida per yrke: `/lon/underskoterskor`.
 *
 * Det här är sidor som ska leva i åratal. "undersköterska lön" har enormt
 * söktryck i Sverige, konkurrensen är svag och ingen jobbsajt svarar bra på
 * frågan — medan en annons dör efter tre veckor lever den här sidan vidare och
 * samlar auktoritet.
 *
 * Innehållet måste vara eget och verkligt, annars straffas tunna mallsidor.
 * Därför: lönen per sektor, lönekurvan över åldrar, antal anställda i yrket,
 * och de jobb som faktiskt är lediga just nu.
 */

type Props = { params: Promise<{ lang: string; yrke: string }> };

// Statistiken ändras en gång om året, annonserna varje dag. En timme räcker.
export const revalidate = 3600;

/**
 * Vi förgenererar ingenting. 377 sidor vid varje bygge vore slöseri; Next
 * renderar dem på begäran och cachar sedan. Sitemapen listar dem ändå, så
 * Google hittar varenda en.
 */
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, yrke } = await params;
  const locale: Locale = isLocale(lang) ? lang : "sv";
  const t = getDictionary(locale);
  const page = occupationBySlug(yrke);
  if (!page) return {};

  const salary = await getSalary(page.ssyk);
  const jobs = await searchJobs({ q: page.searchTerm });

  return {
    title: fill(t.lonTitle, { name: page.name }),
    description: fill(t.lonMeta, {
      name: page.name,
      year: salary?.year ?? "",
      count: formatNumber(jobs.total, locale),
    }),
    alternates: { canonical: path(locale, `/lon/${page.slug}`) },
  };
}

/**
 * Lönen per sektor. Samma yrke betalar olika hos en kommun, en region, staten
 * och en privat arbetsgivare — och det är en jämförelse ingen annan svensk
 * sajt visar, trots att datan är öppen.
 */
function SectorTable({
  rows,
  locale,
}: {
  rows: SectorBreakdown[];
  locale: Locale;
}) {
  const t = getDictionary(locale);
  if (rows.length === 0) return null;

  const highest = Math.max(...rows.map((r) => r.median ?? r.mean ?? 0));

  return (
    <section className="mt-12">
      <h2 className="font-display text-[19px] font-semibold">{t.lonBySector}</h2>
      <p className="mt-1 max-w-[62ch] text-[13.5px] text-ink-mute">{t.lonBySectorHelp}</p>

      <ul className="mt-4 flex flex-col gap-2.5">
        {rows.map((row) => {
          const value = row.median ?? row.mean ?? 0;
          // Stapeln jämför sektorerna med varandra, inte med noll.
          const width = highest > 0 ? Math.max(8, (value / highest) * 100) : 0;
          return (
            <li key={row.sector} className="flex items-center gap-3">
              <span className="w-[9.5rem] shrink-0 text-[13.5px] text-ink-soft">
                {SECTOR_LABEL[row.sector][locale === "sv" ? "sv" : "en"]}
              </span>
              <span className="h-6 min-w-0 flex-1 overflow-hidden rounded-md bg-sunk">
                <span
                  className="block h-full rounded-md bg-brand/35"
                  style={{ width: `${width}%` }}
                />
              </span>
              <span className="tnum w-24 shrink-0 text-right text-[14px] font-medium text-ink">
                {formatNumber(Math.round(value), locale)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default async function SalaryPage({ params }: Props) {
  const { lang, yrke } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);

  const page = occupationBySlug(yrke);
  if (!page) notFound();

  const [salary, jobs] = await Promise.all([
    getSalary(page.ssyk),
    searchJobs({ q: page.searchTerm }),
  ]);

  if (!salary) notFound();

  const sectors = sectorBreakdown(page.ssyk);
  const siblings = occupationSiblings(page).map((s) => ({
    ...s,
    median: medianFor(s.ssyk),
  }));

  const topMunicipalities = jobs.facets.municipality.slice(0, 10);
  const slugByName = new Map(MUNICIPALITY_PAGES.map((m) => [m.name, m.slug]));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-[30px] leading-tight sm:text-[36px]">
        {fill(t.lonTitle, { name: page.name })}
      </h1>
      <p className="mt-3 max-w-[62ch] text-[15.5px] leading-relaxed text-ink-soft">
        {t.lonIntro}
      </p>

      <div className="mt-8">
        <SalaryPanel salary={salary} occupation={page.fullName} locale={lang} />
      </div>

      <SectorTable rows={sectors} locale={lang} />

      {siblings.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-[19px] font-semibold">{t.lonSiblings}</h2>
          <p className="mt-1 max-w-[62ch] text-[13.5px] text-ink-mute">{t.lonSiblingsHelp}</p>
          <ul className="mt-4 flex flex-col divide-y divide-line border-y border-line">
            {siblings.map((s) => (
              <li key={s.ssyk}>
                <Link
                  href={path(lang, `/lon/${s.slug}`)}
                  className="flex items-baseline justify-between gap-4 py-2.5 transition-colors hover:text-brand"
                >
                  <span className="text-[14.5px] text-ink-soft">{s.fullName}</span>
                  {s.median !== null && (
                    <span className="tnum shrink-0 text-[14px] font-medium text-ink">
                      {formatNumber(s.median, lang)}{" "}
                      <span className="font-normal text-ink-mute">{t.salaryPerMonth}</span>
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-12">
        <h2 className="font-display text-[19px] font-semibold">
          {fill(t.lonOpenJobs, { name: page.name.toLowerCase() })}
        </h2>

        {jobs.jobs.length === 0 ? (
          <p className="mt-3 text-[14.5px] text-ink-mute">{t.lonNoJobs}</p>
        ) : (
          <>
            <ul className="mt-4 flex flex-col gap-3">
              {jobs.jobs.slice(0, 8).map((job) => (
                <JobCard key={job.id} job={job} locale={lang} />
              ))}
            </ul>
            <Link
              href={path(lang, `/jobb?q=${encodeURIComponent(page.searchTerm)}`)}
              className="mt-5 inline-block rounded-lg bg-brand px-5 py-2.5 font-display text-[14.5px] font-semibold text-brand-contrast transition-colors hover:bg-brand-hover"
            >
              {fill(t.lonAllJobs, { count: formatNumber(jobs.total, lang) })}
            </Link>
          </>
        )}
      </section>

      {topMunicipalities.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-[19px] font-semibold">{t.lonWhere}</h2>
          <p className="mt-1 text-[13.5px] text-ink-mute">{t.lonWhereHelp}</p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {topMunicipalities.map((facet) => {
              const slug = slugByName.get(facet.label);
              const label = `${facet.label} (${formatNumber(facet.count, lang)})`;
              return (
                <li key={facet.id}>
                  {slug ? (
                    <Link
                      href={path(lang, `/lediga-jobb/${slug}`)}
                      className="inline-block rounded-full border border-line bg-surface px-3.5 py-1.5 text-[14px] text-ink-soft transition-colors hover:border-brand hover:text-brand"
                    >
                      {label}
                    </Link>
                  ) : (
                    <span className="inline-block rounded-full border border-line px-3.5 py-1.5 text-[14px] text-ink-mute">
                      {label}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <p className="mt-12 border-t border-line pt-5 text-[12.5px] text-ink-mute">
        {t.landingSource}
      </p>

      {/* Länkar vidare till några andra yrken — ger Google en väg runt sajten. */}
      <nav className="mt-6 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-ink-mute">
        {POPULAR_OCCUPATIONS.filter((o) => o.slug !== page.slug)
          .slice(0, 12)
          .map((o) => (
            <Link key={o.slug} href={path(lang, `/lon/${o.slug}`)} className="hover:text-brand">
              {o.name}
            </Link>
          ))}
      </nav>
    </div>
  );
}
