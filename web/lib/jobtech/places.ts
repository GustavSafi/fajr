import data from "./municipalities.json";

/**
 * Slår upp en ort som användaren skrivit ("göteborg", "Vasteras") mot
 * taxonomins kommuner och ger tillbaka concept_id:t API:et vill ha.
 *
 * Listan genereras av `npm run taxonomy`. Är den tom faller sökningen tillbaka
 * på fritext — sämre precision, men aldrig ett trasigt resultat.
 */

export interface Municipality {
  id: string;
  label: string;
  regionId?: string;
  region?: string;
}

interface MunicipalityFile {
  generatedAt: string | null;
  items: Municipality[];
}

const file = data as MunicipalityFile;
export const MUNICIPALITIES: Municipality[] = file.items ?? [];
export const TAXONOMY_GENERATED_AT = file.generatedAt;

/** Bara namnen, för förslagslistorna i sökfälten. */
export const MUNICIPALITY_NAMES: string[] = MUNICIPALITIES.map((m) => m.label).sort((a, b) =>
  a.localeCompare(b, "sv"),
);

/** Gör om till jämförbar form: gemener, utan diakriter, utan "s kommun". */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+kommun$/, "")
    .replace(/[^a-z0-9]/g, "");
}

const byName = new Map<string, Municipality>();
for (const m of MUNICIPALITIES) byName.set(normalize(m.label), m);

export function findMunicipality(input: string): Municipality | null {
  const key = normalize(input);
  if (!key) return null;

  const exact = byName.get(key);
  if (exact) return exact;

  // Prefixmatchning så att "göte" hittar Göteborg, men bara om det är entydigt.
  const prefixed = MUNICIPALITIES.filter((m) => normalize(m.label).startsWith(key));
  return prefixed.length === 1 ? prefixed[0]! : null;
}

export function municipalityLabel(id: string): string | null {
  return MUNICIPALITIES.find((m) => m.id === id)?.label ?? null;
}
