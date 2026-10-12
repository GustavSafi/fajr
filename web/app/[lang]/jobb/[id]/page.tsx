import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fill, getDictionary, isLocale, path, type Locale } from "@/lib/i18n";
import { daysUntil, excerpt, formatDate, placeLabel, publishedLabel } from "@/lib/format";
import { getJob, relatedJobs } from "@/lib/jobtech/client";
import { getSalary } from "@/lib/scb/salaries";
import type { Job } from "@/lib/types";
import { JobBadges } from "@/components/job-badges";
import { JobCard } from "@/components/job-card";
import { SalaryPanel } from "@/components/salary-panel";
import { AiAnalysis } from "@/components/ai-analysis";

type Props = { params: Promise<{ lang: string; id: string }> };

export const revalidate = 1800;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, id } = await params;
  const locale: Locale = isLocale(lang) ? lang : "sv";
  const job = await getJob(id);
  if (!job) return { title: getDictionary(locale).jobNotFound, robots: { index: false } };

  const place = placeLabel(job);
  const title = [job.headline, job.employer, place].filter(Boolean).join(" · ");
  return {
    title,
    description: excerpt(job.description, 155),
    openGraph: { title, description: excerpt(job.description, 155), type: "article" },
    /*
     * Stängda annonser ska inte konkurrera med öppna i sökresultaten. `follow`
     * behålls så att Google ändå går vidare till de liknande jobben på sidan.
     */
    ...(job.archived ? { robots: { index: false, follow: true } } : {}),
  };
}

/** Strukturerad data så att jobbet kan visas i Googles jobbsökresultat. */
function JobPostingSchema({ job }: { job: Job }) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.headline,
    description: job.description,
    datePosted: job.publishedAt,
    validThrough: job.applicationDeadline,
    employmentType:
      job.employmentType === "full-time"
        ? "FULL_TIME"
        : job.employmentType === "part-time"
          ? "PART_TIME"
          : undefined,
    hiringOrganization: job.employer
      ? { "@type": "Organization", name: job.employer, sameAs: job.employerUrl }
      : undefined,
    jobLocation: job.municipality
      ? {
          "@type": "Place",
          address: {
            "@type": "PostalAddress",
            addressLocality: job.municipality,
            addressRegion: job.region,
            addressCountry: "SE",
          },
        }
      : undefined,
    jobLocationType: job.arrangement === "remote" ? "TELECOMMUTE" : undefined,
    totalJobOpenings: job.vacancies,
  };

  // Tomma fält bort — ofullständig strukturerad data är sämre än mindre data.
  const clean = Object.fromEntries(Object.entries(schema).filter(([, v]) => v !== undefined));

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(clean) }}
    />
  );
}

