import Link from "next/link";
import type { Facet, SearchParams } from "@/lib/types";
import { getDictionary, path, type Locale } from "@/lib/i18n";
import { formatNumber } from "@/lib/format";
import { countActiveFilters, toQueryString, toggleFlag, toggleValue } from "@/lib/search-params";

/**
 * Filtren är länkar, inte formulär. Det ger fungerande bakåtknapp, delbara
 * URL:er och en sida som filtrerar även utan JavaScript. Antalen kommer från
 * API:ets egen statistik, så de speglar den aktuella sökningen exakt.
 */

const FIRST_SHOWN = 8;

function FilterLink({
  href,
  active,
  label,
  count,
  locale,
}: {
  href: string;
  active: boolean;
  label: string;
  count?: number;
  locale: Locale;
}) {
  return (
    <li>
      <Link
        href={href}
        aria-pressed={active}
        className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[14px] transition-colors ${
          active ? "bg-brand-wash text-brand" : "text-ink-soft hover:bg-sunk hover:text-ink"
        }`}
      >
        <span
          aria-hidden="true"
          className={`grid h-4 w-4 shrink-0 place-items-center rounded-[4px] border ${
            active ? "border-brand bg-brand text-brand-contrast" : "border-line-strong"
          }`}
        >
          {active && (
            <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none">
              <path
                d="M2.5 6.2 4.8 8.5 9.5 3.8"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {count !== undefined && (
          <span className="tnum shrink-0 text-[12.5px] text-ink-mute">
            {formatNumber(count, locale)}
          </span>
        )}
      </Link>
    </li>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line py-5 first:border-t-0 first:pt-0">
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-mute">
        {title}
      </h3>
      {children}
    </section>
  );
}

function FacetGroup({
  title,
  facets,
  selected,
  params,
  field,
  locale,
}: {
  title: string;
  facets: Facet[];
  selected: string[];
  params: SearchParams;
  field: "municipality" | "occupationField";
  locale: Locale;
}) {
  if (facets.length === 0 && selected.length === 0) return null;

  // Valda värden ligger alltid överst så att man ser vad som är på.
  const ordered = [
    ...facets.filter((f) => selected.includes(f.id)),
    ...facets.filter((f) => !selected.includes(f.id)),
  ];
  const head = ordered.slice(0, FIRST_SHOWN);
  const tail = ordered.slice(FIRST_SHOWN);
  const t = getDictionary(locale);

  const link = (id: string) =>
    path(locale, `/jobb${toQueryString(toggleValue(params, field, id))}`);

  return (
    <Group title={title}>
      <ul className="flex flex-col gap-0.5">
        {head.map((f) => (
          <FilterLink
            key={f.id}
            href={link(f.id)}
            active={selected.includes(f.id)}
            label={f.label}
            count={f.count}
            locale={locale}
          />
        ))}
      </ul>
      {tail.length > 0 && (
        <details className="group mt-1">
          <summary className="cursor-pointer list-none px-2 py-1.5 text-[13px] font-medium text-brand hover:underline">
            <span className="group-open:hidden">
              {t.showMore} ({tail.length})
            </span>
            <span className="hidden group-open:inline">{t.showLess}</span>
          </summary>
          <ul className="flex flex-col gap-0.5">
            {tail.map((f) => (
              <FilterLink
                key={f.id}
                href={link(f.id)}
                active={selected.includes(f.id)}
                label={f.label}
                count={f.count}
                locale={locale}
              />
            ))}
          </ul>
        </details>
      )}
    </Group>
  );
}

export function FilterPanel({
  params,
  facets,
  locale,
}: {
  params: SearchParams;
  facets: { municipality: Facet[]; occupationField: Facet[] };
  locale: Locale;
}) {
  const t = getDictionary(locale);
  const active = countActiveFilters(params);

  const flagLink = (key: "remote" | "partTime" | "noExperience") =>
    path(locale, `/jobb${toQueryString(toggleFlag(params, key))}`);

  const windowLink = (days: number | undefined) => {
    const next: SearchParams = { ...params, page: 1 };
    if (days) next.publishedWithinDays = days;
    else delete next.publishedWithinDays;
    return path(locale, `/jobb${toQueryString(next)}`);
  };

  const windows: Array<{ days: number | undefined; label: string }> = [
    { days: undefined, label: t.filterPublishedAny },
    { days: 1, label: t.filterPublishedDay },
    { days: 7, label: t.filterPublishedWeek },
    { days: 30, label: t.filterPublishedMonth },
  ];

  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-[16px] font-semibold">{t.filters}</h2>
        {active > 0 && (
          <Link
            href={path(locale, `/jobb${toQueryString({ q: params.q })}`)}
            className="text-[13px] text-brand hover:underline"
          >
            {t.searchClearAll}
          </Link>
        )}
      </div>

      <div className="mt-4">
        <Group title={t.filterPublished}>
          <ul className="flex flex-col gap-0.5">
            {windows.map((w) => (
              <FilterLink
                key={w.label}
                href={windowLink(w.days)}
                active={params.publishedWithinDays === w.days}
                label={w.label}
                locale={locale}
              />
            ))}
          </ul>
        </Group>

        <Group title={t.filterEmployment}>
          <ul className="flex flex-col gap-0.5">
            <FilterLink
              href={flagLink("remote")}
              active={Boolean(params.remote)}
              label={t.filterRemote}
              locale={locale}
            />
            <FilterLink
              href={flagLink("partTime")}
              active={Boolean(params.partTime)}
              label={t.filterPartTime}
              locale={locale}
            />
            <FilterLink
              href={flagLink("noExperience")}
              active={Boolean(params.noExperience)}
              label={t.filterNoExperience}
              locale={locale}
            />
          </ul>
        </Group>

        <FacetGroup
          title={t.filterMunicipality}
          facets={facets.municipality}
          selected={params.municipality ?? []}
          params={params}
          field="municipality"
          locale={locale}
        />

        <FacetGroup
          title={t.filterField}
          facets={facets.occupationField}
          selected={params.occupationField ?? []}
          params={params}
          field="occupationField"
          locale={locale}
        />
      </div>
    </div>
  );
}
