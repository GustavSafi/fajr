import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary, isLocale, path } from "@/lib/i18n";
import { formatNumber } from "@/lib/format";
import { searchJobs } from "@/lib/jobtech/client";
import { SearchForm } from "@/components/search-form";

export const revalidate = 3600;

/** Vanliga svenska yrken — samma lista oavsett språk, det är jobben som söks. */
const POPULAR = [
  "Undersköterska",
  "Lärare",
  "Systemutvecklare",
  "Säljare",
  "Sjuksköterska",
  "Lagerarbetare",
  "Snickare",
  "Ekonomiassistent",
  "Personlig assistent",
  "Chaufför",
];

const CITIES = ["Stockholm", "Göteborg", "Malmö", "Uppsala", "Linköping", "Örebro"];

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);

  // Ett tomt anrop ger oss antalet aktiva annonser. Misslyckas det visar vi
  // ingen siffra alls hellre än en påhittad.
  const stats = await searchJobs({ page: 1 });
  const total = stats.failed ? null : stats.total;

  const chip =
    "rounded-full border border-line bg-surface px-3.5 py-1.5 text-[14px] text-ink-soft transition-colors hover:border-brand hover:text-brand";

  return (
    <>
      {/*
        Samma max-bredd som sidhuvudet (max-w-6xl) så att logotypen och rubriken
        står på samma vänsterkant. Texten hålls läsbar med egna teckenbredder
        i stället för en smalare behållare.
      */}
      <section className="border-b border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <h1 className="max-w-[19ch] text-[34px] leading-[1.08] sm:text-[46px]">
            {t.heroTitle}
          </h1>
          <p className="mt-5 max-w-[58ch] text-[17px] leading-relaxed text-ink-soft">
            {t.heroBody}
          </p>

          <div className="mt-8 max-w-3xl">
            <SearchForm locale={lang} />
          </div>

          <p className="mt-3 text-[13.5px] text-ink-mute">
            {t.heroFree}
            {total !== null && (
              <>
                {" · "}
                <span className="tnum text-ink-soft">{formatNumber(total, lang)}</span>{" "}
                {t.searchResultsMany}
              </>
            )}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-ink-mute">
          {t.popularSearches}
        </h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {POPULAR.map((term) => (
            <li key={term}>
              <Link href={path(lang, `/jobb?q=${encodeURIComponent(term)}`)} className={chip}>
                {term}
              </Link>
            </li>
          ))}
        </ul>

        <h2 className="mt-10 text-[13px] font-semibold uppercase tracking-wider text-ink-mute">
          {t.heroWhereLabel}
        </h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {CITIES.map((city) => (
            <li key={city}>
              <Link
                href={path(lang, `/jobb?plats=${encodeURIComponent(city)}`)}
                className={chip}
              >
                {city}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
