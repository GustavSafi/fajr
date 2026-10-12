import type { MetadataRoute } from "next";
import { isIndexable, siteUrl } from "@/lib/site";
import { MUNICIPALITY_PAGES, OCCUPATION_PAGES } from "@/lib/landing/slugs";

/**
 * Kartan Google följer.
 *
 * Enskilda annonser ligger medvetet inte här: de är tiotusentals, de byts ut
 * varje dygn, och en sitemap full av döda länkar är sämre än ingen alls. Google
 * hittar dem ändå via sökresultaten och de liknande jobben på varje annonssida.
 *
 * Landningssidorna är tvärtom precis vad en sitemap är till för. De är stabila,
 * de är hundratals, och ingen av dem nås av en vanlig besökare som bara klickar
 * sig runt — utan den här listan skulle Google aldrig hitta
 * `/lon/takmontorer`.
 *
 * Bara de svenska versionerna listas. `/en/lon/...` finns och går att crawla,
 * men innehållet är svensk lönestatistik med svenska yrkesnamn; att trycka ut
 * 667 nästan identiska engelska sidor skulle bara späda ut sajten.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  if (!isIndexable()) return [];

  const base = siteUrl();
  const now = new Date();

  const core: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/jobb`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/en`, lastModified: now, changeFrequency: "daily", priority: 0.5 },
    { url: `${base}/en/jobb`, lastModified: now, changeFrequency: "hourly", priority: 0.4 },
  ];

  // Lönesidorna är det vi faktiskt kan ranka på — ingen annan svensk jobbsajt
  // svarar på "undersköterska lön" med riktig statistik.
  const salaries: MetadataRoute.Sitemap = OCCUPATION_PAGES.map((o) => ({
    url: `${base}/lon/${o.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const places: MetadataRoute.Sitemap = MUNICIPALITY_PAGES.map((m) => ({
    url: `${base}/lediga-jobb/${m.slug}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.7,
  }));

  return [...core, ...salaries, ...places];
}
