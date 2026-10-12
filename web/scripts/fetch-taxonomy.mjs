#!/usr/bin/env node
/**
 * Hämtar Sveriges kommuner ur JobTechs taxonomi och skriver dem till
 * lib/jobtech/municipalities.json.
 *
 *   npm run taxonomy
 *
 * Kör en gång och checka in resultatet. Kommunerna ändras i praktiken aldrig,
 * så det här är ingen del av bygget — bara ett engångsjobb som gör att
 * platsfiltret kan filtrera exakt i stället för att gissa på fritext.
 *
 * Skriptet är defensivt med nyckelnamn: taxonomi-API:et har levererat både
 * "taxonomy/id"-formen och en plattare form över åren.
 */

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const BASE = process.env.JOBTECH_TAXONOMY_URL ?? "https://taxonomy.api.jobtechdev.se";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "lib", "jobtech", "municipalities.json");

function pick(concept, ...keys) {
  for (const key of keys) {
    const value = concept?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

async function fetchConcepts(type) {
  const url = new URL(`${BASE}/v1/taxonomy/main/concepts`);
  url.searchParams.set("type", type);
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`${type}: HTTP ${res.status} från taxonomi-API:et`);
  const body = await res.json();
  const list = Array.isArray(body) ? body : (body?.data ?? []);
  if (!Array.isArray(list)) throw new Error(`${type}: oväntat svarsformat`);
  return list;
}

function toEntry(concept) {
  const id = pick(concept, "taxonomy/id", "id", "concept_id");
  const label = pick(concept, "taxonomy/preferred-label", "preferred_label", "label");
  if (!id || !label) return null;
  return { id, label };
}

async function main() {
  console.log("Hämtar kommuner …");
  const municipalities = (await fetchConcepts("municipality")).map(toEntry).filter(Boolean);

  if (municipalities.length < 250) {
    throw new Error(
      `Fick bara ${municipalities.length} kommuner. Sverige har 290 — något är fel, avbryter hellre än skriver en trasig fil.`,
    );
  }

  municipalities.sort((a, b) => a.label.localeCompare(b.label, "sv"));

  await writeFile(
    OUT,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        note: "Genererad av scripts/fetch-taxonomy.mjs. Redigera inte för hand.",
        items: municipalities,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log(`Skrev ${municipalities.length} kommuner till lib/jobtech/municipalities.json`);
}

main().catch((err) => {
  console.error(`\nMisslyckades: ${err.message}`);
  console.error("Sajten fungerar ändå — platssökningen faller tillbaka på fritext.\n");
  process.exit(1);
});
