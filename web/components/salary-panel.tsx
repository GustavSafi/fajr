import { AGE_BANDS, type SalaryResult } from "@/lib/scb/salaries";
import { SECTOR_LABEL } from "@/lib/scb/sector";
import { fill, getDictionary, type Locale } from "@/lib/i18n";
import { formatNumber } from "@/lib/format";

/**
 * Lönepanelen. Formen är en statistikruta med ett spridningsspann — inte ett
 * diagram. Det finns ett tal som är svaret (medianen) och ett spann som ger
 * det sammanhang; ett stapeldiagram med en stapel hade sagt mindre.
 *
 * Åldersraden längst ned är däremot ett riktigt diagram, för där är poängen en
 * utveckling över tid. En enda färg, eftersom det är en storlek som växer och
 * inte fem olika saker — alltså inget problem för den som är färgblind.
 *
 * Vi lovar aldrig mer än datan säger: det här är yrkets lön i hela landet,
 * inte den här tjänstens lön. Det står utskrivet.
 */

function Money({ value, locale }: { value: number; locale: Locale }) {
  // Proportionella siffror: talet står ensamt, inte i en kolumn.
  return <span>{formatNumber(Math.round(value), locale)}</span>;
}

/** Lönen per åldersband. Fem värden, en storlek — små staplar räcker. */
function AgeProgression({
  ages,
  locale,
  label,
  aria,
}: {
  ages: Record<string, number>;
  locale: Locale;
  label: string;
  aria: string;
}) {
  const bands = AGE_BANDS.filter((b) => typeof ages[b] === "number");
  if (bands.length < 3) return null;

  const values = bands.map((b) => ages[b]!);
  const max = Math.max(...values);
  // Nollskala hade gjort alla staplar nästan lika höga — lönekurvan är flack.
  // Vi börjar strax under lägsta värdet och skriver ut talen i stället.
  const min = Math.min(...values) * 0.9;

  return (
    <div className="mt-5 border-t border-line pt-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-mute">
        {label}
      </h3>
      <div className="mt-3 flex items-end gap-1.5" role="img" aria-label={aria}>
        {bands.map((band, i) => {
          const value = ages[band]!;
          const height = 12 + ((value - min) / (max - min || 1)) * 36;
          return (
            <div key={band} className="flex flex-1 flex-col items-center gap-1.5">
              {/*
                Alla band får sin siffra. Att bara märka första och sista såg
                ut som att datan saknades för dem i mitten — och en graf som
                läses som ett glapp är en graf som ljuger.
              */}
              <span className="tnum text-[11px] text-ink-soft">
                {formatNumber(Math.round(value), locale)}
              </span>
              <div
                className="w-full rounded-[3px] bg-brand/45"
                style={{ height: `${height}px` }}
              />
              <span className="tnum text-[10.5px] text-ink-mute">{band.replace("-", "–")}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SalaryPanel({
  salary,
  occupation,
  locale,
  employerClassified = false,
}: {
  salary: SalaryResult;
  occupation?: string;
  locale: Locale;
  /**
   * Sant när yrket kommer ur annonsens egen klassning, dvs. på en annonssida.
   * Falskt på lönesidorna, där yrket är sidans ämne och valt av oss.
   */
  employerClassified?: boolean;
}) {
  const t = getDictionary(locale);
  const headline = salary.median ?? salary.mean;
  if (headline === undefined) return null;

  const { p10, p25, p75, p90 } = salary;
  const hasRange =
    p10 !== undefined && p90 !== undefined && p90 > p10 && salary.median !== undefined;

  const pct = (value: number) => {
    if (!hasRange) return 0;
    const ratio = (value - p10!) / (p90! - p10!);
    return Math.min(100, Math.max(0, ratio * 100));
  };

  const bandStart = p25 !== undefined ? pct(p25) : 0;
  const bandEnd = p75 !== undefined ? pct(p75) : 100;
  const medianAt = salary.median !== undefined ? pct(salary.median) : 50;

  const sectorLabel = SECTOR_LABEL[salary.sector][locale === "sv" ? "sv" : "en"];

  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-ink-mute">
        {t.salaryTitle}
      </h2>

      <p className="mt-2 font-display text-[30px] font-semibold leading-none">
        <Money value={headline} locale={locale} />
        <span className="ml-1.5 text-[15px] font-medium text-ink-mute">{t.salaryPerMonth}</span>
      </p>
      <p className="mt-1.5 text-[13.5px] text-ink-soft">
        {salary.median !== undefined ? t.salaryMedianOf : t.salaryMeanOf}{" "}
        <span className="text-ink">{occupation ?? salary.label}</span>
        {salary.sector !== "0" && (
          <span className="text-ink-mute"> · {sectorLabel}</span>
        )}
      </p>
      {/*
        Brasklappen står här och inte bland fotnoterna, för det är precis här
        frågan uppstår: läsaren ser ett yrkesnamn som ibland inte alls liknar
        annonsens titel. Att förklara det långt ned hade varit för sent.

        Men bara på en annonssida. På /lon/ är yrket sidans eget ämne, valt av
        oss ur SCB — där vore varningen om arbetsgivarens klassning obegriplig
        och skulle så tvivel om en siffra som inte är osäker.
      */}
      {employerClassified && (
        <p className="mt-1 text-[12px] leading-snug text-ink-mute">{t.salarySourceNote}</p>
      )}

      {hasRange && (
        <div className="mt-5">
          <div
            className="relative h-2.5 rounded-full bg-brand-wash"
            role="img"
            aria-label={fill(t.salaryRangeAria, {
              low: formatNumber(p10!, locale),
              high: formatNumber(p90!, locale),
              median: formatNumber(salary.median!, locale),
            })}
          >
            <div
              className="absolute inset-y-0 rounded-full bg-brand/35"
              style={{ left: `${bandStart}%`, width: `${Math.max(2, bandEnd - bandStart)}%` }}
            />
            <div
              className="absolute top-1/2 h-5 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand ring-2 ring-surface"
              style={{ left: `${medianAt}%` }}
            />
          </div>

          <div className="mt-2 flex justify-between text-[12.5px] text-ink-mute">
            <span className="tnum">
              <Money value={p10!} locale={locale} /> {t.salaryPerMonth}
            </span>
            <span className="tnum">
              <Money value={p90!} locale={locale} /> {t.salaryPerMonth}
            </span>
          </div>

          <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">
            {fill(t.salaryRangeNote, {
              low: formatNumber(p10!, locale),
              high: formatNumber(p90!, locale),
            })}
          </p>
        </div>
      )}

      {salary.entrySalary !== undefined && (
        <div className="mt-5 flex items-baseline justify-between gap-4 rounded-lg bg-sunk px-4 py-3">
          <span className="text-[13.5px] text-ink-soft">
            {t.salaryEntry}{" "}
            <span className="text-ink-mute">({t.salaryEntryAges})</span>
          </span>
          <span className="font-display text-[17px] font-semibold">
            <Money value={salary.entrySalary} locale={locale} />
            <span className="ml-1 text-[12.5px] font-medium text-ink-mute">
              {t.salaryPerMonth}
            </span>
          </span>
        </div>
      )}

      {salary.ages && (
        <AgeProgression
          ages={salary.ages}
          locale={locale}
          label={t.salaryByAge}
          aria={t.salaryAgeAria}
        />
      )}

      <p className="mt-4 border-t border-line pt-3 text-[12px] leading-relaxed text-ink-mute">
        {fill(t.salarySource, { year: salary.year, sector: sectorLabel })}
        {salary.headcount !== undefined && (
          <>
            {" "}
            {fill(t.salaryCountNote, {
              count: formatNumber(Math.round(salary.headcount / 100) * 100, locale),
            })}
          </>
        )}
        <br />
        {t.salaryDisclaimer}
      </p>
    </section>
  );
}
