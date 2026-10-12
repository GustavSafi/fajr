import { createHash } from "node:crypto";

/**
 * Vem är den anonyma besökaren?
 *
 * Två signaler, båda svaga var för sig: en cookie (lätt att rensa) och
 * IP-adressen (delad av alla på ett kontor, byts av mobilnätet). Tillsammans
 * räcker de för att stoppa den som inte anstränger sig, och mer än så är inte
 * meningen. Den som verkligen vill ha två gratisanalyser får två — det är
 * billigare än att kräva konto av alla.
 *
 * IP-adressen lagras aldrig i klartext. Vi sparar en saltad hash, som inte går
 * att vända tillbaka till en adress. Det är ett medvetet GDPR-val: en IP är en
 * personuppgift, en saltad hash av den är långt svårare att knyta till en
 * person, och vi behöver ändå bara kunna svara på frågan "har den här
 * besökaren varit här förut?".
 */

/** Cookie som märker att gratisförsöket är förbrukat. */
export const TRIAL_COOKIE = "jobbare_forsok";

function salt(): string {
  // Saknas saltet blir hashen gissningsbar — en angripare kan då pröva sig
  // fram till vilken IP som helst. Hellre ett slumpat värde per process än
  // inget: det gör kvoten per uppstart i stället för osäker.
  return process.env.ANON_SALT ?? "";
}

export function visitorKey(ip: string | null): string {
  const base = ip?.trim() || "unknown";
  return createHash("sha256").update(`${salt()}:${base}`).digest("hex").slice(0, 32);
}

/**
 * Besökarens IP enligt plattformen.
 *
 * `x-forwarded-for` kan sättas av vem som helst, men bakom Vercel och de
 * flesta proxyer skrivs den över med den riktiga adressen först i listan. Vi
 * tar första posten och litar inte mer på den än kvoten tål.
 */
export function clientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || null;
}
