import type { Job } from "@/lib/types";
import type { Locale } from "@/lib/i18n";
import type { MatchProfile } from "@/lib/matching/profile";
import { medianFor } from "@/lib/scb/salaries";
import { municipalityLabel } from "@/lib/jobtech/places";
import { complete, isAiMock } from "./provider";

/**
 * Djupanalysen: ska jag söka det här jobbet?
 *
 * Det här är produkten folk betalar för, och den står och faller med en enda
 * sak — att den vågar säga nej. En analys som tycker att varje jobb är värt
 * att söka säger ingenting, och då är ett högt betyg inte värt något heller.
 *
 * Den farligaste felkällan är inte att modellen är för sträng utan att den
 * **blandar ihop "saknar" med "har inte berättat"**. Profilen är kort med
 * flit: fyra frågor för att komma igång. Att då skriva "du saknar
 * undersköterskeutbildning" till någon som bara inte fyllt i sin utbildning
 * är en lögn som kan kosta personen ett jobb. Därför har svaret ett eget fält
 * för det vi inte vet, och systemprompten lägger större delen av sin text på
 * just den skillnaden.
 */

export type Verdict = "stark" | "mojlig" | "svag" | "utesluten";

export interface AnalysisStrength {
  /** Vad som talar för personen. */
  point: string;
  /** Var det står — i annonsen eller i profilen. Håller modellen ärlig. */
  evidence: string;
}

export interface AnalysisGap {
  point: string;
  /** Sant bara när annonsen uttryckligen gör det till ett krav. */
  blocking: boolean;
  /** Vad som skulle krävas för att täppa till luckan. */
  whatHelps: string;
}

export interface JobAnalysis {
  verdict: Verdict;
  /** En mening som svarar på frågan. */
  headline: string;
  strengths: AnalysisStrength[];
  gaps: AnalysisGap[];
  /** Det profilen inte säger något om, och som därför inte gick att bedöma. */
  unknowns: string[];
  advice: string;
}

export type AnalysisOutcome =
  | { ok: true; analysis: JobAnalysis; cost: { inputTokens: number; outputTokens: number } }
  | { ok: false; reason: string };

/**
 * Annonstexten kapas. En annons på 20 000 tecken är nästan alltid
 * koncernpresentation efter de första par tusen, och vi betalar per tecken.
 */
const MAX_AD_CHARS = 6000;

const VERDICTS: Verdict[] = ["stark", "mojlig", "svag", "utesluten"];

function clip(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > max ? `${trimmed.slice(0, max).trimEnd()}…` : trimmed;
}

/**
 * Tar emot modellens JSON och släpper bara igenom det som har rätt form.
 *
 * Hellre ett fält mindre än ett påhittat. Blir svaret obrukbart visar vi ett
 * fel i stället för halv information som ser hel ut.
 */
export function parseAnalysis(raw: string): JobAnalysis | null {
  let data: unknown;
  try {
    // Modellen kan ha lagt JSON i en kodruta trots instruktionen.
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    data = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }

  if (typeof data !== "object" || data === null) return null;
  const o = data as Record<string, unknown>;

  const verdict = VERDICTS.includes(o.verdict as Verdict) ? (o.verdict as Verdict) : null;
  const headline = clip(o.headline, 200);
  const advice = clip(o.advice, 600);
  if (!verdict || !headline || !advice) return null;

  const strengths: AnalysisStrength[] = Array.isArray(o.strengths)
    ? o.strengths
        .map((item) => {
          const s = item as Record<string, unknown>;
          const point = clip(s?.point, 200);
          const evidence = clip(s?.evidence, 240);
          return point && evidence ? { point, evidence } : null;
        })
        .filter((s): s is AnalysisStrength => s !== null)
        .slice(0, 5)
    : [];

  const gaps: AnalysisGap[] = Array.isArray(o.gaps)
    ? o.gaps
        .map((item) => {
          const g = item as Record<string, unknown>;
          const point = clip(g?.point, 200);
          const whatHelps = clip(g?.whatHelps, 240);
          return point && whatHelps
            ? { point, blocking: g?.blocking === true, whatHelps }
            : null;
        })
        .filter((g): g is AnalysisGap => g !== null)
        .slice(0, 5)
    : [];

  const unknowns: string[] = Array.isArray(o.unknowns)
    ? o.unknowns
        .map((u) => clip(u, 160))
        .filter((u): u is string => u !== null)
        .slice(0, 5)
    : [];

  // En analys utan både styrkor och luckor har inte sagt någonting.
  if (strengths.length === 0 && gaps.length === 0) return null;

  return { verdict, headline, strengths, gaps, unknowns, advice };
}

