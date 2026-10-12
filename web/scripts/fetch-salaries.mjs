#!/usr/bin/env node
/**
 * Hämtar lönestatistik per yrke ur SCB:s lönestrukturstatistik (AM0110) och
 * skriver den till lib/scb/salaries.json.
 *
 *   npm run loner
 *
 * Två tabeller, båda på fyrsiffrig SSYK:
 *
 *   LoneSpridSektYrk4AN  medel, median och percentiler — per sektor
 *   LonYrkeAlder4AN      genomsnittlig månadslön och antal anställda — per ålder
 *
 * Sektorerna gör siffran rätt i stället för ungefärlig: en undersköterska i en
 * kommun ska jämföras med kommunal sektor, inte med alla sektorer blandat.
 * Åldersbanden ger riktig ingångslön (18–24 år) i stället för tionde
 * percentilen, som bara är "de som tjänar minst" och inte alls samma sak.
 *
 * Körs en gång per år när SCB publicerat ny statistik (brukar ske i juni).
 * Sajten gör inga anrop mot SCB i drift.
 */

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const BASE = process.env.SCB_BASE_URL ?? "https://api.scb.se/OV0104/v1/doris/sv/ssd/AM/AM0110/AM0110A";
const SPREAD = `${BASE}/LoneSpridSektYrk4AN`;
const AGES = `${BASE}/LonYrkeAlder4AN`;

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "lib", "scb", "salaries.json");

/** Måttkoder i spridningstabellen, i den ordning vi ber om dem. */
const SPREAD_MEASURES = {
  mean: "000007CD",
  median: "000007CE",
  p10: "000007CF",
  p25: "000007CG",
  p75: "000007CH",
  p90: "000007CI",
};

/**
 * Sektorerna vi sparar. "0" är alltid med som reserv; de övriga används när vi
 * kan avgöra arbetsgivarens sektor. Privatanställda arbetare och tjänstemän
 * (4 och 5) hoppar vi över — vi kan ändå inte skilja dem åt utifrån en annons.
 */
const SECTORS = ["0", "1", "2", "3", "4-5"];

/** Åldersband. 65+ utelämnas: få anställda och säger inget om en karriär. */
const AGE_BANDS = ["18-24", "25-34", "35-44", "45-54", "55-64"];

const AGE_MEASURES = { salary: "000007BN", headcount: "000007BK" };

