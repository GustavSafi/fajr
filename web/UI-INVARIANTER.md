# Vad som inte får röras i UI:t — och varför

Skrivet 12 okt 2026, inför UI-omgörningen av **Jobbare** (jobbare.se).

Det här är inte smakfrågor. Varje punkt kom ur ett verkligt problem — en bugg
som visades för en användare, en siffra som ljög, en sida Google aldrig hade
hittat. Formen får du göra om hur du vill. **Beteendet i den här filen ska
fortfarande gälla när du är klar.**

Varje punkt säger: vad, var, varför, och vad som går sönder om den försvinner.

---

## 1. Brasklappen under lönesiffran på annonssidor

**Var:** `components/salary-panel.tsx`, `t.salarySourceNote`, visas när
`employerClassified` är satt. Annonssidan sätter den, lönesidorna gör inte det.

> "Yrket är arbetsgivarens egen klassning av annonsen — den stämmer inte alltid."

**Varför:** lönestatistiken hämtas via SSYK-koden i annonsen, och **den koden
sätts av arbetsgivaren, inte av oss**. En annons rubricerad "Teamledare" kan
vara klassad som vad som helst. Läsaren ser ett yrkesnamn som ibland inte alls
liknar titeln de just läst.

Raden står direkt under yrkesnamnet och inte bland fotnoterna, för det är exakt
där frågan uppstår. Flyttas den ned är den för sen.

**Går sönder utan den:** vi presenterar en siffra som gäller ett annat yrke än
tjänsten, utan att säga det. Någon tackar nej till ett jobb på fel underlag.

**Motsatsen gäller på `/lon/`:** där är yrket sidans eget ämne, valt av oss ur
SCB. Visa inte varningen där — den skulle så tvivel om en siffra som inte är
osäker. (Det här var en bugg fram till 12 okt.)

---

## 2. Alla fem åldersband ska vara etiketterade

**Var:** `AgeProgression` i `components/salary-panel.tsx`.

**Varför:** när bara första och sista stapeln hade siffra trodde ägaren att SCB
saknade data för 25–34, 35–44 och 45–54. Det gjorde den inte. En etikett som
utelämnas för att det ser renare ut läses som data som saknas.

**Går sönder utan den:** användaren drar fel slutsats om hur fullständig
statistiken är, och litar mindre på hela panelen.

---

## 3. Matchningspoäng under tre bedömda dimensioner visas inte

**Var:** `isScoreTrustworthy()` i `lib/matching/score.ts` — `basis >= 3`.

**Varför:** poängen väger sju dimensioner, men **en dimension räknas bara när
datan finns** (principen är ärvd från CLI-projektet och är det som gör hela
matchningen trovärdig). En annons som bara gick att bedöma på två dimensioner
ger en siffra som ser lika exakt ut som en på sju. Den gör den inte.

**Går sönder utan den:** "84 % matchning" baserat på ort och anställningsform.
Första gången någon klickar på det och upptäcker att det var tomt är
matchningen död som funktion.

---

## 4. Arkiverade annonser: fyra saker ska vara borta

**Var:** `app/[lang]/jobb/[id]/page.tsx`, alla `job.archived`-grenar.

När `job.archived` är sant ska det **inte** finnas:

1. Ansökningsknapp eller ansökningslänk — jobbet går inte att söka.
2. "Sök senast {datum}" — datumet har passerat.
3. Brådskemarkering ("X dagar kvar") — det finns inga dagar kvar.
4. AI-analys — att ta betalt för ett omdöme om ett jobb som inte går att söka
   vore att sälja luft.

Dessutom: `robots: { index: false }` på sidan, och ingen `JobPostingSchema`.

**Varför:** arkiverade annonser hämtas ur `historical.api.jobtechdev.se` så att
en länk från Google eller en delad länk inte blir en återvändsgränd. Men de är
döda, och varje element som antyder motsatsen är en lögn.

**Går sönder utan det:** någon skriver ett personligt brev till ett jobb som
togs bort i september. Och `noindex` borta betyder att döda annonser konkurrerar
med levande i sökresultaten — Google straffar sajter för det.

---

## 5. Filterpanelen måste gå att skrolla

**Var:** `app/[lang]/jobb/page.tsx`, `<aside>`:
`lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto lg:overscroll-contain`

