import Link from "next/link";
import type { SearchParams } from "@/lib/types";
import { fill, getDictionary, path, type Locale } from "@/lib/i18n";
import { toQueryString, withPage } from "@/lib/search-params";

export function Pagination({
  params,
  page,
  totalPages,
  locale,
}: {
  params: SearchParams;
  page: number;
  totalPages: number;
  locale: Locale;
}) {
  if (totalPages <= 1) return null;
  const t = getDictionary(locale);

  const href = (p: number) => path(locale, `/jobb${toQueryString(withPage(params, p))}`);
  const button =
    "rounded-lg border border-line px-4 py-2 text-[14px] font-medium transition-colors";

  return (
    <nav
      aria-label={t.sortLabel}
      className="mt-8 flex items-center justify-between gap-4 border-t border-line pt-6"
    >
      {page > 1 ? (
        <Link href={href(page - 1)} rel="prev" className={`${button} hover:bg-sunk`}>
          ← {t.previous}
        </Link>
      ) : (
        <span className={`${button} cursor-not-allowed text-ink-mute/60`}>← {t.previous}</span>
      )}

      <span className="tnum text-[13.5px] text-ink-mute">
        {fill(t.pageOf, { page, total: totalPages })}
      </span>

      {page < totalPages ? (
        <Link href={href(page + 1)} rel="next" className={`${button} hover:bg-sunk`}>
          {t.next} →
        </Link>
      ) : (
        <span className={`${button} cursor-not-allowed text-ink-mute/60`}>{t.next} →</span>
      )}
    </nav>
  );
}
