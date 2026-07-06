import type { Answers, InterviewIO, InterviewResult, Question } from "./types.ts";
import type { JobSource } from "../models/index.ts";
import type { Lang } from "../i18n.ts";
import { emptyProfile } from "../models/index.ts";
import { QUESTION_BANK } from "./questions.ts";
import { askQuestion } from "./ask.ts";
import { buildSummary } from "../profile/summary.ts";
import { UI } from "./strings.ts";

/** Shown before the source (hence language) is chosen — bilingual. */
const GREETING = `${UI.en.greeting}\n\n${UI.sv.greeting}`;

function langOf(answers: Answers): Lang {
  return answers["source"] === "jobtech" ? "sv" : "en";
}

/**
 * Run the structured interview: walk the question bank in order, skipping the
 * questions that don't apply (branching), record each answer into the profile,
 * and finish with a generated summary. The language follows the chosen source
 * (JobTech → Swedish, Adzuna → English). Fully deterministic — no AI.
 */
export async function runInterview(
  io: InterviewIO,
  questions: Question[] = QUESTION_BANK,
): Promise<InterviewResult> {
  const profile = emptyProfile();
  const answers: Answers = {};

  io.say(GREETING);

  for (const q of questions) {
    if (q.when && !q.when(answers)) continue;
    const lang = langOf(answers);
    const answer = await askQuestion(io, q, lang);
    answers[q.id] = answer;
    q.apply(profile, answer, { answers, lang, question: q });
  }

  const lang = langOf(answers);
  profile.summary = buildSummary(profile, lang);

  const source: JobSource = answers["source"] === "adzuna" ? "adzuna" : "jobtech";

  io.say(UI[lang].closing);
  return { profile, answers, source };
}
