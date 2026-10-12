import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "../globals.css";
import { LOCALES, getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { isIndexable, siteUrl } from "@/lib/site";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "sv";
  const t = getDictionary(locale);

  return {
    metadataBase: new URL(siteUrl()),
    title: {
      default: `${t.brand} — ${t.tagline}`,
      template: `%s · ${t.brand}`,
    },
    description: t.heroBody,
    applicationName: t.brand,
    /*
     * Ingen canonical här. Metadata ärvs nedåt i Next, så en canonical i
     * rot-layouten skulle få varje annonssida att peka på startsidan — värsta
     * tänkbara signal till Google. Sätts per sida den dagen vi behöver den.
     */
    alternates: {
      languages: { sv: "/", en: "/en" },
    },
    openGraph: {
      siteName: t.brand,
      locale: locale === "sv" ? "sv_SE" : "en_GB",
      type: "website",
    },
    // Stängd för sökmotorer tills den riktiga domänen är på plats.
    robots: isIndexable() ? { index: true, follow: true } : { index: false, follow: false },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);

  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        {/* Typsnitten laddas självhostade från app/globals.css — inga externa anrop. */}
        <meta name="color-scheme" content="light dark" />
      </head>
      <body className="min-h-screen flex flex-col">
        <a
          href="#innehall"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-brand-contrast"
        >
          {t.skipToContent}
        </a>
        <SiteHeader locale={lang} />
        <main id="innehall" className="flex-1">
          {children}
        </main>
        <SiteFooter locale={lang} />
      </body>
    </html>
  );
}
