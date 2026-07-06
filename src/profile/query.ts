import type { JobQuery, UserProfile } from "../models/index.ts";

/**
 * Distill the rich profile into the minimal query the job providers need.
 * Providers translate this further into their own parameters.
 */
export function buildJobQuery(profile: UserProfile, limit = 25): JobQuery {
  // Search term: primary desired role, else the industry. Role labels can be
  // dual like "Psykolog / Kurator" or "Data Engineer / Scientist" — keep the
  // part before the slash so the keyword search stays focused.
  const primary = profile.careerGoals.desiredRoles?.[0] ?? profile.careerGoals.industries?.[0] ?? "";
  const what = primary.split("/")[0]!.trim();

  const arrangements = profile.preferences.arrangements ?? [];
  const remoteOnly = arrangements.length === 1 && arrangements[0] === "remote";

  const query: JobQuery = { what, limit };
  if (remoteOnly) query.remoteOnly = true;
  if (profile.preferences.salaryMin !== undefined) {
    query.salaryMin = profile.preferences.salaryMin;
  }
  return query;
}
