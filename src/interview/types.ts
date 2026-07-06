import type { JobSource, UserProfile } from "../models/index.ts";

/** A single answer, shaped by the question kind. `null` means skipped. */
export type Answer = string | string[] | number | boolean | null;

/** All answers collected so far, keyed by question id. Used for branching. */
export type Answers = Record<string, Answer>;

export type QuestionKind = "single" | "multi" | "yesno" | "number";

export interface QuestionOption {
  /** Stable value stored in answers and used by `when` branching. */
  value: string;
  /** Text shown to the user. */
  label: string;
}

/**
 * One interview question. Questions are plain data + two small functions:
 * `when` decides whether the question applies (branching), and `apply` writes
 * the answer into the structured profile. No AI — fully deterministic.
 */
export interface Question {
  id: string;
  kind: QuestionKind;
  prompt: string;
  /** Optional one-liner explaining why we ask — shown to the user. */
  why?: string;
  /** Options for `single` / `multi` questions. */
  options?: QuestionOption[];
  /** Bounds for `number` questions. */
  min?: number;
  max?: number;
  /** Unit shown next to a number prompt, e.g. "years", "USD/year". */
  unit?: string;
  /** If true, the user may skip (blank answer → null). */
  optional?: boolean;
  /** Branching: only ask when this returns true (given answers so far). */
  when?: (answers: Answers) => boolean;
  /** Write the answer into the profile. */
  apply: (profile: UserProfile, answer: Answer, answers: Answers) => void;
}

/** Terminal input/output, abstracted so the engine can be driven in tests. */
export interface InterviewIO {
  say(message: string): void;
  ask(prompt: string): Promise<string>;
  close?(): void;
}

export interface InterviewResult {
  profile: UserProfile;
  answers: Answers;
  /** The job source the user chose to search. */
  source: JobSource;
}
