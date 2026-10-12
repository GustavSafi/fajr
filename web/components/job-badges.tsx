import type { Job } from "@/lib/types";
import { getDictionary, type Locale } from "@/lib/i18n";
import { daysUntil } from "@/lib/format";

/**
 * Faktaetiketter på en annons. Vi visar bara det annonsen faktiskt påstår —
 * ingen etikett hittas på för att raden ska se full ut.
 */

const base =
  "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium whitespace-nowrap";

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "brand" | "urgent";
}) {
  const tones = {
    neutral: "bg-sunk text-ink-soft",
    brand: "bg-brand-wash text-brand",
    urgent: "bg-urgent-wash text-urgent",
  } as const;
  return <span className={`${base} ${tones[tone]}`}>{children}</span>;
}

export function JobBadges({ job, locale }: { job: Job; locale: Locale }) {
  const t = getDictionary(locale);
  // En borttagen annons har ingen brådska kvar, oavsett vad datumet säger.
  const left = job.archived ? null : daysUntil(job.applicationDeadline);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {job.arrangement === "remote" && <Badge tone="brand">{t.jobRemote}</Badge>}
      {job.arrangement === "hybrid" && <Badge tone="brand">{t.jobHybrid}</Badge>}

      {job.employmentType === "full-time" && <Badge>{t.jobFullTime}</Badge>}
      {job.employmentType === "part-time" && <Badge>{t.jobPartTime}</Badge>}
      {!job.employmentType && job.employmentLabel && <Badge>{job.employmentLabel}</Badge>}

      {job.experienceRequired === false && <Badge tone="brand">{t.jobNoExperience}</Badge>}
      {job.drivingLicenceRequired && <Badge>{t.jobDrivingLicence}</Badge>}

      {typeof job.vacancies === "number" && job.vacancies > 1 && (
        <Badge>
          <span className="tnum">{job.vacancies}</span> {t.jobVacancies}
        </Badge>
      )}

      {/* Brådska är den enda situationen där vi använder varningsfärgen. */}
      {left !== null && left >= 0 && left <= 5 && (
        <Badge tone="urgent">
          {left === 0 ? t.jobDeadlineToday : left === 1 ? t.jobDayLeft : `${left} ${t.jobDaysLeft}`}
        </Badge>
      )}
    </div>
  );
}
