import type Anthropic from "@anthropic-ai/sdk";
import type { ChatTurn, InterviewBrain, InterviewTurn } from "./types.ts";
import type { UserProfile } from "../models/index.ts";
import { requestStructured } from "../services/anthropic.ts";
import { coerceProfile } from "../profile/normalize.ts";
import {
  INTERVIEW_SYSTEM,
  INTERVIEW_TURN_SCHEMA,
  buildInterviewPayload,
} from "../prompts/interview.ts";
import { logger } from "../utils/logger.ts";

/** The raw structured envelope the model returns each turn. */
interface InterviewEnvelope {
  rationale: string;
  nextQuestion: string;
  done: boolean;
  profileJson: string;
}

/** Real interview brain, powered by the Claude API with structured outputs. */
export class ClaudeBrain implements InterviewBrain {
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(client: Anthropic, model: string) {
    this.client = client;
    this.model = model;
  }

  async next(transcript: ChatTurn[], profile: UserProfile): Promise<InterviewTurn> {
    const env = await requestStructured<InterviewEnvelope>(this.client, {
      model: this.model,
      system: INTERVIEW_SYSTEM,
      user: buildInterviewPayload(transcript, profile),
      schema: INTERVIEW_TURN_SCHEMA,
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(env.profileJson);
    } catch {
      // If the model's inner JSON is malformed, keep what we already had rather
      // than losing the profile mid-interview.
      logger.warn("Could not parse profileJson from model; retaining prior profile.");
      parsed = profile;
    }

    const nextProfile = coerceProfile(parsed);
    const question = env.done ? null : env.nextQuestion.trim() || null;

    return {
      rationale: env.rationale,
      question,
      // If the model gave no question and isn't explicitly done, treat as done
      // so we never loop asking nothing.
      done: env.done || question === null,
      profile: nextProfile,
    };
  }
}

/**
 * Deterministic brain for tests and offline demos (`--mock`). Walks a fixed
 * list of questions, records answers into the profile, and finishes when the
 * list is exhausted. No API calls.
 */
export class MockBrain implements InterviewBrain {
  private readonly questions: string[];

  constructor(questions: string[]) {
    this.questions = questions;
  }

  async next(transcript: ChatTurn[], profile: UserProfile): Promise<InterviewTurn> {
    const asked = transcript.filter((t) => t.speaker === "assistant").length;
    const answers = transcript.filter((t) => t.speaker === "user").map((t) => t.text);

    const next = structuredClone(profile);
    // Trivial, deterministic "extraction" so tests can observe the profile grow.
    if (answers[0]) next.careerGoals.desiredRoles = [answers[0]];
    if (answers.length > 1) next.personal.motivations = answers.slice(1);

    if (asked >= this.questions.length) {
      next.summary = `Candidate interested in ${answers[0] ?? "a role"} (${answers.length} answers captured).`;
      return { rationale: "All scripted questions asked.", question: null, done: true, profile: next };
    }

    return {
      rationale: `Scripted question ${asked + 1} of ${this.questions.length}.`,
      question: this.questions[asked] ?? null,
      done: false,
      profile: next,
    };
  }
}
