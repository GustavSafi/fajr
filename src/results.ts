import type { JobSource, RankedJob } from "./models/index.ts";
import type { Lang } from "./i18n.ts";
import { UI } from "./interview/strings.ts";
import { arrWord, empWord } from "./ranking/strings.ts";

function money(n: number): string {
  return Math.round(n).toLocaleString();
}

function salaryLine(job: RankedJob["job"]): string | null {
  if (job.salaryMin === undefined && job.salaryMax === undefined) return null;
  const lo = job.salaryMin;
  const hi = job.salaryMax;
  const range = lo !== undefined && hi !== undefined && hi !== lo ? `${money(lo)}–${money(hi)}` : money((lo ?? hi)!);
  return `${range} ${job.salaryCurrency ?? ""}${job.salaryPredicted ? " (est.)" : ""}`.trim();
}

/** Render a ranked list for the terminal, in the given language. */
export function renderResults(
  ranked: RankedJob[],
  source: JobSource,
  lang: Lang,
  limit = 10,
): string {
  const ui = UI[lang];
  if (ranked.length === 0) return ui.noJobs;

  const shown = Math.min(limit, ranked.length);
  const lines: string[] = [ui.topMatches(shown, source, ranked.length)];

  ranked.slice(0, limit).forEach((r, i) => {
    const { job } = r;
    const meta = [
      job.location ?? job.country,
      job.arrangement ? arrWord(job.arrangement, lang) : undefined,
      job.employmentType ? empWord(job.employmentType, lang) : undefined,
      salaryLine(job),
    ]
      .filter(Boolean)
      .join(" · ");

    lines.push(`${String(i + 1).padStart(2)}. [${String(r.score).padStart(3)}/100]  ${job.title} — ${job.company ?? "?"}`);
    if (meta) lines.push(`     ${meta}`);
    for (const reason of r.reasons.slice(0, 4)) lines.push(`     ✓ ${reason}`);
    for (const gap of r.gaps.slice(0, 2)) lines.push(`     ⚠ ${gap}`);
    if (job.url) lines.push(`     → ${job.url}`);
    lines.push("");
  });

  return lines.join("\n");
}
