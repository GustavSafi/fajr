import type { ChatTurn, InterviewBrain, InterviewIO } from "./types.ts";
import type { UserProfile } from "../models/index.ts";
import { emptyProfile } from "../models/index.ts";
import { logger } from "../utils/logger.ts";

export interface InterviewOptions {
  /** Hard cap on questions so the interview always terminates. */
  maxQuestions?: number;
}

export interface InterviewResult {
  profile: UserProfile;
  transcript: ChatTurn[];
}

const GREETING =
  "Hi! I'd love to help you find jobs that actually fit you — not just jobs that happen to contain certain keywords.\n" +
  "I'll ask you a few questions, one at a time, so I can really understand what you're looking for.\n" +
  "(You can type \"search now\" whenever you feel I have enough.)";

const CLOSING = "Thanks — that's everything I need. Let me put together your profile and start searching.";

/** Phrases that let the user cut the interview short and jump to searching. */
const STOP_PHRASES = ["search now", "/search", "that's enough", "just search", "done"];

function isStopPhrase(answer: string): boolean {
  const a = answer.trim().toLowerCase();
  return STOP_PHRASES.some((p) => a === p || a === `"${p}"`);
}

/**
 * Run the adaptive interview: greet, then loop asking one brain-chosen question
 * at a time until the brain decides it has enough (or the user stops). Returns
 * the structured profile and full transcript.
 */
export async function runInterview(
  brain: InterviewBrain,
  io: InterviewIO,
  options: InterviewOptions = {},
): Promise<InterviewResult> {
  const maxQuestions = options.maxQuestions ?? 25;
  const transcript: ChatTurn[] = [];
  let profile = emptyProfile();

  io.say(GREETING);

  let stopped = false;
  for (let asked = 0; asked < maxQuestions; asked++) {
    const turn = await brain.next(transcript, profile);
    profile = turn.profile;
    logger.debug(`Interview rationale: ${turn.rationale}`);

    if (turn.done || !turn.question) break;

    const answer = await io.ask(turn.question);
    transcript.push({ speaker: "assistant", text: turn.question });
    transcript.push({ speaker: "user", text: answer });

    if (isStopPhrase(answer)) {
      stopped = true;
      break;
    }
  }

  // Finalize: one more pass so the last answer is captured and a summary is
  // written (only needed if we stopped early or don't yet have a summary).
  if (stopped || !profile.summary) {
    const finalTurn = await brain.next(transcript, profile);
    profile = finalTurn.profile;
  }

  io.say(CLOSING);
  return { profile, transcript };
}
