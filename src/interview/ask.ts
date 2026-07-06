import type { Answer, InterviewIO, Question } from "./types.ts";
import type { Lang } from "../i18n.ts";
import { t } from "../i18n.ts";
import { UI, YES_WORDS, NO_WORDS } from "./strings.ts";

/** Cap re-prompts so piped/EOF input can never spin forever. */
const MAX_ATTEMPTS = 5;

function menu(q: Question, lang: Lang): string {
  return (q.options ?? []).map((o, i) => `  ${i + 1}) ${t(o.label, lang)}`).join("\n");
}

function parseIndex(raw: string, length: number): number | null {
  const n = Number.parseInt(raw, 10);
  if (!Number.isInteger(n) || n < 1 || n > length) return null;
  return n - 1;
}

async function askSingle(io: InterviewIO, q: Question, lang: Lang): Promise<Answer> {
  const ui = UI[lang];
  const options = q.options ?? [];
  const hint = q.optional ? ui.skip : "";

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const raw = (await io.ask(`${menu(q, lang)}\n${ui.chooseOne}${hint}`)).trim();
    if (raw === "" && q.optional) return null;
    const idx = parseIndex(raw, options.length);
    if (idx !== null) return options[idx]!.value;
    io.say(ui.invalidOption);
  }
  return q.optional ? null : (options[0]?.value ?? null);
}

async function askMulti(io: InterviewIO, q: Question, lang: Lang): Promise<Answer> {
  const ui = UI[lang];
  const options = q.options ?? [];
  const hint = q.optional ? ui.skip : "";

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const raw = (await io.ask(`${menu(q, lang)}\n${ui.chooseAny}${hint}`)).trim();
    if (raw === "") return [];
    const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
    const idxs = parts.map((p) => parseIndex(p, options.length));
    if (idxs.every((i) => i !== null)) {
      const values = idxs.map((i) => options[i as number]!.value);
      return [...new Set(values)];
    }
    io.say(ui.invalidMulti);
  }
  return [];
}

async function askYesNo(io: InterviewIO, q: Question, lang: Lang): Promise<Answer> {
  const ui = UI[lang];
  const hint = q.optional ? ui.skip : "";
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const raw = (await io.ask(`${ui.yesNo}${hint}`)).trim().toLowerCase();
    if (raw === "" && q.optional) return null;
    if (YES_WORDS.includes(raw)) return true;
    if (NO_WORDS.includes(raw)) return false;
    io.say(ui.invalidYesNo);
  }
  return q.optional ? null : false;
}

async function askNumber(io: InterviewIO, q: Question, lang: Lang): Promise<Answer> {
  const ui = UI[lang];
  const hint = q.optional ? ui.skip : "";
  const unit = q.unit ? ` ${t(q.unit, lang)}` : "";
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const raw = (await io.ask(`${ui.enterNumber}${unit}${hint}`)).trim();
    if (raw === "" && q.optional) return null;
    const n = Number(raw);
    if (Number.isFinite(n) && (q.min === undefined || n >= q.min) && (q.max === undefined || n <= q.max)) {
      return n;
    }
    const range = q.min !== undefined && q.max !== undefined ? ui.between(q.min, q.max) : "";
    io.say(`${ui.invalidNumber}${range}.`);
  }
  return null;
}

/** Present a question in the given language, validate, and return the value. */
export async function askQuestion(io: InterviewIO, q: Question, lang: Lang): Promise<Answer> {
  const header = q.why ? `${t(q.prompt, lang)}\n(${t(q.why, lang)})` : t(q.prompt, lang);
  io.say(header);

  switch (q.kind) {
    case "single":
      return askSingle(io, q, lang);
    case "multi":
      return askMulti(io, q, lang);
    case "yesno":
      return askYesNo(io, q, lang);
    case "number":
      return askNumber(io, q, lang);
  }
}

/** The localized labels for the option value(s) an answer selected. */
export function selectedLabels(q: Question, answer: Answer, lang: Lang): string[] {
  const values = Array.isArray(answer) ? answer : answer == null ? [] : [String(answer)];
  const options = q.options ?? [];
  return values.map((v) => {
    const opt = options.find((o) => o.value === v);
    return opt ? t(opt.label, lang) : String(v);
  });
}
