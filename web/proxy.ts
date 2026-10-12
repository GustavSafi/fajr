import { NextResponse, type NextRequest } from "next/server";

/**
 * Svenska ligger på rot (/jobb), engelska under prefix (/en/jobb). Internt
 * lever båda under app/[lang]/, så vi skriver om de oprefixade adresserna till
 * /sv utan att ändra vad användaren ser i adressfältet.
 *
 * Omskrivning, inte omdirigering: URL:en förblir ren och Google ser en
 * kanonisk adress per språk.
 *
 * Konstanterna står med flit här i stället för att importeras — proxyn kan
 * köras på en CDN-nod, skild från renderingskoden, och ska inte dra in
 * applikationsmoduler. Ändrar du LOCALES i lib/i18n.ts, ändra även här.
 */

const LOCALES = ["sv", "en"] as const;
const DEFAULT_LOCALE = "sv";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasLocale = LOCALES.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  if (hasLocale) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = `/${DEFAULT_LOCALE}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Hoppar över _next, API-rutter och allt som ser ut som en fil.
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
