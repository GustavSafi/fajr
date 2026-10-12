import type { JobTechHit, JobTechResponse } from "./raw";

/**
 * Offlineläge. Sätt JOBTECH_MOCK=1 så svarar klienten med exempelannonser i
 * stället för att anropa API:et.
 *
 * Finns av två skäl: man ska kunna utveckla gränssnittet utan nät, och man ska
 * kunna se hur sidan ser ut med data även bakom en brandvägg som blockerar
 * jobtechdev.se. Formen är exakt densamma som API:ets, så inget annat i koden
 * behöver veta om att läget finns.
 */

const HITS: JobTechHit[] = [
  {
    id: "mock-1",
    headline: "Undersköterska till hemtjänsten, natt",
    employer: { name: "Göteborgs Stad, Äldre samt vård- och omsorgsförvaltningen" },
    workplace_address: {
      municipality: "Göteborg",
      municipality_concept_id: "PVZL_BQT_XtL",
      region: "Västra Götalands län",
      country: "Sverige",
    },
    description: {
      text: "Vi söker dig som är utbildad undersköterska och vill arbeta natt i hemtjänsten på Hisingen.\n\nSom undersköterska hos oss möter du varje kväll människor i deras egna hem. Du ger omvårdnad, stöd och trygghet, och du är ofta den som ser först när något förändrats. Arbetet sker självständigt men aldrig ensamt — du har alltid en sjuksköterska att ringa.\n\nVi erbjuder schemalagd arbetstid, friskvårdsbidrag och betald vidareutbildning.",
    },
    working_hours_type: { label: "Heltid" },
    employment_type: { label: "Tillsvidareanställning" },
    scope_of_work: { min: 100, max: 100 },
    occupation: { label: "Undersköterska, hemtjänst", concept_id: "occ-1" },
    occupation_group: { label: "Undersköterskor", legacy_ams_taxonomy_id: "5321" },
    occupation_field: { label: "Hälso- och sjukvård", concept_id: "field-1" },
    must_have: {
      skills: [{ label: "Omvårdnadsarbete" }, { label: "Dokumentation i journalsystem" }],
      work_experiences: [{ label: "Undersköterska, hemtjänst" }],
    },
    nice_to_have: { skills: [{ label: "Demensvård" }, { label: "Delegering av läkemedel" }] },
    driving_license_required: true,
    experience_required: true,
    number_of_vacancies: 4,
    application_deadline: new Date(Date.now() + 3 * 86_400_000).toISOString(),
    publication_date: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    webpage_url: "https://example.org/jobb/1",
  },
  {
    id: "mock-2",
    headline: "Systemutvecklare .NET",
    employer: { name: "Nordiq Teknik AB" },
    workplace_address: {
      municipality: "Stockholm",
      municipality_concept_id: "AvNB_uwa_6n6",
      region: "Stockholms län",
      country: "Sverige",
    },
    description: {
      text: "Vi bygger system som håller svensk industri igång, och nu växer teamet.\n\nDu kommer att arbeta med .NET 8, Azure och en kodbas som faktiskt har tester. Vi jobbar i tvärfunktionella team om fem personer, släpper till produktion flera gånger i veckan och har ingen kultur av att sitta kvar sent.\n\nVi tror att du har några års erfarenhet av backendutveckling och trivs med att prata direkt med dem som använder det du bygger.",
    },
    remote_work: true,
    working_hours_type: { label: "Heltid" },
    scope_of_work: { min: 100, max: 100 },
    occupation: { label: "Systemutvecklare", concept_id: "occ-2" },
    occupation_group: { label: "Mjukvaru- och systemutvecklare", legacy_ams_taxonomy_id: "2512" },
    occupation_field: { label: "Data/IT", concept_id: "field-2" },
    must_have: {
      skills: [{ label: "C#" }, { label: ".NET" }, { label: "SQL" }],
      work_experiences: [{ label: "Systemutvecklare" }],
    },
    nice_to_have: { skills: [{ label: "Azure" }, { label: "Kubernetes" }, { label: "React" }] },
    experience_required: true,
    application_deadline: new Date(Date.now() + 21 * 86_400_000).toISOString(),
    publication_date: new Date(Date.now() - 86_400_000).toISOString(),
    webpage_url: "https://example.org/jobb/2",
  },
  {
    id: "mock-3",
    headline: "Lagermedarbetare — inga förkunskaper krävs",
    employer: { name: "Logistikpartner Syd AB" },
    workplace_address: {
      municipality: "Malmö",
      municipality_concept_id: "oYPt_yRA_Smm",
      region: "Skåne län",
      country: "Sverige",
    },
    description: {
      text: "Vill du in på arbetsmarknaden utan tidigare erfarenhet? Vi lär dig allt du behöver.\n\nArbetet består av plock, pack och avstämning mot vårt lagersystem. Du får en introduktionsvecka med handledare och truckkort betalt av oss efter tre månader.\n\nVi ser gärna sökande som är nya i yrket.",
    },
    working_hours_type: { label: "Deltid" },
    scope_of_work: { min: 50, max: 75 },
    occupation: { label: "Lagerarbetare", concept_id: "occ-3" },
    occupation_group: { label: "Lager- och terminalpersonal", legacy_ams_taxonomy_id: "9321" },
    occupation_field: { label: "Transport, distribution, lager", concept_id: "field-3" },
    must_have: {},
    nice_to_have: { skills: [{ label: "Truckkort A1-A4" }] },
    experience_required: false,
    number_of_vacancies: 12,
    application_deadline: new Date(Date.now() + 30 * 86_400_000).toISOString(),
    publication_date: new Date().toISOString(),
    webpage_url: "https://example.org/jobb/3",
  },
  {
    id: "mock-4",
    headline: "Grundskollärare årskurs 4-6",
    employer: { name: "Uppsala kommun" },
    workplace_address: {
      municipality: "Uppsala",
      municipality_concept_id: "otaF_bQY_4ZD",
      region: "Uppsala län",
      country: "Sverige",
    },
    description: {
      text: "Vi söker en legitimerad lärare till mellanstadiet på Gränbyskolan från och med höstterminen.\n\nDu blir en av tre mentorer i arbetslaget och undervisar i svenska och SO. Skolan har tvålärarsystem i svenska, vilket betyder att du sällan står ensam i klassrummet.\n\nLegitimation för aktuella ämnen och årskurser är ett krav.",
    },
    working_hours_type: { label: "Heltid" },
    scope_of_work: { min: 100, max: 100 },
    occupation: { label: "Lärare i grundskolan, årskurs 4-6", concept_id: "occ-4" },
    occupation_group: { label: "Grundskollärare", legacy_ams_taxonomy_id: "2341" },
    occupation_field: { label: "Pedagogiskt arbete", concept_id: "field-4" },
    must_have: {
      skills: [{ label: "Svenska" }, { label: "Samhällsorienterande ämnen" }],
      education: [{ label: "Grundlärarexamen" }],
    },
    experience_required: true,
    application_deadline: new Date(Date.now() + 10 * 86_400_000).toISOString(),
    publication_date: new Date(Date.now() - 5 * 86_400_000).toISOString(),
    webpage_url: "https://example.org/jobb/4",
  },
  {
    id: "mock-5",
    headline: "Snickare till nyproduktion",
    employer: { name: "Byggkompaniet i Norr AB" },
    workplace_address: {
      municipality: "Umeå",
      municipality_concept_id: "QiGt_BLu_amP",
      region: "Västerbottens län",
      country: "Sverige",
    },
    description: {
      text: "Vi bygger flerbostadshus i Umeå och behöver förstärkning på plats.\n\nDu arbetar i lag om fyra med stomresning, montage och inredningssnickeri. Vi har kollektivavtal, tjänstepension och egen verkstad.\n\nKörkort B krävs eftersom vi rör oss mellan arbetsplatser.",
    },
    working_hours_type: { label: "Heltid" },
    scope_of_work: { min: 100, max: 100 },
    occupation: { label: "Träarbetare/Snickare", concept_id: "occ-5" },
    occupation_group: { label: "Snickare och murare", legacy_ams_taxonomy_id: "7113" },
    occupation_field: { label: "Bygg och anläggning", concept_id: "field-5" },
    must_have: {
      skills: [{ label: "Nyproduktion" }, { label: "Stomresning" }],
      work_experiences: [{ label: "Träarbetare/Snickare" }],
    },
    driving_license_required: true,
    experience_required: true,
    number_of_vacancies: 2,
    application_deadline: new Date(Date.now() + 45 * 86_400_000).toISOString(),
    publication_date: new Date(Date.now() - 9 * 86_400_000).toISOString(),
    webpage_url: "https://example.org/jobb/5",
  },
  {
    id: "mock-6",
    headline: "Ekonomiassistent, vikariat 12 månader",
    employer: { name: "Linköpings Universitet" },
    workplace_address: {
      municipality: "Linköping",
      municipality_concept_id: "bm2x_1mr_sdD",
      region: "Östergötlands län",
      country: "Sverige",
    },
    description: {
      text: "Vikariat på ekonomiavdelningen med start i september.\n\nDu hanterar leverantörsfakturor, kundreskontra och stöttar vid månadsbokslut. Vi arbetar i Agresso och du får en tydlig upplärning under de första veckorna.\n\nVi tillämpar hybridarbete med två dagar hemifrån i veckan.",
    },
    working_hours_type: { label: "Heltid" },
    employment_type: { label: "Vikariat" },
    duration: { label: "12 månader eller längre" },
    scope_of_work: { min: 100, max: 100 },
    occupation: { label: "Ekonomiassistent", concept_id: "occ-6" },
    occupation_group: { label: "Ekonomiassistenter", legacy_ams_taxonomy_id: "4111" },
    occupation_field: { label: "Ekonomi, administration", concept_id: "field-6" },
    must_have: { skills: [{ label: "Leverantörsreskontra" }, { label: "Kundreskontra" }] },
    nice_to_have: { skills: [{ label: "Agresso" }, { label: "Excel" }] },
    experience_required: true,
    application_deadline: new Date(Date.now() + 14 * 86_400_000).toISOString(),
    publication_date: new Date(Date.now() - 3 * 86_400_000).toISOString(),
    webpage_url: "https://example.org/jobb/6",
  },
];

