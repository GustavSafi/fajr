"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getDictionary, path, type Locale } from "@/lib/i18n";
import { PROFILE_COOKIE } from "@/lib/matching/profile";
import type { JobAnalysis, Verdict } from "@/lib/ai/analysis";

/**
 * Djupanalysen på annonssidan.
 *
 * Panelen gör tre saker i tur och ordning: säljer in vad analysen är, hämtar
 * den när man ber om det, och visar svaret. Den gör ingenting förrän man
 * klickar — varje körning kostar pengar, och en analys som startar av sig
 * själv när sidan laddas vore en räkning per besökare.
 *
 * Att den läser profilcookien själv, i stället för att få veta av servern, är
 * inte en omväg: annonssidan är ISR-cachad och delas av alla. Läste den
 * cookies skulle den bli serverrenderad per besök, och det är den sidtyp
 * Google kommer att hämta mest av alla.
 */

type State =
  | { phase: "idle" }
  | { phase: "running" }
  | { phase: "done"; analysis: JobAnalysis }
  | { phase: "error"; reason: string };

function verdictLabel(verdict: Verdict, t: ReturnType<typeof getDictionary>): string {
  switch (verdict) {
    case "stark":
      return t.aiVerdictStark;
    case "mojlig":
      return t.aiVerdictMojlig;
    case "svag":
      return t.aiVerdictSvag;
    case "utesluten":
      return t.aiVerdictUtesluten;
  }
}

/**
 * Bara ett positivt omdöme får accentfärgen.
 *
 * Frestelsen är att färga ett nej rött, men designsystemet sparar varmt för
 * brådska och ett nej är inte en varning — det är ett svar. Typografin får
 * bära tyngden i stället.
 */
function verdictTone(verdict: Verdict): string {
  return verdict === "stark"
    ? "border-brand/40 bg-brand-wash text-brand"
    : "border-line bg-sunk text-ink";
}

