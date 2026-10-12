import type { MetadataRoute } from "next";
import { isIndexable, siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();

  // Innan den riktiga domänen finns stänger vi dörren helt.
  if (!isIndexable()) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Sökningar med filter är oändligt många kombinationer och har inget
        // eget värde i Googles index — landningssidorna är det som ska ranka.
        disallow: ["/jobb?", "/en/jobb?"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
