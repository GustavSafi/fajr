import { test } from "node:test";
import assert from "node:assert/strict";
import { runInterview } from "./engine.ts";
import type { InterviewIO, Question } from "./types.ts";

/** Scripted IO: replies with prepared answers in order, records prompts. */
function scriptedIO(answers: string[]): { io: InterviewIO; asked: string[] } {
  const asked: string[] = [];
  let i = 0;
  const io: InterviewIO = {
    say: () => {},
    ask: async (prompt) => {
      asked.push(prompt);
      return answers[i++] ?? "";
    },
  };
  return { io, asked };
}

test("branching: software path asks language question, teaching path does not", async () => {
  const bank: Question[] = [
    {
      id: "field",
      kind: "single",
      prompt: "Field?",
      options: [
        { value: "software", label: "Software" },
        { value: "teaching", label: "Teaching" },
      ],
      apply: () => {},
    },
    {
      id: "langs",
      kind: "multi",
      prompt: "Languages?",
      when: (a) => a["field"] === "software",
      options: [
        { value: "Go", label: "Go" },
        { value: "Python", label: "Python" },
      ],
      apply: (p, a) => {
        p.skills.programmingLanguages = a as string[];
      },
    },
  ];

  // Software -> asked the language question.
  const sw = scriptedIO(["1", "1,2"]);
  const swResult = await runInterview(sw.io, bank);
  assert.equal(sw.asked.length, 2);
  assert.deepEqual(swResult.profile.skills.programmingLanguages, ["Go", "Python"]);

  // Teaching -> language question skipped entirely.
  const te = scriptedIO(["2"]);
  const teResult = await runInterview(te.io, bank);
  assert.equal(te.asked.length, 1);
  assert.equal(teResult.profile.skills.programmingLanguages, undefined);
});

test("multi-select parses comma list and de-dupes", async () => {
  const bank: Question[] = [
    {
      id: "arr",
      kind: "multi",
      prompt: "Arrangement?",
      options: [
        { value: "remote", label: "Remote" },
        { value: "hybrid", label: "Hybrid" },
        { value: "on-site", label: "On-site" },
      ],
      apply: (p, a) => {
        p.preferences.arrangements = a as never;
      },
    },
  ];
  const { io } = scriptedIO(["1, 3, 1"]); // duplicate 1 should collapse
  const result = await runInterview(io, bank);
  assert.deepEqual(result.profile.preferences.arrangements, ["remote", "on-site"]);
});

test("number and yes/no answers map into the profile; a summary is produced", async () => {
  const bank: Question[] = [
    {
      id: "years",
      kind: "number",
      prompt: "Years?",
      min: 0,
      max: 60,
      apply: (p, a) => {
        p.experience.totalYears = a as number;
      },
    },
    {
      id: "lead",
      kind: "yesno",
      prompt: "Leadership?",
      apply: (p, a) => {
        p.experience.hasLeadership = a as boolean;
      },
    },
    {
      id: "role",
      kind: "single",
      prompt: "Role?",
      options: [{ value: "Backend Engineer", label: "Backend Engineer" }],
      apply: (p, a) => {
        p.careerGoals.desiredRoles = [a as string];
      },
    },
  ];
  const { io } = scriptedIO(["7", "yes", "1"]);
  const result = await runInterview(io, bank);

  assert.equal(result.profile.experience.totalYears, 7);
  assert.equal(result.profile.experience.hasLeadership, true);
  assert.ok(result.profile.summary.includes("7 years"), "summary reflects experience");
});

test("invalid then valid input for a required single question re-prompts", async () => {
  const bank: Question[] = [
    {
      id: "field",
      kind: "single",
      prompt: "Field?",
      options: [{ value: "software", label: "Software" }],
      apply: (p, a) => {
        p.careerGoals.industries = [a as string];
      },
    },
  ];
  // "9" is out of range, then "1" is valid.
  const { io, asked } = scriptedIO(["9", "1"]);
  const result = await runInterview(io, bank);
  assert.equal(asked.length, 2, "should re-prompt after an invalid choice");
  assert.deepEqual(result.profile.careerGoals.industries, ["software"]);
});
