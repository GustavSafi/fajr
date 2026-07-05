import type { Answers, InterviewIO, InterviewResult, Question } from "./types.ts";
import { emptyProfile } from "../models/index.ts";
import { QUESTION_BANK } from "./questions.ts";
import { askQuestion } from "./ask.ts";
import { buildSummary } from "../profile/summary.ts";

const GREETING =
  "Hi! I'd love to help you find jobs that actually fit you — not just jobs that happen to contain certain keywords.\n" +
  "I'll ask you a few quick questions to understand what you're looking for. Just pick the options that fit.";

const CLOSING = "Thanks — that's everything I need. Let me put together your profile and start searching.";

/**
 * Run the structured interview: walk the question bank in order, skipping the
 * questions that don't apply (branching), record each answer into the profile,
 * and finish with a generated summary. Fully deterministic — no AI.
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
    const answer = await askQuestion(io, q);
    answers[q.id] = answer;
    q.apply(profile, answer, answers);
  }

  profile.summary = buildSummary(profile);

  io.say(CLOSING);
  return { profile, answers };
}