const SYSTEM_SV = `Du bedömer om en arbetssökande bör söka ett visst jobb. Du skriver på svenska, direkt till personen, med du-tilltal.

DIN VIKTIGASTE REGEL
Skilj alltid på vad personen SAKNAR och vad personen INTE HAR BERÄTTAT.

Profilen du får är kort med flit — den som fyller i den har svarat på fyra frågor, inte skrivit ett CV. Att annonsen kräver en utbildning som profilen inte nämner betyder INTE att personen saknar den. Det betyder att du inte vet.

- Vet du inte: skriv det i "unknowns". Aldrig i "gaps".
- Står det uttryckligen i profilen att något saknas, eller går det logiskt att sluta sig till (annonsen kräver fem års erfarenhet, profilen säger ett år): då är det en "gap".

Att påstå att någon saknar en kvalifikation hen faktiskt har kan kosta personen ett jobb. Gissa aldrig åt det hållet.

ÖVRIGA REGLER
- Använd bara det som står i annonsen och i profilen. Hitta aldrig på krav som annonsen inte ställer, och aldrig meriter profilen inte nämner.
- "blocking": true bara när annonsen uttryckligen gör något till ett krav ("krav", "du måste ha", "legitimation krävs"). Önskemål och "meriterande" är inte krav.
- Varje styrka ska ha ett "evidence" som pekar på var det står: ett citat eller en tydlig hänvisning till annonsen eller profilen.
- Var konkret. "Du har relevant erfarenhet" säger ingenting. "Du har tre års erfarenhet, annonsen vill ha minst två" säger något.
- Ingen uppmuntran, inga artighetsfraser, inget "lycka till". Personen betalar för ett omdöme, inte för beröm.
- Säg nej när det är nej. En analys som tycker att varje jobb är värt att söka är värdelös.

BETYGSSKALAN
- "stark": profilen matchar kraven väl, inget som hindrar.
- "mojlig": vettig ansökan, men något väger emot eller är oklart.
- "svag": mycket talar emot, ansökan går sannolikt inte vidare.
- "utesluten": annonsen ställer ett uttryckligt krav som profilen visar att personen inte uppfyller.

SVARSFORMAT
Svara med enbart JSON, ingen text runtomkring:
{
  "verdict": "stark" | "mojlig" | "svag" | "utesluten",
  "headline": "en mening som svarar på om personen bör söka",
  "strengths": [{ "point": "...", "evidence": "..." }],
  "gaps": [{ "point": "...", "blocking": true/false, "whatHelps": "vad som skulle krävas" }],
  "unknowns": ["det du inte kunde bedöma för att profilen inte säger något om det"],
  "advice": "vad personen konkret bör göra"
}
Högst fem poster i varje lista. Tomma listor är tillåtna utom att strengths och gaps inte får vara tomma samtidigt.`;

