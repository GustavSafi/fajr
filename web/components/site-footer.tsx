import Link from "next/link";
import { getDictionary, path, type Locale } from "@/lib/i18n";
import { MAJOR_MUNICIPALITIES, POPULAR_OCCUPATIONS } from "@/lib/landing/slugs";
import { BrandMark } from "./brand-mark";

/**
 * Sidfoten är också vägen in till landningssidorna.
 *
 * Utan de här länkarna når man `/lon/underskoterskor` bara via sitemapen —
 * och en sida som ingen länkar till internt behandlar Google därefter, hur
 * bra den än är. Tolv yrken och tolv kommuner räcker: de i sin tur länkar
 * vidare till resten.
 */
export function SiteFooter({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const occupations = POPULAR_OCCUPATIONS.slice(0, 12);

  return (
    <footer className="mt-20 border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2">
          <nav>
            <h2 className="font-display text-[13px] font-semibold uppercase tracking-wide text-ink-soft">
              {t.footerSalaries}
            </h2>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-ink-mute">
              {occupations.map((o) => (
                <li key={o.slug}>
                  <Link href={path(locale, `/lon/${o.slug}`)} className="hover:text-brand">
                    {o.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav>
            <h2 className="font-display text-[13px] font-semibold uppercase tracking-wide text-ink-soft">
              {t.footerPlaces}
            </h2>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-ink-mute">
              {MAJOR_MUNICIPALITIES.map((m) => (
                <li key={m.slug}>
                  <Link href={path(locale, `/lediga-jobb/${m.slug}`)} className="hover:text-brand">
                    {m.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-9 flex flex-col gap-4 border-t border-line pt-7 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-ink-mute">
            <BrandMark className="h-5 w-5" />
            <span className="font-display text-[15px] font-medium text-ink-soft">{t.brand}</span>
          </div>
          <p className="max-w-md text-[13px] leading-relaxed text-ink-mute">
            {t.footerSource}{" "}
            <a
              href="https://jobtechdev.se"
              rel="noopener noreferrer nofollow"
              target="_blank"
              className="underline decoration-line-strong underline-offset-2 transition-colors hover:text-brand"
            >
              JobTech Dev
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