export function AiAnalysis({ jobId, locale }: { jobId: string; locale: Locale }) {
  const t = getDictionary(locale);
  const [state, setState] = useState<State>({ phase: "idle" });
  /*
   * null tills vi hunnit titta. Fram till dess visar vi den vanliga knappen —
   * de flesta har en profil, och att först blinka till med "fyll i profilen"
   * för dem som redan gjort det vore sämre än att upptäcka det vid klicket.
   */
  const [missingProfile, setMissingProfile] = useState(false);

  useEffect(() => {
    const has = document.cookie
      .split("; ")
      .some((c) => c.startsWith(`${PROFILE_COOKIE}=`) && c.length > PROFILE_COOKIE.length + 1);
    setMissingProfile(!has);
  }, []);

  async function run() {
    setState({ phase: "running" });
    try {
      const res = await fetch("/api/analys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jobId, lang: locale }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        analysis?: JobAnalysis;
        reason?: string;
      };
      if (data.ok && data.analysis) {
        setState({ phase: "done", analysis: data.analysis });
      } else if (data.reason === "no-profile") {
        // Cookien kan ha rensats i en annan flik sedan sidan laddades.
        setMissingProfile(true);
        setState({ phase: "idle" });
      } else {
        setState({ phase: "error", reason: data.reason ?? "error" });
      }
    } catch {
      setState({ phase: "error", reason: "error" });
    }
  }

  const card = "mt-6 rounded-xl border border-line bg-surface p-5";

  if (missingProfile) {
    return (
      <section className={card}>
        <h2 className="font-display text-[18px] font-semibold">{t.aiTitle}</h2>
        <p className="mt-2 max-w-[60ch] text-[14.5px] leading-relaxed text-ink-soft">{t.aiBody}</p>
        <p className="mt-4 text-[14.5px] font-medium text-ink">{t.aiNeedProfile}</p>
        <p className="mt-0.5 text-[13.5px] text-ink-mute">{t.aiNeedProfileBody}</p>
        <Link
          href={path(locale, "/profil")}
          className="mt-4 inline-block rounded-lg bg-brand px-5 py-2.5 font-display text-[14.5px] font-semibold text-brand-contrast transition-colors hover:bg-brand-hover"
        >
          {t.aiNeedProfileCta}
        </Link>
      </section>
    );
  }

  if (state.phase === "idle" || state.phase === "running") {
    return (
      <section className={card}>
        <h2 className="font-display text-[18px] font-semibold">{t.aiTitle}</h2>
        <p className="mt-2 max-w-[60ch] text-[14.5px] leading-relaxed text-ink-soft">{t.aiBody}</p>
        <button
          type="button"
          onClick={run}
          disabled={state.phase === "running"}
          className="mt-4 inline-block rounded-lg bg-brand px-5 py-2.5 font-display text-[14.5px] font-semibold text-brand-contrast transition-colors hover:bg-brand-hover disabled:opacity-60"
        >
          {state.phase === "running" ? t.aiRunning : t.aiCta}
        </button>
        {state.phase === "idle" && (
          <p className="mt-2 text-[13px] text-ink-mute">{t.aiFree}</p>
        )}
      </section>
    );
  }

  if (state.phase === "error") {
    const used = state.reason === "trial-used";
    const closed = state.reason === "trial-closed";
    const title = used ? t.aiErrorUsed : closed ? t.aiErrorClosed : t.aiErrorGeneric;
    const body = used ? t.aiErrorUsedBody : closed ? "" : t.aiErrorGenericBody;

    return (
      <section className={card}>
        <h2 className="font-display text-[18px] font-semibold">{title}</h2>
        {body && <p className="mt-2 text-[14.5px] text-ink-soft">{body}</p>}
        {!used && !closed && (
          <button
            type="button"
            onClick={run}
            className="mt-4 inline-block rounded-lg border border-line px-4 py-2 text-[14px] font-medium transition-colors hover:bg-sunk"
          >
            {t.aiRetry}
          </button>
        )}
      </section>
    );
  }

  const a = state.analysis;

  return (
    <section className={card}>
      <h2 className="font-display text-[18px] font-semibold">{t.aiTitle}</h2>

      <div
        className={`mt-4 rounded-lg border px-4 py-3.5 ${verdictTone(a.verdict)}`}
      >
        <p className="font-display text-[11px] font-semibold uppercase tracking-wide opacity-70">
          {t.aiVerdict}
        </p>
        <p className="mt-1 font-display text-[19px] font-semibold">
          {verdictLabel(a.verdict, t)}
        </p>
        <p className="mt-1.5 max-w-[60ch] text-[14.5px] leading-relaxed">{a.headline}</p>
      </div>

      {a.strengths.length > 0 && (
        <div className="mt-6">
          <h3 className="font-display text-[14px] font-semibold">{t.aiStrengths}</h3>
          <ul className="mt-2.5 flex flex-col gap-2.5">
            {a.strengths.map((s, i) => (
              <li key={i} className="text-[14.5px] leading-relaxed">
                <span className="text-ink">{s.point}</span>{" "}
                <span className="text-ink-mute">{s.evidence}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {a.gaps.length > 0 && (
        <div className="mt-6">
          <h3 className="font-display text-[14px] font-semibold">{t.aiGaps}</h3>
          <ul className="mt-2.5 flex flex-col gap-2.5">
            {a.gaps.map((g, i) => (
              <li key={i} className="text-[14.5px] leading-relaxed">
                {g.blocking && (
                  <span className="mr-2 inline-block rounded border border-line-strong px-1.5 py-0.5 align-[2px] font-display text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                    {t.aiBlocking}
                  </span>
                )}
                <span className="text-ink">{g.point}</span>{" "}
                <span className="text-ink-mute">{g.whatHelps}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {a.unknowns.length > 0 && (
        <div className="mt-6 rounded-lg bg-sunk px-4 py-3.5">
          <h3 className="font-display text-[14px] font-semibold">{t.aiUnknowns}</h3>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-4 text-[14px] text-ink-soft">
            {a.unknowns.map((u, i) => (
              <li key={i}>{u}</li>
            ))}
          </ul>
          <p className="mt-2.5 max-w-[60ch] text-[13px] text-ink-mute">{t.aiUnknownsHelp}</p>
          <Link
            href={path(locale, "/profil")}
            className="mt-2 inline-block text-[13.5px] font-medium text-brand hover:underline"
          >
            {t.aiNeedProfileCta}
          </Link>
        </div>
      )}

      <div className="mt-6 border-t border-line pt-4">
        <h3 className="font-display text-[14px] font-semibold">{t.aiAdvice}</h3>
        <p className="mt-1.5 max-w-[60ch] text-[14.5px] leading-relaxed text-ink-soft">
          {a.advice}
        </p>
      </div>

      <p className="mt-5 max-w-[62ch] text-[12.5px] leading-relaxed text-ink-mute">
        {t.aiDisclaimer}
      </p>
    </section>
  );
}
