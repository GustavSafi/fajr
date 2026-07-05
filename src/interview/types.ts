import type { UserProfile } from "../models/index.ts";

export type Speaker = "assistant" | "user";

/** One line of the interview conversation. */
export interface ChatTurn {
  speaker: Speaker;
  text: string;
}

/**
 * The result of one interview step: the (possibly updated) profile, plus the
 * next question to ask — or a signal that we have enough to search.
 */
export interface InterviewTurn {
  /** Short note on why this question was chosen, or why the interview is done. */
  rationale: string;
  /** The next question to ask the user, or null when the interview is complete. */
  question: string | null;
  /** True when enough has been collected (or the user asked to stop). */
  done: boolean;
  /** The full candidate profile, updated from everything said so far. */
  profile: UserProfile;
}

/**
 * The "brain" of the interview. Given the transcript and current profile, it
 * decides what to ask next and keeps the structured profile up to date.
 *
 * This interface is the seam that lets us swap a real LLM (ClaudeBrain) for a
 * deterministic MockBrain in tests.
 */
export interface InterviewBrain {
  next(transcript: ChatTurn[], profile: UserProfile): Promise<InterviewTurn>;
}

/** Terminal input/output, abstracted so the engine can be driven in tests. */
export interface InterviewIO {
  say(message: string): void;
  ask(question: string): Promise<string>;
  close?(): void;
}
