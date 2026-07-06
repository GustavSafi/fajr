import type { JobSource, RankedJob } from "./models/index.ts";

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

/** Render a ranked list for the terminal. */
export function renderResults(ranked: RankedJob[], source: JobSource, limit = 10): string {
  if (ranked.length === 0) {
    return "No jobs found. Try broadening your answers (e.g. a different role or location).";
  }

  const lines: string[] = [];
  lines.push(`\nTop ${Math.min(limit, ranked.length)} matches from ${source} (of ${ranked.length} found):\n`);

  ranked.slice(0, limit).forEach((r, i) => {
    const { job } = r;
    const meta = [
      job.location ?? job.country ?? "location n/a",
      job.arrangement,
      job.employmentType,
      salaryLine(job),
    ]
      .filter(Boolean)
      .join(" · ");

    lines.push(`${String(i + 1).padStart(2)}. [${String(r.score).padStart(3)}/100]  ${job.title} — ${job.company ?? "?"}`);
    lines.push(`     ${meta}`);
    for (const reason of r.reasons.slice(0, 4)) lines.push(`     ✓ ${reason}`);
    for (const gap of r.gaps.slice(0, 2)) lines.push(`     ⚠ ${gap}`);
    if (job.url) lines.push(`     → ${job.url}`);
    lines.push("");
  });

  return lines.join("\n");
}
