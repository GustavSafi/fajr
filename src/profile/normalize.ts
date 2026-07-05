import { emptyProfile } from "../models/index.ts";
import type { UserProfile } from "../models/index.ts";

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * Coerce an untrusted parsed value (e.g. JSON the model produced) into a
 * well-formed UserProfile. Missing groups fall back to empty; unexpected shapes
 * are dropped rather than trusted. Expanded in the profile-building step.
 */
export function coerceProfile(raw: unknown): UserProfile {
  const base = emptyProfile();
  const r = asObject(raw);

  const profile = {
    careerGoals: { ...base.careerGoals, ...asObject(r["careerGoals"]) },
    experience: { ...base.experience, ...asObject(r["experience"]) },
    skills: { ...base.skills, ...asObject(r["skills"]) },
    education: { ...base.education, ...asObject(r["education"]) },
    preferences: { ...base.preferences, ...asObject(r["preferences"]) },
    location: { ...base.location, ...asObject(r["location"]) },
    languages: Array.isArray(r["languages"]) ? r["languages"] : base.languages,
    personal: { ...base.personal, ...asObject(r["personal"]) },
    summary: typeof r["summary"] === "string" ? r["summary"] : base.summary,
  };

  return profile as UserProfile;
}