function toNumber(value) {
  if (typeof value !== "string") return undefined;
  const n = Number(value.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}

async function post(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} från ${url}. ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function metadata(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} när metadata hämtades från ${url}`);
  const meta = await res.json();
  const find = (code) => meta.variables?.find((v) => v.code === code);

  const yrke = find("Yrke2012");
  const tid = find("Tid");
  if (!yrke || !tid) throw new Error("Tabellen saknar Yrke2012 eller Tid — har SCB ändrat den?");

  const labels = {};
  yrke.values.forEach((code, i) => {
    labels[code] = yrke.valueTexts[i];
  });

  return { codes: yrke.values, labels, year: tid.values[tid.values.length - 1] };
}

/** Ett anrop per sektor. Mindre svar, och en sektor som fallerar sänker inte resten. */
async function fetchSector(codes, year, sector) {
  const json = await post(SPREAD, {
    query: [
      { code: "Sektor", selection: { filter: "item", values: [sector] } },
      { code: "Yrke2012", selection: { filter: "item", values: codes } },
      { code: "Kon", selection: { filter: "item", values: ["1+2"] } },
      { code: "ContentsCode", selection: { filter: "item", values: Object.values(SPREAD_MEASURES) } },
      { code: "Tid", selection: { filter: "item", values: [year] } },
    ],
    response: { format: "json" },
  });

  const order = Object.keys(SPREAD_MEASURES);
  const out = new Map();
  for (const row of json.data ?? []) {
    const ssyk = row.key?.[1];
    if (!ssyk || !/^\d{4}$/.test(ssyk)) continue;
    const entry = {};
    order.forEach((key, i) => {
      const n = toNumber(row.values?.[i]);
      if (n !== undefined) entry[key] = n;
    });
    if (entry.median === undefined && entry.mean === undefined) continue;
    out.set(ssyk, entry);
  }
  return out;
}

async function fetchAges(codes, year) {
  const json = await post(AGES, {
    query: [
      { code: "Sektor", selection: { filter: "item", values: ["0"] } },
      { code: "Yrke2012", selection: { filter: "item", values: codes } },
      { code: "Kon", selection: { filter: "item", values: ["1+2"] } },
      { code: "Alder", selection: { filter: "item", values: AGE_BANDS } },
      { code: "ContentsCode", selection: { filter: "item", values: Object.values(AGE_MEASURES) } },
      { code: "Tid", selection: { filter: "item", values: [year] } },
    ],
    response: { format: "json" },
  });

  const byOccupation = new Map();
  for (const row of json.data ?? []) {
    // Nyckeln är [Sektor, Yrke2012, Kon, Alder, Tid].
    const ssyk = row.key?.[1];
    const band = row.key?.[3];
    if (!ssyk || !band || !/^\d{4}$/.test(ssyk)) continue;

    const salary = toNumber(row.values?.[0]);
    const headcount = toNumber(row.values?.[1]);
    if (salary === undefined) continue;

    const entry = byOccupation.get(ssyk) ?? { ages: {}, headcount: 0 };
    entry.ages[band] = salary;
    if (headcount !== undefined) entry.headcount += headcount;
    byOccupation.set(ssyk, entry);
  }
  return byOccupation;
}

async function main() {
  console.log("Läser metadata …");
  const { codes, labels, year } = await metadata(SPREAD);
  console.log(`${codes.length} yrken, senaste år: ${year}`);

  const sectors = new Map();
  for (const sector of SECTORS) {
    process.stdout.write(`  sektor ${sector} … `);
    try {
      const data = await fetchSector(codes, year, sector);
      sectors.set(sector, data);
      console.log(`${data.size} yrken`);
    } catch (err) {
      // "Samtliga sektorer" är obligatorisk; resten är bonus.
      if (sector === "0") throw err;
      console.log(`hoppades över (${err.message})`);
    }
  }

  process.stdout.write("  åldersband … ");
  let ages = new Map();
  try {
    ages = await fetchAges(codes, year);
    console.log(`${ages.size} yrken`);
  } catch (err) {
    console.log(`hoppades över (${err.message})`);
  }

  const items = {};
  for (const [ssyk, base] of sectors.get("0") ?? []) {
    const entry = { label: labels[ssyk] ?? ssyk, sectors: { 0: base } };

    for (const sector of SECTORS) {
      if (sector === "0") continue;
      const value = sectors.get(sector)?.get(ssyk);
      if (value) entry.sectors[sector] = value;
    }

    const age = ages.get(ssyk);
    if (age && Object.keys(age.ages).length) {
      entry.ages = age.ages;
      if (age.headcount > 0) entry.headcount = age.headcount;
    }

    items[ssyk] = entry;
  }

  const count = Object.keys(items).length;
  if (count < 200) {
    throw new Error(
      `Fick bara ${count} yrken med lönedata. Det är för få — avbryter hellre än skriver en halv fil.`,
    );
  }

  await writeFile(
    OUT,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        year,
        tables: ["LoneSpridSektYrk4AN", "LonYrkeAlder4AN"],
        note: "Genererad av scripts/fetch-salaries.mjs. Redigera inte för hand.",
        items,
      },
      null,
      0,
    )}\n`,
    "utf8",
  );

  const sample = items["5321"];
  console.log(`\nSkrev ${count} yrken (${year}) till lib/scb/salaries.json`);
  if (sample) {
    console.log(`Stickprov 5321 ${sample.label}`);
    console.log(`  samtliga sektorer: median ${sample.sectors["0"]?.median} kr`);
    console.log(`  kommunal sektor:   median ${sample.sectors["2"]?.median} kr`);
    console.log(`  18–24 år:          ${sample.ages?.["18-24"]} kr`);
  }
}

main().catch((err) => {
  console.error(`\nMisslyckades: ${err.message}`);
  console.error("Den gamla filen ligger kvar och sajten fungerar som förut.\n");
  process.exit(1);
});