const SYSTEM_EN = `You judge whether a job seeker should apply for a specific job. Write in English, addressed directly to the person.

YOUR MOST IMPORTANT RULE
Always distinguish between what the person LACKS and what the person HAS NOT TOLD YOU.

The profile you receive is deliberately short — the person answered four questions, they did not write a CV. If the ad requires a qualification the profile does not mention, that does NOT mean the person lacks it. It means you do not know.

- You do not know: put it in "unknowns". Never in "gaps".
- The profile explicitly shows a shortfall, or one follows logically (the ad requires five years, the profile says one): that is a "gap".

Claiming someone lacks a qualification they actually hold can cost them a job. Never guess in that direction.

OTHER RULES
- Use only what is in the ad and the profile. Never invent requirements the ad does not state, or credentials the profile does not mention.
- "blocking": true only when the ad explicitly makes something a requirement. Preferences and "meriting" are not requirements.
- Every strength needs "evidence" pointing to where it says so: a quote or a clear reference to the ad or the profile.
- Be concrete. "You have relevant experience" says nothing. "You have three years, the ad asks for at least two" says something.
- No encouragement, no pleasantries, no "good luck". The person is paying for a judgement, not for praise.
- Say no when it is no. An analysis that finds every job worth applying for is worthless.

THE SCALE
- "stark": the profile matches the requirements well, nothing in the way.
- "mojlig": a reasonable application, but something weighs against it or is unclear.
- "svag": much weighs against it, the application will probably not go further.
- "utesluten": the ad states an explicit requirement the profile shows the person does not meet.

RESPONSE FORMAT
Reply with JSON only, no surrounding text:
{
  "verdict": "stark" | "mojlig" | "svag" | "utesluten",
  "headline": "one sentence answering whether they should apply",
  "strengths": [{ "point": "...", "evidence": "..." }],
  "gaps": [{ "point": "...", "blocking": true/false, "whatHelps": "what it would take" }],
  "unknowns": ["what you could not judge because the profile says nothing about it"],
  "advice": "what the person should concretely do"
}
At most five entries per list. Empty lists are allowed, except that strengths and gaps must not both be empty.`;

function profileBlock(profile: MatchProfile, locale: Locale): string {
  const sv = locale === "sv";
  const lines: string[] = [];
  const add = (label: string, value: string | undefined | null) => {
    if (value) lines.push(`${label}: ${value}`);
  };

  add(sv ? "Vill jobba som" : "Wants to work as", profile.roles?.join(", "));
  add(
    sv ? "Vill jobba i" : "Wants to work in",
    (profile.municipalities ?? [])
      .map((id) => municipalityLabel(id))
      .filter(Boolean)
      .join(", ") || null,
  );
  if (profile.years !== undefined) {
    add(sv ? "Års arbetslivserfarenhet" : "Years of work experience", String(profile.years));
  }
  add(sv ? "Kunskaper och intyg" : "Skills and certificates", profile.skills?.join(", "));
  add(sv ? "Söker anställningsform" : "Looking for", profile.employment?.join(", "));
  if (profile.remote) lines.push(sv ? "Vill kunna jobba på distans" : "Wants remote work");
  if (profile.salaryMin) {
    add(sv ? "Önskad månadslön" : "Desired monthly salary", `${profile.salaryMin} kr`);
  }

  if (lines.length === 0) return sv ? "(profilen är tom)" : "(the profile is empty)";

  /*
   * Listan över vad profilen INTE innehåller är inte en artighet — det är
   * den som hindrar modellen från att läsa tystnad som ett nej.
   */
  const missing: string[] = [];
  if (!profile.skills?.length) missing.push(sv ? "kunskaper och intyg" : "skills and certificates");
  if (profile.years === undefined) missing.push(sv ? "erfarenhet" : "experience");
  missing.push(sv ? "utbildning" : "education");
  missing.push(sv ? "tidigare arbetsgivare" : "previous employers");
  missing.push(sv ? "språk" : "languages");

  const note = sv
    ? `\n\nProfilen säger ingenting om: ${missing.join(", ")}. Det betyder att du inte vet, inte att det saknas.`
    : `\n\nThe profile says nothing about: ${missing.join(", ")}. That means you do not know, not that it is missing.`;

  return lines.join("\n") + note;
}

