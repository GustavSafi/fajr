# Jobbare

Svensk jobbsökarsajt byggd på Arbetsförmedlingens öppna annonsdata (JobTech).
Det här är **steg 1**: sökning, filter och annonssidor — helt gratis, inga
konton, inga betalningar.

## Kom igång

```bash
npm install
npm run dev
```

Öppna http://localhost:3000. Ingen API-nyckel behövs, JobTech är öppet.

### Utan nätverk

Sitter du bakom en brandvägg som blockerar `jobtechdev.se`, kör med
exempelannonser i stället:

```bash
JOBTECH_MOCK=1 npm run dev      # macOS/Linux
$env:JOBTECH_MOCK=1; npm run dev # PowerShell
```

### Data som hämtas en gång

Två skript hämtar referensdata som ändras sällan. Kör dem en gång och checka in
resultatet — sedan gör sajten inga anrop mot dem i drift.

```bash
npm run taxonomy   # Sveriges 290 kommuner, för exakt platsfilter
npm run loner      # SCB:s lönestatistik per yrke, ca 430 yrken
```

`npm run loner` bör köras om en gång per år, när SCB publicerat ny
lönestrukturstatistik (brukar ske i juni).

Utan `npm run taxonomy` faller platssökningen tillbaka på API:ets 30 största
kommunfacetter per sökning — fungerar för storstäder, missar små kommuner.
Utan `npm run loner` hämtas lönen live från SCB vid varje annonsvisning —
fungerar, men gör sidan långsammare.

## Kommandon

| Kommando | Vad det gör |
| --- | --- |
| `npm run dev` | Utvecklingsserver |
| `npm run build` | Produktionsbygge |
| `npm run start` | Kör produktionsbygget |
| `npm run typecheck` | Typkontroll utan att bygga |
| `npm run lint` | ESLint |
| `npm run taxonomy` | Hämtar kommunlistan (körs en gång) |
| `npm run loner` | Hämtar SCB:s lönestatistik (körs en gång per år) |

## Så är det byggt

```
app/[lang]/            sidor, ett språk per prefix (sv på rot, /en för engelska)
  page.tsx             startsida med sökfält
  jobb/page.tsx        sökresultat med filter, sortering och paginering
  jobb/[id]/page.tsx   annonssida med strukturerad data för Google Jobs
components/            gränssnittsdelar, alla serverkomponenter utom sökfältet
lib/
  jobtech/client.ts    API-klienten — enda stället som pratar med JobTech
  jobtech/map.ts       normaliserar råsvar till vår Job-typ
  jobtech/mock.ts      exempelannonser för offlineläge
  jobtech/places.ts    ortnamn till kommun-id
  scb/salaries.ts      lönestatistik per SSYK-kod, från SCB
  types.ts             domänmodellen
  i18n.ts              båda språken, en ordbok
  search-params.ts     URL:en är sökningens enda tillstånd
proxy.ts               skriver om /jobb till /sv/jobb utan att ändra adressfältet
```

### Tre principer koden håller sig till

**Saknad data straffas aldrig.** Ärvt från CLI-projektet: ett fält som annonsen
saknar blir `undefined`, aldrig ett gissat värde. Ingen etikett visas för att
raden ska se full ut.

**URL:en är hela tillståndet.** Filter och sortering är vanliga länkar, inte
formulär med JavaScript. Det ger fungerande bakåtknapp, delbara sökningar,
sidor Google kan indexera, och en sajt som filtrerar även utan JavaScript.

**Inget hostingspecifikt.** Ren Next.js, inga Vercel-API:er. Flytten till
Railway eller Netlify när betalningarna slås på ska ta en kväll, inte en vecka.

## Vad som inte finns än

Steg 2 och 3 enligt byggplanen: konton, sparade jobb, ansökningstracker,
jobbagent, CV-byggaren och AI-matchningen. Den nattliga
synken till egen databas kommer när Supabase är på plats — tills dess frågar
sajten JobTech direkt vid varje sökning, vilket fungerar utmärkt men begränsar
hur djupt man kan bläddra.

## Datakälla

Annonserna kommer från [JobTech Dev](https://jobtechdev.se), Arbetsförmedlingens
öppna data. Alla annonser länkar till arbetsgivarens egen ansökan.

Lönestatistiken kommer från [SCB](https://www.scb.se), lönestrukturstatistiken
(AM0110), kopplad till annonsen via yrkets fyrsiffriga SSYK-kod. Det är samma
kodverk i båda källorna, vilket är det som gör kopplingen möjlig.
