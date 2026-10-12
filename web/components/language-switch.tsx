"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DEFAULT_LOCALE, LOCALES, getDictionary, type Locale } from "@/lib/i18n";

/**
 * Språkbytaren stannar kvar på samma sida. Byter man språk mitt i en annons
 * ska man få samma annons på det andra språket, inte kastas ut till startsidan.
 *
 * Klientkomponent enbart för att den behöver veta vilken adress man står på.
 */
export function LanguageSwitch({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const pathname = usePathname() ?? "/";
  const other: Locale = locale === "sv" ? "en" : "sv";

  // Ta bort ett eventuellt språkprefix så vi står kvar på samma sida.
  let base = pathname;
  for (const l of LOCALES) {
    if (base === `/${l}`) base = "/";
    else if (base.startsWith(`/${l}/`)) base = base.slice(l.length + 1);
  }

  const href = other === DEFAULT_LOCALE ? base : `/${other}${base === "/" ? "" : base}`;

  return (
    <Link
      href={href}
      hrefLang={other}
      className="rounded-md px-3 py-2 text-ink-mute transition-colors hover:bg-sunk hover:text-ink"
    >
      {t.navLanguage}
    </Link>
  );
}
