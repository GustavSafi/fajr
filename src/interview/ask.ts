import type { Answer, InterviewIO, Question } from "./types.ts";

/** Cap re-prompts so piped/EOF input can never spin forever. */
const MAX_ATTEMPTS = 5;

function skipHint(optional: boolean | undefined): string {
  return optional ? " (or press Enter to skip)" : "";
}

/** Parse a 1-based index string against a list length; null if invalid. */
function parseIndex(raw: string, length: number): number | null {
  const n = Number.parseInt(raw, 10);
  if (!Number.isInteger(n) || n < 1 || n > length) return null;
  return n - 1;
}

async function askSingle(io: InterviewIO, q: Question): Promise<Answer> {
  const options = q.options ?? [];
  const menu = options.map((o, i) => `  ${i + 1}) ${o.label}`).join("\n");

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const raw = (await io.ask(`${menu}\nChoose one${skipHint(q.optional)}`)).trim();
    if (raw === "" && q.optional) return null;
    const idx = parseIndex(raw, options.length);
    if (idx !== null) return options[idx]!.value;
    io.say("Please enter the number of one option.");
  }
  return q.optional ? null : (options[0]?.value ?? null);
}

async function askMulti(io: InterviewIO, q: Question): Promise<Answer> {
  const options = q.options ?? [];
  const menu = options.map((o, i) => `  ${i + 1}) ${o.label}`).join("\n");

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const raw = (
      await io.ask(`${menu}\nChoose any (comma-separated, e.g. 1,3)${skipHint(q.optional)}`)
    ).trim();
    if (raw === "") return q.optional ? [] : [];
    const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
    const idxs = parts.map((p) => parseIndex(p, options.length));
    if (idxs.every((i) => i !== null)) {
      // De-dupe while preserving order.
      const values = idxs.map((i) => options[i as number]!.value);
      return [...new Set(values)];
    }
    io.say("Please enter option numbers separated by commas.");
  }
  return [];
}

async function askYesNo(io: InterviewIO, q: Question): Promise<Answer> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const raw = (await io.ask(`(yes/no)${skipHint(q.optional)}`)).trim().toLowerCase();
    if (raw === "" && q.optional) return null;
    if (["y", "yes"].includes(raw)) return true;
    if (["n", "no"].includes(raw)) return false;
    io.say("Please answer yes or no.");
  }
  return q.optional ? null : false;
}

async function askNumber(io: InterviewIO, q: Question): Promise<Answer> {
  const unit = q.unit ? ` ${q.unit}` : "";
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const raw = (await io.ask(`Enter a number${unit}${skipHint(q.optional)}`)).trim();
    if (raw === "" && q.optional) return null;
    const n = Number(raw);
    if (Number.isFinite(n) && (q.min === undefined || n >= q.min) && (q.max === undefined || n <= q.max)) {
      return n;
    }
    const range = q.min !== undefined && q.max !== undefined ? ` between ${q.min} and ${q.max}` : "";
    io.say(`Please enter a valid number${range}.`);
  }
  return null;
}

/** Present a question, validate the answer, and return the typed value. */
export async function askQuestion(io: InterviewIO, q: Question): Promise<Answer> {
  const header = q.why ? `${q.prompt}\n(${q.why})` : q.prompt;
  io.say(header);

  switch (q.kind) {
    case "single":
      return askSingle(io, q);
    case "multi":
      return askMulti(io, q);
    case "yesno":
      return askYesNo(io, q);
    case "number":
      return askNumber(io, q);
  }
}