function SkillList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-mute">
        {title}
      </h3>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {items.map((item) => (
          <li
            key={item}
            className="rounded-md bg-sunk px-2.5 py-1 text-[13px] text-ink-soft"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 border-b border-line py-2.5 last:border-b-0">
      <dt className="text-[13.5px] text-ink-mute">{label}</dt>
      <dd className="text-right text-[13.5px] font-medium text-ink-soft">{value}</dd>
    </div>
  );
}

export default async function JobPage({ params }: Props) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);

  const job = await getJob(id);
  if (!job) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
        <h1 className="font-display text-[24px] font-semibold">{t.jobNotFound}</h1>
        <p className="mt-3 text-[15px] text-ink-mute">{t.jobNotFoundBody}</p>
        <Link
          href={path(lang, "/jobb")}
          className="mt-6 inline-block rounded-lg bg-brand px-5 py-2.5 text-[14.5px] font-semibold text-brand-contrast transition-colors hover:bg-brand-hover"
        >
          {t.jobBackToSearch}
        </Link>
      </div>
    );
  }

  // Två oberoende källor, hämtas parallellt så sidan inte väntar i serie.
  const [related, salary] = await Promise.all([
    relatedJobs(job),
    getSalary(job.ssyk, job.employer),
  ]);
  const place = placeLabel(job);
  const left = daysUntil(job.applicationDeadline);
  const closed = left !== null && left < 0;

  // Översatt etikett när vi kan mappa formen, annars källans egen text —
  // hellre "Heltid" på engelska än inget alls.
  const employment =
    job.employmentType === "full-time"
      ? t.jobFullTime
      : job.employmentType === "part-time"
        ? t.jobPartTime
        : (job.employmentLabel ?? null);

  const scope =
    job.workingHoursMin !== undefined
      ? job.workingHoursMax !== undefined && job.workingHoursMax !== job.workingHoursMin
        ? `${job.workingHoursMin}–${job.workingHoursMax} %`
        : `${job.workingHoursMin} %`
      : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Google vill inte ha JobPosting-data för annonser som gått ut. */}
      {!job.archived && <JobPostingSchema job={job} />}

      <Link
        href={path(lang, "/jobb")}
        className="text-[13.5px] text-ink-mute transition-colors hover:text-brand"
      >
        ← {t.jobBackToSearch}
      </Link>

      <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <article>
          {job.archived && (
            <div className="mb-6 rounded-xl border border-urgent/30 bg-urgent-wash p-4">
              <p className="font-display text-[15px] font-semibold text-urgent">
                {t.jobArchivedTitle}
              </p>
              <p className="mt-1 text-[14px] leading-relaxed text-ink-soft">
                {t.jobArchivedBody}
                {job.removedAt && (
                  <span className="text-ink-mute">
                    {" "}
                    {fill(t.jobArchivedRemoved, { date: formatDate(job.removedAt, lang) })}
                  </span>
                )}
              </p>
            </div>
          )}

          <header className="border-b border-line pb-6">
            <h1 className="text-[28px] leading-tight sm:text-[34px]">{job.headline}</h1>
            <p className="mt-2 text-[16px] text-ink-soft">
              {job.employer}
              {place && <span className="text-ink-mute"> · {place}</span>}
            </p>
            <div className="mt-4">
              <JobBadges job={job} locale={lang} />
            </div>
          </header>

          {salary && (
            <div className="mt-6">
              <SalaryPanel
                salary={salary}
                occupation={job.occupation}
                locale={lang}
                employerClassified
              />
            </div>
          )}

          {/*
            Analysen visas inte på arkiverade annonser. Att betala för ett
            omdöme om ett jobb som inte går att söka vore att sälja luft.
          */}
          {!job.archived && <AiAnalysis jobId={job.externalId} locale={lang} />}

          {(job.requiredSkills.length > 0 ||
            job.preferredSkills.length > 0 ||
            job.requiredExperience.length > 0) && (
            <div className="mt-6 flex flex-col gap-5 rounded-xl border border-line bg-surface p-5">
              <SkillList title={t.jobRequirements} items={job.requiredSkills} />
              <SkillList title={t.jobExperience} items={job.requiredExperience} />
              <SkillList title={t.jobPreferred} items={job.preferredSkills} />
            </div>
          )}

          <section className="mt-8">
            <h2 className="font-display text-[18px] font-semibold">{t.jobAbout}</h2>
            {/*
              Annonstexten renderas som ren text med bevarade radbrytningar.
              API:et levererar även en HTML-variant, men den skulle kräva
              sanering innan vi vågar injicera den — det tar vi när vi behöver
              rubriker och listor i texten.
            */}
            <div className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">
              {job.description}
            </div>
          </section>

          {related.length > 0 && (
            <section className="mt-12">
              <h2 className="font-display text-[18px] font-semibold">{t.jobRelated}</h2>
              <ul className="mt-4 flex flex-col gap-3">
                {related.map((r) => (
                  <JobCard key={r.id} job={r} locale={lang} />
                ))}
              </ul>
            </section>
          )}
        </article>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border border-line bg-surface p-5">
            {job.archived ? (
              <p className="rounded-lg bg-sunk px-4 py-3 text-center text-[14px] font-medium text-ink-mute">
                {t.jobArchived}
              </p>
            ) : closed ? (
              <p className="rounded-lg bg-urgent-wash px-4 py-3 text-center text-[14px] font-medium text-urgent">
                {t.jobDeadlinePassed}
              </p>
            ) : (
              <a
                href={job.applicationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg bg-brand px-5 py-3 text-center font-display text-[15px] font-semibold text-brand-contrast transition-colors hover:bg-brand-hover"
              >
                {t.jobApply}
              </a>
            )}
            {!job.archived && (
              <p className="mt-2.5 text-center text-[12.5px] text-ink-mute">{t.jobApplyNote}</p>
            )}

            <dl className="mt-5 border-t border-line pt-2">
              <Fact
                label={t.jobDeadline}
                value={
                  job.archived || !job.applicationDeadline
                    ? null
                    : formatDate(job.applicationDeadline, lang)
                }
              />
              <Fact label={t.jobPublished} value={publishedLabel(job.publishedAt, lang)} />
              <Fact label={t.filterEmployment} value={employment} />
              <Fact label={t.jobExtent} value={scope} />
              <Fact label={t.filterField} value={job.occupationField ?? null} />
              <Fact
                label={t.jobVacanciesLabel}
                value={job.vacancies && job.vacancies > 1 ? String(job.vacancies) : null}
              />
            </dl>

            {job.salaryDescription && (
              <p className="mt-4 border-t border-line pt-4 text-[13.5px] text-ink-soft">
                {job.salaryDescription}
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
