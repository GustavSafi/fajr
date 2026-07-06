# Job Matcher

A command-line career assistant that runs a short structured interview, then
searches a real job board and returns a **ranked, explained** list of matches.

It is **rule-based, not AI-driven** — a branching questionnaire plus a
transparent weighted point system. No LLM, no API costs, fully deterministic.

You choose **one source per run**:

| Source | Region | Language | Key needed? |
| --- | --- | --- | --- |
| **JobTech** (Arbetsförmedlingen) | Sweden | Swedish 🇸🇪 | No — open API |
| **Adzuna** | UK / US / DE / FR / NL / AU / CA | English 🇬🇧 | Yes (free tier) |

The interview and the results are shown in the source's language: pick JobTech
and everything is in Swedish; pick Adzuna and everything is in English.

---

# 🇬🇧 English

## Requirements
- **Node.js ≥ 20** (uses built-in TypeScript stripping — no build step needed to run)

## Setup
```bash
npm install
```
JobTech needs no key. To use Adzuna, create a free account at
[developer.adzuna.com](https://developer.adzuna.com/), then copy `.env.example`
to `.env` and fill in your credentials:
```
ADZUNA_APP_ID=your_app_id
ADZUNA_APP_KEY=your_app_key
```
`.env` is git-ignored and is never committed.

## Run
```bash
npm run dev
```
Then answer the questions:
- **Single choice** — type the option's number and press Enter (e.g. `2`).
- **Multiple choice** — type several numbers separated by commas (e.g. `1,3`).
- **Yes/no** — type `y`/`yes` or `n`/`no` (`j`/`ja` / `n`/`nej` also work).
- **Number** — type a number (e.g. `60000`).
- **Optional questions** — just press Enter to skip.

The first question picks the source (and therefore the language). Based on your
field, follow-up questions adapt to your profession.

## What you get
A ranked list. Each job shows a 0–100 match score, the reasons it matched (✓),
any gaps to check (⚠), and a direct link to apply:
```
 1. [ 84/100]  Backend Developer — Genki
      London · Hybrid · 90,000 GBP
      ✓ Title matches your target role
      ✓ Matches your skills: Go, Python
      → https://www.adzuna.co.uk/jobs/...
```

## How scoring works
Each job is scored on weighted sub-scores: **title, skills, experience,
location, remote, salary, employment type**. A dimension only counts when the
data exists — JobTech rarely lists salary, Adzuna has no remote flag — so
missing information is skipped, never penalised. The two sources use different
weights (Adzuna leans on salary, JobTech on structured skills).

## Scripts
| Command | What it does |
| --- | --- |
| `npm run dev` | Run the full interview → search → results flow |
| `npm test` | Run the unit tests |
| `npm run typecheck` | Type-check the project |
| `npm run proftest` | Live QA sweep across many professions (both sources) |
| `npm run search -- "<term>"` | Debug: raw keyword search on both providers |

## Known limitations
- **Adzuna is not available for Sweden.** For Swedish jobs, use JobTech.
- **Cross-locale spelling.** On Adzuna, some role terms differ by country
  (e.g. US "Counselor" vs UK "Counsellor"), which can weaken those results.
  Choosing the marketplace that matches your spelling helps.
- Salary on JobTech is rarely machine-readable, so salary rarely affects the
  JobTech ranking (by design).

---

# 🇸🇪 Svenska

En jobbassistent i terminalen som ställer några strukturerade frågor och sedan
söker i en riktig jobbdatabas och ger en **rankad och förklarad** lista med
matchningar.

Systemet är **regelbaserat, inte AI-drivet** — ett frågeformulär med förgrening
plus ett transparent poängsystem. Ingen språkmodell, inga API-kostnader.

Du väljer **en källa per körning**:

| Källa | Region | Språk | Nyckel? |
| --- | --- | --- | --- |
| **JobTech** (Arbetsförmedlingen) | Sverige | Svenska 🇸🇪 | Nej — öppet API |
| **Adzuna** | UK / US / DE / FR / NL / AU / CA | Engelska 🇬🇧 | Ja (gratisnivå) |

Frågorna och resultaten visas på källans språk: väljer du JobTech är allt på
svenska; väljer du Adzuna är allt på engelska.

## Krav
- **Node.js ≥ 20** (kör TypeScript direkt — inget byggsteg behövs)

## Installation
```bash
npm install
```
JobTech kräver ingen nyckel. För att använda Adzuna, skapa ett gratiskonto på
[developer.adzuna.com](https://developer.adzuna.com/), kopiera sedan
`.env.example` till `.env` och fyll i dina uppgifter:
```
ADZUNA_APP_ID=ditt_app_id
ADZUNA_APP_KEY=din_app_key
```
`.env` är git-ignorerad och sparas aldrig i repot.

## Kör
```bash
npm run dev
```
Svara sedan på frågorna:
- **Ett val** — skriv alternativets siffra och tryck Enter (t.ex. `2`).
- **Flera val** — skriv flera siffror separerade med komma (t.ex. `1,3`).
- **Ja/nej** — skriv `j`/`ja` eller `n`/`nej`.
- **Tal** — skriv ett tal (t.ex. `60000`).
- **Frivilliga frågor** — tryck bara Enter för att hoppa över.

Första frågan väljer källa (och därmed språk). Följdfrågorna anpassas efter
ditt yrkesområde.

## Vad du får
En rankad lista. Varje jobb visar en matchningspoäng 0–100, skälen till att det
matchade (✓), eventuella luckor att kontrollera (⚠) och en direktlänk att söka:
```
 1. [ 81/100]  Grundskollärare till Höglidenskolan — ÖRNSKÖLDSVIKS KOMMUN
      Örnsköldsvik · Heltid
      ✓ Titeln matchar din önskade roll
      ✓ Matchar dina kunskaper: Matematik
      → https://ornskoldsvik.varbi.com/...
```

## Så fungerar poängsättningen
Varje jobb poängsätts på viktade delpoäng: **titel, kunskaper, erfarenhet,
plats, distans, lön, anställningsform**. En dimension räknas bara när datan
finns — JobTech anger sällan lön, Adzuna saknar distansflagga — så saknad
information hoppas över, den bestraffas aldrig. De två källorna använder olika
vikter (Adzuna väger lön tyngre, JobTech strukturerade kunskaper).

## Kommandon
| Kommando | Vad det gör |
| --- | --- |
| `npm run dev` | Kör hela flödet: intervju → sökning → resultat |
| `npm test` | Kör enhetstesterna |
| `npm run typecheck` | Typkontrollera projektet |
| `npm run proftest` | QA-svep live över många yrken (båda källorna) |
| `npm run search -- "<ord>"` | Felsökning: råsökning på båda källorna |

## Kända begränsningar
- **Adzuna finns inte för Sverige.** Använd JobTech för svenska jobb.
- **Stavning mellan länder.** På Adzuna skiljer sig vissa yrkestermer åt mellan
  länder (t.ex. amerikansk "Counselor" mot brittisk "Counsellor"), vilket kan
  försämra de resultaten. Välj den marknad som matchar din stavning.
- Lön på JobTech är sällan maskinläsbar, så lön påverkar sällan JobTech-
  rankningen (avsiktligt).

---

## Architecture (for developers)
```
src/
  i18n.ts     language type + text resolver (en / sv)
  config/     environment loading (job providers only)
  models/     shared types (UserProfile, Job, JobProvider, ...)
  interview/  structured branching questionnaire, localized  (questions as data)
  profile/    summary + job-query building
  apis/       job providers (JobTech, Adzuna) behind one interface
  ranking/    per-source weighted scoring + explanations
  results.ts  terminal renderer
```
Design notes: questions are **data** (`when` for branching, `apply` for
mapping); adding a job source is a single new file implementing `JobProvider`;
the score is a weighted average of only the sub-scores whose data is present.