function jobBlock(job: Job, locale: Locale): string {
  const sv = locale === "sv";
  const lines: string[] = [];
  const add = (label: string, value: string | undefined | null) => {
    if (value) lines.push(`${label}: ${value}`);
  };

  add(sv ? "Rubrik" : "Title", job.headline);
  add(sv ? "Arbetsgivare" : "Employer", job.employer);
  add(sv ? "Ort" : "Location", job.municipality);
  add(sv ? "Yrke enligt annonsen" : "Occupation per the ad", job.occupation);
  add(sv ? "Omfattning" : "Extent", job.employmentLabel);
  add(sv ? "Uttalade krav" : "Stated requirements", job.requiredSkills.join(", "));
  add(sv ? "Meriterande" : "Preferred", job.preferredSkills.join(", "));
  add(sv ? "Krävd erfarenhet" : "Required experience", job.requiredExperience.join(", "));
  if (job.drivingLicenceRequired) lines.push(sv ? "Körkort krävs" : "Driving licence required");
  if (job.experienceRequired === false) {
    lines.push(sv ? "Ingen tidigare erfarenhet krävs" : "No previous experience required");
  }

  const median = medianFor(job.ssyk, job.employer);
  if (median) {
    lines.push(
      sv
        ? `Medianlön i yrket enligt SCB: ${median} kr/mån (statistik, inte annonsens lön)`
        : `Median salary for the occupation per Statistics Sweden: ${median} SEK/month (statistics, not the ad's pay)`,
    );
  }

  const text = job.description.slice(0, MAX_AD_CHARS);
  lines.push(`\n${sv ? "Annonstext" : "Ad text"}:\n${text}`);

  return lines.join("\n");
}

function mockAnalysis(job: Job, profile: MatchProfile): JobAnalysis {
  const role = profile.roles?.[0] ?? "yrket";
  return {
    verdict: "mojlig",
    headline: `Värt att söka, men annonsen ställer ett krav som din profil inte svarar på. (MOCK — ingen modell har körts.)`,
    strengths: [
      {
        point: `Du vill jobba som ${role} och tjänsten är just det.`,
        evidence: `Annonsens rubrik: "${job.headline}".`,
      },
    ],
    gaps: [
      {
        point: "Annonsen vill ha erfarenhet av liknande arbete.",
        blocking: false,
        whatHelps: "Skriv ut vilka arbetsplatser du varit på och hur länge.",
      },
    ],
    unknowns: ["Din utbildning — profilen säger inget om den."],
    advice: "Fyll på profilen med utbildning innan du söker, så blir analysen skarpare.",
  };
}

export async function analyseJob(
  job: Job,
  profile: MatchProfile,
  locale: Locale,
): Promise<AnalysisOutcome> {
  if (isAiMock()) {
    return { ok: true, analysis: mockAnalysis(job, profile), cost: { inputTokens: 0, outputTokens: 0 } };
  }

  const sv = locale === "sv";
  const user = [
    sv ? "## Annonsen" : "## The ad",
    jobBlock(job, locale),
    "",
    sv ? "## Den sökandes profil" : "## The applicant's profile",
    profileBlock(profile, locale),
  ].join("\n");

  const result = await complete({
    system: sv ? SYSTEM_SV : SYSTEM_EN,
    user,
    maxTokens: 1200,
    // Tvingar igång JSON direkt, utan inledande artighetsfras.
    prefill: "{",
    temperature: 0.2,
  });

  if (!result.ok) return { ok: false, reason: result.reason };

  const analysis = parseAnalysis(result.text);
  if (!analysis) return { ok: false, reason: "bad-response" };

  return {
    ok: true,
    analysis,
    cost: { inputTokens: result.inputTokens, outputTokens: result.outputTokens },
  };
}
