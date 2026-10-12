import Link from "next/link";
import type { Job } from "@/lib/types";
import { getDictionary, path, type Locale } from "@/lib/i18n";
import { excerpt, formatNumber, placeLabel, publishedLabel } from "@/lib/format";
import { medianFor } from "@/lib/scb/salaries";
import type { MatchResult } from "@/lib/matching/score";
import { JobBadges } from "./job-badges";

/**
 * Matchningsbrickan. En siffra, inget diagram — och den visas bara när
 * poängen vilar på tillräckligt många dimensioner för att betyda något.
 */
function MatchBadge({ score, label }: { score: number; label: string }) {
  return (
    <span className="flex shrink-0 items-baseline gap-1 rounded-lg bg-brand-wash px-2.5 py-1">
      <span className="tnum font-display text-[16px] font-semibold text-brand">{score}</span>
      <span className="text-[11px] font-medium uppercase tracking-wide text-brand/80">
        {label}
      </span>
    </span>
  );
}

export function JobCard({
  job,
  locale,
  match,
}: {
  job: Job;
  locale: Locale;
  match?: MatchResult;
}) {
  const t = getDictionary(locale);
  const place = placeLabel(job);
  const published = publishedLabel(job.publishedAt, locale);
  const skills = job.requiredSkills.slice(0, 4);
  const median = medianFor(job.ssyk, job.employer);

  return (
    <li className="group relative rounded-xl border border-line bg-surface p-5 transition-shadow hover:shadow-lift">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-[17px] leading-snug">
            <Link
              href={path(locale, `/jobb/${job.externalId}`)}
              className="after:absolute after:inset-0 after:content-[''] hover:text-brand"
            >
              {job.headline}
            </Link>
          </h3>
          <p className="mt-1 text-[14px] text-ink-soft">
            {job.employer ?? t.jobEmployer}
            {place && <span className="text-ink-mute"> · {place}</span>}
          </p>
          {/*
            Lönen direkt i listan. Uppslagningen är en ren filläsning utan
            nätverksanrop, så den kostar ingenting per kort — och den svarar på
            det folk undrar mest över innan de orkar öppna annonsen.
          */}
          {median !== null && (
            <p className="mt-1 text-[13px] text-ink-mute">
              ≈{" "}
              <span className="tnum font-medium text-ink-soft">
                {formatNumber(median, locale)} {t.salaryPerMonth}
              </span>
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {match && <MatchBadge score={match.score} label={t.matchLabel} />}
          {published && <span className="text-[12.5px] text-ink-mute">{published}</span>}
        </div>
      </div>

      {job.description && (
        <p className="clamp-2 mt-3 text-[14px] leading-relaxed text-ink-mute">
          {excerpt(job.description)}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <JobBadges job={job} locale={locale} />
      </div>

      {match && match.reasons.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1">
          {match.reasons.slice(0, 2).map((reason) => (
            <li key={reason} className="flex gap-1.5 text-[13px] text-ink-soft">
              <span aria-hidden="true" className="text-brand">
                ✓
              </span>
              {reason}
            </li>
          ))}
        </ul>
      )}

      {!match && skills.length > 0 && (
        <p className="mt-3 text-[12.5px] text-ink-mute">
          {t.jobRequirements}:{" "}
          <span className="text-ink-soft">{skills.join(" · ")}</span>
          {job.requiredSkills.length > skills.length && (
            <span> +{job.requiredSkills.length - skills.length}</span>
          )}
        </p>
      )}
    </li>
  );
}