**Varför:** panelen är `sticky`. Utan maxhöjd blir den längre än skärmen och de
nedersta filtren går inte att nå — rapporterat av ägaren som en riktig bugg.
`overscroll-contain` hindrar att sidan bakom rycker till när man skrollat klart
i panelen.

**Går sönder utan det:** yrkesområdesfiltren längst ned blir oåtkomliga på
laptop-skärmar.

---

## 6. "Det här kunde vi inte bedöma" i AI-analysen

**Var:** `unknowns`-blocket i `components/ai-analysis.tsx`, och `unknowns` i
kontraktet i `lib/ai/analysis.ts`.

**Varför:** profilen är fyra frågor, inte ett CV. Modellen saknar nästan alltid
utbildning, tidigare arbetsgivare och språk. Rutan är det som **skiljer "du
saknar X" från "du har inte berättat om X"**. Att skriva att någon saknar en
utbildning hen faktiskt har kan kosta personen ett jobb.

Rutan länkar till profilen. Den är därmed också det som driver
profilifyllnaden — och profilen är det som gör all matchning bättre. Det som
började som en begränsning är nu en funktion.

**Går sönder utan den:** analysen ljuger om användaren, och den enda
återkopplingsslingan som förbättrar profilen försvinner.

---

## 7. Ett negativt omdöme färgas inte rött

**Var:** `verdictTone()` i `components/ai-analysis.tsx`. Bara `stark` får
accentfärgen; resten är neutrala.

**Varför:** designsystemet har **en** accent (smaragd) och sparar varmt/orange
för brådska — sista ansökningsdag. Ett nej är inte en varning, det är ett svar.
Färgar man det rött blir produkten obehaglig att använda, och den ska kunna
säga nej ofta utan att kännas elak.

**Går sönder utan det:** varningsfärgen slutar betyda brådska, och ett ärligt
omdöme känns som ett fel.

---

## 8. URL:en är hela söktillståndet

**Var:** `lib/search-params.ts`. Filter renderas som `<Link>`, inte som knappar
med React-state.

**Varför:** tre saker på en gång. Sökningar går att dela och bokmärka. Sidan
fungerar utan JavaScript. Och Google kan crawla filterkombinationer — vilket är
en del av SEO-planen.

**Går sönder utan det:** delade länkar visar fel resultat, tillbaka-knappen
slutar fungera, och sökresultatsidan blir osynlig för Google.

---

## 9. Annonssidan läser inga cookies på servern

**Var:** `app/[lang]/jobb/[id]/page.tsx` har `revalidate = 1800` och anropar
aldrig `cookies()`. `components/ai-analysis.tsx` läser profilcookien i
webbläsaren i stället.

**Varför:** `cookies()` i en sida med `revalidate` tvingar serverrendering per
besök. Annonssidorna är den sidtyp Google hämtar mest av alla, och de är
tiotusentals.

**Går sönder utan det:** ISR-cachen försvinner, svarstiderna stiger, och
serverkostnaden följer trafiken i stället för innehållet.

---

## 10. Sidfotens länkar till 12 yrken och 12 kommuner

**Var:** `components/site-footer.tsx`, `POPULAR_OCCUPATIONS` och
`MAJOR_MUNICIPALITIES`.

**Varför:** de 652 landningssidorna nås annars **bara** via sitemapen. En sida
som ingen länkar till internt behandlar Google därefter, hur bra den än är.
Yrkena är sorterade på antal anställda, inte alfabetiskt — en lista som börjar
med "Officerare" är korrekt och fullständigt oanvändbar.

Kommunlistan är hårdkodad på folkmängd, inte på annonsvolym, så att sidfoten ser
likadan ut i augusti som i januari. En sidfot som byter länkar varje gång
Platsbanken andas läser Google som brus.

**Går sönder utan det:** den största billiga trafikvinsten i hela projektet
halveras.

---

## 11. Ingen `canonical` i rot-layouten

**Var:** `app/[lang]/layout.tsx` — `alternates` har bara `languages`.

**Varför:** metadata ärvs nedåt i Next. En canonical i rot-layouten skulle få
varenda annonssida och landningssida att peka på startsidan. Det är den värsta
signal man kan skicka Google.

