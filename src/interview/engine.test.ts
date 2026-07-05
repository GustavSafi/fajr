import { test } from "node:test";
import assert from "node:assert/strict";
import { runInterview } from "./engine.ts";
import { MockBrain } from "./brain.ts";
import type { ChatTurn, InterviewIO } from "./types.ts";

/** Scripted IO: feeds prepared answers and records everything said/asked. */
function scriptedIO(answers: string[]): {
  io: InterviewIO;
  said: string[];
  asked: string[];
} {
  const said: string[] = [];
  const asked: string[] = [];
  let i = 0;
  const io: InterviewIO = {
    say: (m) => said.push(m),
    ask: async (q) => {
      asked.push(q);
      return answers[i++] ?? "";
    },
  };
  return { io, said, asked };
}

test("asks scripted questions one at a time and captures answers", async () => {
  const questions = ["What role?", "Which skills?", "Relocate?"];
  const answers = ["Backend engineer", "Go and Postgres", "Yes, remote preferred"];
  const { io, asked } = scriptedIO(answers);

  const result = await runInterview(new MockBrain(questions), io, { maxQuestions: 10 });

  // One question at a time, in order.
  assert.deepEqual(asked, questions);

  // Transcript interleaves question/answer pairs.
  const pairs: ChatTurn[] = result.transcript;
  assert.equal(pairs.length, questions.length * 2);
  assert.equal(pairs[0]?.speaker, "assistant");
  assert.equal(pairs[1]?.speaker, "user");
  assert.equal(pairs[1]?.text, "Backend engineer");

  // Profile was updated from answers, and a summary was produced.
  assert.deepEqual(result.profile.careerGoals.desiredRoles, ["Backend engineer"]);
  assert.ok(result.profile.summary.length > 0, "summary should be filled when done");
});

test("stops early when the user says 'search now'", async () => {
  const questions = ["Q1", "Q2", "Q3", "Q4", "Q5"];
  const answers = ["Data analyst", "search now"];
  const { io, asked } = scriptedIO(answers);

  const result = await runInterview(new MockBrain(questions), io, { maxQuestions: 10 });

  // Only two questions were asked before the user bailed out.
  assert.equal(asked.length, 2);
  // The first real answer was still captured.
  assert.deepEqual(result.profile.careerGoals.desiredRoles, ["Data analyst"]);
});

test("respects the maxQuestions cap", async () => {
  const questions = ["Q1", "Q2", "Q3", "Q4", "Q5", "Q6"];
  const answers = questions.map((_, i) => `answer ${i}`);
  const { io, asked } = scriptedIO(answers);

  await runInterview(new MockBrain(questions), io, { maxQuestions: 3 });

  assert.equal(asked.length, 3);
});
