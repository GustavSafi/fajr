/**
 * Sajtens identitet utåt.
 *
 * `SITE_INDEXABLE` är en medveten säkerhetsspärr. Vi publicerar först på en
 * tillfällig vercel.app-adress, och det värsta som kan hända då är att Google
 * hinner indexera den: sedan sitter man med en domänflytt och delad auktoritet
 * innan sajten ens har ett riktigt namn. Därför är sajten stängd för sökmotorer
 * som förval, och öppnas med en enda miljövariabel när den riktiga domänen är
 * på plats.
 */

export const SITE_NAME = "Jobbare";

export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  // Vercel sätter den här automatiskt för varje deploy.
  const vercel = process.env.NEXT_PUBLIC_VERCEL_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;

  return "http://localhost:3000";
}

/** Sant bara när vi uttryckligen slagit på indexering. */
export function isIndexable(): boolean {
  return process.env.SITE_INDEXABLE === "1";
}
