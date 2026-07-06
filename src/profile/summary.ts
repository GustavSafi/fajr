import type { UserProfile } from "../models/index.ts";
import type { Lang } from "../i18n.ts";

function list(values: string[] | undefined, max = 4): string {
  if (!values || values.length === 0) return "";
  return values.slice(0, max).join(", ");
}

/**
 * Build a natural-language summary of the candidate from the structured
 * profile — a deterministic template in the interface language. No AI.
 */
export function buildSummary(p: UserProfile, lang: Lang): string {
  return lang === "sv" ? summarySv(p) : summaryEn(p);
}

function summaryEn(p: UserProfile): string {
  const parts: string[] = [];
  const roles = list(p.careerGoals.desiredRoles, 3);
  const years = p.experience.totalYears;
  if (roles) {
    parts.push(
      years !== undefined
        ? `A candidate with ${years} year${years === 1 ? "" : "s"} of experience seeking ${roles} roles.`
        : `A candidate seeking ${roles} roles.`,
    );
  }
  const skills = list([
    ...(p.skills.programmingLanguages ?? []),
    ...(p.skills.frameworks ?? []),
    ...(p.skills.technical ?? []),
  ]);
  if (skills) parts.push(`Key skills: ${skills}.`);
  if (p.experience.hasLeadership) parts.push("Has leadership experience.");
  const arrangements = list(p.preferences.arrangements);
  if (arrangements) parts.push(`Prefers ${arrangements} work.`);
  const where = list(p.location.cities?.length ? p.location.cities : p.location.countries);
  if (where) {
    parts.push(p.location.willingToRelocate ? `Based around ${where}, open to relocating.` : `Looking in ${where}.`);
  }
  if (p.preferences.salaryMin !== undefined) {
    parts.push(`Target salary from ${p.preferences.salaryMin.toLocaleString()} ${p.preferences.salaryCurrency ?? ""}`.trim() + ".");
  }
  const motivations = list(p.personal.motivations, 3);
  if (motivations) parts.push(`Motivated by ${motivations.toLowerCase()}.`);
  return parts.join(" ");
}

function summarySv(p: UserProfile): string {
  const parts: string[] = [];
  const roles = list(p.careerGoals.desiredRoles, 3);
  const years = p.experience.totalYears;
  if (roles) {
    parts.push(
      years !== undefined
        ? `En kandidat med ${years} års erfarenhet som söker jobb som ${roles}.`
        : `En kandidat som söker jobb som ${roles}.`,
    );
  }
  const skills = list([
    ...(p.skills.programmingLanguages ?? []),
    ...(p.skills.frameworks ?? []),
    ...(p.skills.technical ?? []),
  ]);
  if (skills) parts.push(`Viktiga kunskaper: ${skills}.`);
  if (p.experience.hasLeadership) parts.push("Har ledarskapserfarenhet.");
  const arrangements = list(p.preferences.arrangements);
  if (arrangements) parts.push(`Föredrar att arbeta ${arrangements}.`);
  const where = list(p.location.cities?.length ? p.location.cities : p.location.countries);
  if (where) {
    parts.push(p.location.willingToRelocate ? `Utgår från ${where}, öppen för att flytta.` : `Söker i ${where}.`);
  }
  if (p.preferences.salaryMin !== undefined) {
    parts.push(`Önskad lön från ${p.preferences.salaryMin.toLocaleString()} ${p.preferences.salaryCurrency ?? ""}`.trim() + ".");
  }
  const motivations = list(p.personal.motivations, 3);
  if (motivations) parts.push(`Motiveras av ${motivations.toLowerCase()}.`);
  return parts.join(" ");
}