Canonical sätts per sida, där den hör hemma (`/lon/`, `/lediga-jobb/`).

**Går sönder utan det:** hela sajten avindexeras till förmån för startsidan.

---

## 12. Indexeringsspärren

**Var:** `lib/site.ts` → `isIndexable()` kräver `SITE_INDEXABLE=1`. Styr
`robots.ts`, `sitemap.ts` och `robots`-metadatan i layouten.

**Varför:** sajten ska kunna ligga på en `*.vercel.app`-adress utan att Google
indexerar den. Hinner den det sitter man med en domänflytt och delad auktoritet.

**Slås på** först när ägaren är nöjd med UI:t. Sätt den inte åt honom.

---

## 13. Typsnitten är självhostade

**Var:** `app/globals.css`, Fontsource-paket i `package.json`.

**Varför:** Google Fonts CDN skickar besökarens IP till Google. Tyska domstolar
har dömt att det bryter mot GDPR. Dessutom är ett externt typsnittsanrop en
render-blockerande resurs.

**Går sönder utan det:** ett GDPR-problem på en sajt som samlar
jobbsökandes profiler, och långsammare första rendering.

---

## 14. Dedupliceringen av facetter

**Var:** `facetsFrom()` i `lib/jobtech/client.ts`.

**Varför:** JobTech returnerar ibland **samma `concept_id` två gånger** under
olika termer. Utan hopslagningen kraschar React med "two children with the same
key", och användaren ser Stockholm två gånger i filtret.

**Går sönder utan det:** sökresultatsidan kraschar för vissa sökningar.

---

## 15. `stats.limit` får inte överstiga 30

**Var:** `buildUrl()` i `lib/jobtech/client.ts`.

**Varför:** JobTech svarar **HTTP 400** på högre värden. Det upptäcktes inte
direkt, för felet gav ett tomt resultat i stället för ett undantag — ortsökningen
slutade tyst fungera.

**Går sönder utan det:** facetter och ortsökning slutar fungera, utan felmeddelande.

---

## 16. Slugarna för landningssidorna är stabila

**Var:** `lib/landing/slugs.ts`.

**Varför:** `/lon/underskoterskor` ska leva i flera år och samla auktoritet.
Ändras adressen tappar sidan allt den byggt upp. Slugarna räknas ut
deterministiskt ur SCB-filen, i sorterad ordning.

Fyra regler som ser ut som detaljer men inte är det:

- `0000` "Samtliga yrken" är SCB:s totalrad, inte ett yrke — exkluderad.
- Ett komma **efter bindestreck** delar inte ("General-, landstings- och
  kommundirektörer" är ett yrke, inte två).
- Chefsyrken finns som "nivå 1" och "nivå 2" — en sida per yrke, den nivå flest
  tillhör får det korta namnet.
- `searchTermFor()` plockar huvudordet. SCB:s benämningar är inte sökord:
  "Grundutbildade sjuksköterskor" ger 4 träffar hos JobTech, "sjuksköterskor"
  ger ~1 900. "Driftchefer inom bygg" ska söka på *driftchefer*, inte *bygg*.

**Går sönder utan det:** sidor byter adress mellan två bygg och tappar sin
ranking, eller listar noll jobb trots att det finns tusen.

---

## 17. Inga AI-anrop utan klick

**Var:** `components/ai-analysis.tsx` — analysen startar bara på knapptryck.

**Varför:** varje analys kostar ~11 öre. En panel som analyserar automatiskt när
sidan laddas är en räkning per besökare, och annonssidorna är den mest besökta
sidtypen.

**Går sönder utan det:** okontrollerad kostnad, direkt proportionell mot trafik.

---

## Sådant du gärna får ändra

Allt annat. Särskilt:

- Logotypen — den är ritad för ett namn vi inte har längre.
- Layout, rytm, avstånd, typografisk skala.
- Hur sökresultatkorten är uppbyggda (behåll informationen, inte formen).
- Hur lönesidornas fyra block förhåller sig till varandra.
- Mobilupplevelsen generellt — där finns mest att vinna.
- Färgerna, så länge det förblir **en** accent och varmt är reserverat för
  brådska.

Kör `npx tsc --noEmit` och `npx next build` innan du säger att något är klart.
