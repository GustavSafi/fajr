import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreJob, rankJobs } from "./index.ts";
import { emptyProfile } from "../models/index.ts";
import type { Job, UserProfile } from "../models/index.ts";

function baseProfile(): UserProfile {
  const p = emptyProfile();
  p.careerGoals.desiredRoles = ["Backend Engineer"];
  p.skills.programmingLanguages = ["Go", "Python"];
  p.experience.totalYears = 6;
  p.preferences.arrangements = ["remote"];
  p.preferences.employmentTypes = ["full-time"];
  p.preferences.salaryMin = 60000;
  p.location.countries = ["United Kingdom"];
  return p;
}

const strongAdzuna: Job = {
  id: "adzuna:1",
  source: "adzuna",
  title: "Senior Backend Engineer",
  description: "Build Go and Python microservices. Fully remote team.",
  company: "Acme",
  country: "United Kingdom",
  arrangement: "remote",
  employmentType: "full-time",
  salaryMin: 70000,
  salaryMax: 70000,
  salaryCurrency: "GBP",
  url: "https://x",
};

const weakAdzuna: Job = {
  id: "adzuna:2",
  source: "adzuna",
  title: "Junior Frontend Developer",
  description: "React and CSS.",
  company: "Beta",
  country: "United States",
  salaryMin: 30000,
  salaryMax: 30000,
  salaryCurrency: "USD",
  url: "https://y",
};

test("a well-matched job scores higher than a poorly-matched one", () => {
  const p = baseProfile();
  const strong = scoreJob(p, strongAdzuna, "adzuna");
  const weak = scoreJob(p, weakAdzuna, "adzuna");
  assert.ok(strong.score > weak.score, `${strong.score} should beat ${weak.score}`);
  assert.ok(strong.score >= 80, `strong match should score high, got ${strong.score}`);
});

test("reasons and gaps are explainable", () => {
  const p = baseProfile();
  const strong = scoreJob(p, strongAdzuna, "adzuna");
  assert.ok(strong.reasons.some((r) => r.includes("Title matches")), "should cite title match");
  assert.ok(strong.reasons.some((r) => r.toLowerCase().includes("go")), "should cite skill match");
  assert.ok(strong.reasons.some((r) => r.toLowerCase().includes("salary")), "should cite salary");

  const weak = scoreJob(p, weakAdzuna, "adzuna");
  assert.ok(weak.gaps.some((g) => g.includes("Salary")), "should flag low salary");
  assert.ok(weak.gaps.some((g) => g.includes("location")), "should flag location mismatch");
});

test("missing salary is neutral for JobTech, not a penalty in the weighted score", () => {
  const p = baseProfile();
  p.location.countries = ["Sweden"];
  const jt: Job = {
    id: "jobtech:1",
    source: "jobtech",
    title: "Backend Developer",
    description: "",
    company: "Nordic AB",
    country: "Sweden",
    arrangement: "remote",
    requiredSkills: ["Go, programmeringsspråk", "Rust"],
    url: "https://z",
  };
  const ranked = scoreJob(p, jt, "jobtech");
  // Salary dimension is not applicable, so it doesn't appear in the weighted sum.
  const salary = ranked.subScores.find((s) => s.dimension === "salary");
  assert.equal(salary?.applicable, false);
  // Still scores reasonably on title/skills/location/remote.
  assert.ok(ranked.score > 40, `expected a usable score, got ${ranked.score}`);
  // Flags the required skill the candidate lacks.
  assert.ok(ranked.gaps.some((g) => g.includes("Rust")), "should flag missing Rust requirement");
});

test("rankJobs sorts best-first and de-dupes identical title+company", () => {
  const p = baseProfile();
  const dup: Job = { ...strongAdzuna, id: "adzuna:dup" };
  const ranked = rankJobs(p, [weakAdzuna, strongAdzuna, dup], "adzuna");
  assert.equal(ranked.length, 2, "duplicate title+company collapsed");
  assert.ok(ranked[0]!.score >= ranked[1]!.score, "sorted descending");
  assert.equal(ranked[0]!.job.title, "Senior Backend Engineer");
});
