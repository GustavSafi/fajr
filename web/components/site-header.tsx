import Link from "next/link";
import { getDictionary, path, type Locale } from "@/lib/i18n";
import { BrandMark } from "./brand-mark";
import { LanguageSwitch } from "./language-switch";

export function SiteHeader({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ground/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link
          href={path(locale, "/")}
          className="flex items-center gap-2 text-ink transition-colors hover:text-brand"
        >
          <BrandMark className="h-7 w-7 text-brand" />
          <span className="font-display text-[19px] font-semibold tracking-tight">{t.brand}</span>
        </Link>

        <nav className="ml-auto flex items-center gap-1 text-[14.5px]">
          <Link
            href={path(locale, "/jobb")}
            className="rounded-md px-3 py-2 text-ink-soft transition-colors hover:bg-sunk hover:text-ink"
          >
            {t.navSearch}
          </Link>
          <Link
            href={path(locale, "/profil")}
            className="rounded-md px-3 py-2 text-ink-soft transition-colors hover:bg-sunk hover:text-ink"
          >
            {t.navProfile}
          </Link>
          <LanguageSwitch locale={locale} />
        </nav>
      </div>
    </header>
  );
}
