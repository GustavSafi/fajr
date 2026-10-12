/**
 * Gissar arbetsgivarens sektor utifrån namnet, för att kunna visa rätt
 * lönestatistik.
 *
 * Regeln vi håller oss till: hellre "vet inte" än fel. Returnerar vi null
 * visar sidan samtliga sektorer, vilket alltid är ett korrekt svar — bara
 * mindre precist. Att gissa fel vore värre, för då står det en exakt siffra
 * under fel etikett.
 *
 * Därför: ett namn som innehåller AB eller låter som bemanning hoppar vi över
 * helt. Svenska kommuner och regioner är inte aktiebolag, men deras bolag är
 * det — och ett kommunalt bostadsbolag lönesätter inte som en förvaltning.
 */

export type SectorCode = "0" | "1" | "2" | "3" | "4-5";

export const SECTOR_LABEL: Record<SectorCode, { sv: string; en: string }> = {
  "0": { sv: "samtliga sektorer", en: "all sectors" },
  "1": { sv: "statlig sektor", en: "central government" },
  "2": { sv: "kommunal sektor", en: "municipal sector" },
  "3": { sv: "regionsektorn", en: "regional sector" },
  "4-5": { sv: "privat sektor", en: "private sector" },
};

/** Namn som gör gissningen otillförlitlig, oavsett vad som mer står i det. */
const AMBIGUOUS = /\b(ab|aktiebolag|bemanning|rekrytering|konsult|vikarie|service)\b/i;

const STATE = [
  /\buniversitet/i,
  /\bhögskola/i,
  /\bmyndighet/i,
  /\bdomstol/i,
  /försvarsmakten/i,
  /kriminalvården/i,
  /polismyndigheten/i,
  /arbetsförmedlingen/i,
  /försäkringskassan/i,
  /skatteverket/i,
  /trafikverket/i,
  /migrationsverket/i,
  /lantmäteriet/i,
  /kronofogden/i,
  /pensionsmyndigheten/i,
];

const REGION = [/^region\s/i, /regionen\b/i, /\blandsting/i];

const MUNICIPAL = [/\bkommun(en|s)?\b/i, /\bstad\b/i, /\bstaden\b/i];

export function inferSector(employer: string | undefined): SectorCode | null {
  const name = employer?.trim();
  if (!name) return null;
  if (AMBIGUOUS.test(name)) return null;

  if (REGION.some((r) => r.test(name))) return "3";
  if (MUNICIPAL.some((r) => r.test(name))) return "2";
  if (STATE.some((r) => r.test(name))) return "1";

  /*
   * Allt annat är troligen privat, men "troligen" räcker inte här — en
   * felmärkt siffra är värre än en bredare. Vi säger hellre inget.
   */
  return null;
}
