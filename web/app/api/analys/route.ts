import { NextResponse, type NextRequest } from "next/server";
import { getJob } from "@/lib/jobtech/client";
import { isLocale, type Locale } from "@/lib/i18n";
import { PROFILE_COOKIE, hasProfile, parseProfileCookie } from "@/lib/matching/profile";
import { analyseJob } from "@/lib/ai/analysis";
import {
  FREE_TRIAL_LIMIT,
  FREE_TRIAL_WINDOW_SECONDS,
  freeTrialAvailable,
  limitStore,
} from "@/lib/limits";
import { TRIAL_COOKIE, clientIp, visitorKey } from "@/lib/limits/identity";

/**
 * Djupanalysen av ett jobb.
 *
 * Ordningen i den här filen är inte godtycklig. Allt som kan säga nej gör det
 * **innan** modellen anropas, för det är anropet som kostar pengar. Profilen
 * kollas före kvoten, kvoten före annonsen, annonsen före modellen.
 *
 * Rättigheter idag: ingen har konto, så alla är anonyma och får ett (1) försök
 * någonsin. När abonnemangen finns är det här enda stället som behöver veta
 * om det — abonnent hoppar över kvoten, inloggad utan abonnemang får nej.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  jobId?: unknown;
  lang?: unknown;
}

function fail(reason: string, status: number) {
  return NextResponse.json({ ok: false, reason }, { status });
}

export async function POST(request: NextRequest) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return fail("bad-request", 400);
  }

  const jobId = typeof body.jobId === "string" ? body.jobId.trim() : "";
  if (!jobId) return fail("bad-request", 400);

  const locale: Locale = typeof body.lang === "string" && isLocale(body.lang) ? body.lang : "sv";

  // 1. Utan profil finns ingenting att jämföra annonsen mot.
  const profile = parseProfileCookie(request.cookies.get(PROFILE_COOKIE)?.value);
  if (!hasProfile(profile)) return fail("no-profile", 400);

  /*
   * 2. Gratisförsöket.
   *
   * Cookien är första spärren och kostar inget att läsa. Den är trivial att
   * rensa, därför finns kvoten på saltad IP bakom den — och i produktion utan
   * en delad räknare stängs gratisförsöket hellre av än står öppet.
   */
  /*
   * Under utveckling går spärren att stänga av med AI_TRIAL_OFF=1. Cookien är
   * httpOnly och går därför inte att rensa från konsolen, och utan den här
   * ventilen kan man testa analysen exakt en gång per webbläsare. Villkoret
   * kollar NODE_ENV, så flaggan har ingen verkan i produktion.
   */
  const trialGate = !(process.env.NODE_ENV !== "production" && process.env.AI_TRIAL_OFF === "1");

  if (trialGate) {
    if (request.cookies.get(TRIAL_COOKIE)) return fail("trial-used", 402);
    if (!freeTrialAvailable()) return fail("trial-closed", 503);
  }

  const store = limitStore();
  const key = visitorKey(clientIp(request.headers));
  if (trialGate) {
    const quota = await store.consume(key, FREE_TRIAL_LIMIT, FREE_TRIAL_WINDOW_SECONDS);
    if (!quota.allowed) return fail("trial-used", 402);
  }

  // 3. Annonsen. Misslyckas den har vi inte kostat något — ge tillbaka försöket.
  const giveBack = async () => {
    if (trialGate) await store.refund(key, FREE_TRIAL_WINDOW_SECONDS);
  };

  const job = await getJob(jobId);
  if (!job) {
    await giveBack();
    return fail("job-not-found", 404);
  }
  if (job.archived) {
    await giveBack();
    return fail("job-archived", 410);
  }

  // 4. Nu först kostar det pengar.
  const result = await analyseJob(job, profile, locale);

  if (!result.ok) {
    // Vårt haveri, inte besökarens. Försöket ska finnas kvar.
    await giveBack();
    return fail(result.reason, 502);
  }

  const response = NextResponse.json({ ok: true, analysis: result.analysis });
  if (!trialGate) return response;
  response.cookies.set(TRIAL_COOKIE, "1", {
    path: "/",
    maxAge: FREE_TRIAL_WINDOW_SECONDS,
    sameSite: "lax",
    httpOnly: true,
  });
  return response;
}
