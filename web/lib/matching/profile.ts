import type { EmploymentType } from "@/lib/types";

/**
 * Matchningsprofilen — det användaren berättat om sig själv.
 *
 * Den bor i en vanlig cookie, inte i en databas. Skälet är att hela poängen
 * med gratisläget är att man ska kunna testa utan konto: ingen inloggning,
 * inget sparat hos oss, inget att radera. Cookien är förstapartsdata som
 * användaren själv skapat och som bara används för att ranka jobb — ingen
 * spårning, inget som lämnar servern.
 *
 * Profilen byggs stegvis. Steg 1 räcker för att ranka; steg 2 gör rankningen
 * bättre. Därför är varje fält frivilligt och poängsättningen hoppar över det
 * den inte vet något om.
 */

export const PROFILE_COOKIE = "jobbare_profil";

/** Cookies har 4 kB att röra sig med. Vi håller oss med god marginal under. */
const MAX_ITEMS = 12;
const MAX_LENGTH = 60;

export interface MatchProfile {
  /** Versionsnummer, så att ett formatbyte inte kraschar gamla besökare. */
  v: 1;
  /** Yrken eller roller man vill jobba med, som fritext. */
  roles?: string[];
  /** Taxonomins kommun-id. */
  municipalities?: string[];
  /** Antal års arbetslivserfarenhet. */
  years?: number;
  employment?: EmploymentType[];
  /** Vill kunna jobba på distans. */
  remote?: boolean;
  /** Kunskaper, verktyg, språk — fritext. */
  skills?: string[];
  /** Önskad månadslön i kronor. */
  salaryMin?: number;
}

export const EMPTY_PROFILE: MatchProfile = { v: 1 };

function cleanList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out = [
    ...new Set(
      value
        .filter((v): v is string => typeof v === "string")
        .map((v) => v.trim().slice(0, MAX_LENGTH))
        .filter(Boolean),
    ),
  ].slice(0, MAX_ITEMS);
  return out.length ? out : undefined;
}

const EMPLOYMENT: EmploymentType[] = ["full-time", "part-time", "contract", "internship"];

/**
 * Läser en profil ur okänd data. Allt valideras — cookien kommer från
 * webbläsaren och ska behandlas som vilken inmatning som helst.
 */
export function parseProfile(raw: unknown): MatchProfile {
  if (!raw || typeof raw !== "object") return EMPTY_PROFILE;
  const input = raw as Record<string, unknown>;
  const profile: MatchProfile = { v: 1 };

  const roles = cleanList(input.roles);
  if (roles) profile.roles = roles;

  const municipalities = cleanList(input.municipalities);
  if (municipalities) profile.municipalities = municipalities;

  const skills = cleanList(input.skills);
  if (skills) profile.skills = skills;

  if (typeof input.years === "number" && input.years >= 0 && input.years <= 60) {
    profile.years = Math.round(input.years);
  }

  if (Array.isArray(input.employment)) {
    const types = input.employment.filter((t): t is EmploymentType =>
      EMPLOYMENT.includes(t as EmploymentType),
    );
    if (types.length) profile.employment = [...new Set(types)];
  }

  if (typeof input.remote === "boolean") profile.remote = input.remote;

  if (typeof input.salaryMin === "number" && input.salaryMin > 0 && input.salaryMin < 1_000_000) {
    profile.salaryMin = Math.round(input.salaryMin);
  }

  return profile;
}

export function parseProfileCookie(value: string | undefined): MatchProfile {
  if (!value) return EMPTY_PROFILE;
  try {
    return parseProfile(JSON.parse(decodeURIComponent(value)));
  } catch {
    return EMPTY_PROFILE;
  }
}

export function serializeProfile(profile: MatchProfile): string {
  return encodeURIComponent(JSON.stringify(profile));
}

/** Tom profil = ingen matchning att visa. */
export function hasProfile(profile: MatchProfile): boolean {
  return Boolean(
    profile.roles?.length ||
      profile.skills?.length ||
      profile.municipalities?.length ||
      profile.years !== undefined,
  );
}

/**
 * Hur komplett profilen är, 0–1. Driver "fyll i mer för bättre matchning" —
 * och är ärlig: fält som faktiskt påverkar rankningen väger tyngst.
 */
export function profileCompleteness(profile: MatchProfile): number {
  const checks = [
    Boolean(profile.roles?.length),
    Boolean(profile.municipalities?.length),
    profile.years !== undefined,
    Boolean(profile.employment?.length),
    Boolean(profile.skills?.length),
    profile.salaryMin !== undefined,
  ];
  return checks.filter(Boolean).length / checks.length;
}
