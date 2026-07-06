import { test } from "node:test";
import assert from "node:assert/strict";
import { buildJobQuery } from "./query.ts";
import { emptyProfile } from "../models/index.ts";

test("uses the primary desired role as the search term", () => {
  const p = emptyProfile();
  p.careerGoals.desiredRoles = ["Backend Engineer", "Full-Stack Engineer"];
  const q = buildJobQuery(p);
  assert.equal(q.what, "Backend Engineer");
});

test("falls back to industry when no role is set", () => {
  const p = emptyProfile();
  p.careerGoals.industries = ["Healthcare"];
  assert.equal(buildJobQuery(p).what, "Healthcare");
});

test("remoteOnly is set only when remote is the sole arrangement", () => {
  const remote = emptyProfile();
  remote.preferences.arrangements = ["remote"];
  assert.equal(buildJobQuery(remote).remoteOnly, true);

  const mixed = emptyProfile();
  mixed.preferences.arrangements = ["remote", "hybrid"];
  assert.equal(buildJobQuery(mixed).remoteOnly, undefined);
});

test("passes salaryMin through when present", () => {
  const p = emptyProfile();
  p.preferences.salaryMin = 60000;
  assert.equal(buildJobQuery(p).salaryMin, 60000);
});