export function isMockMode(): boolean {
  return process.env.JOBTECH_MOCK === "1";
}

export function mockSearch(query: string | undefined): JobTechResponse {
  const q = query?.trim().toLowerCase();
  const hits = q
    ? HITS.filter((h) =>
        `${h.headline} ${h.employer?.name} ${h.occupation?.label} ${h.description?.text}`
          .toLowerCase()
          .includes(q),
      )
    : HITS;

  const counts = new Map<string, { id: string; label: string; count: number }>();
  for (const hit of hits) {
    const label = hit.workplace_address?.municipality;
    const id = hit.workplace_address?.municipality_concept_id;
    if (!label || !id) continue;
    const existing = counts.get(id);
    if (existing) existing.count += 1;
    else counts.set(id, { id, label, count: 1 });
  }

  const fields = new Map<string, { id: string; label: string; count: number }>();
  for (const hit of hits) {
    const label = hit.occupation_field?.label;
    const id = hit.occupation_field?.concept_id;
    if (!label || !id) continue;
    const existing = fields.get(id);
    if (existing) existing.count += 1;
    else fields.set(id, { id, label, count: 1 });
  }

  return {
    total: { value: hits.length },
    hits,
    stats: [
      {
        type: "municipality",
        values: [...counts.values()].map((v) => ({
          term: v.label,
          concept_id: v.id,
          count: v.count,
        })),
      },
      {
        type: "occupation-field",
        values: [...fields.values()].map((v) => ({
          term: v.label,
          concept_id: v.id,
          count: v.count,
        })),
      },
    ],
  };
}

export function mockAd(id: string): JobTechHit | null {
  return HITS.find((h) => h.id === id) ?? null;
}
