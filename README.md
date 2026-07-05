# Job Matcher

A career assistant that runs a **structured interview** (one question at a time,
like a guided recruiter), builds a candidate profile, then searches real job
APIs and returns a **ranked, explained** list of matches.

It is **rule-based, not AI-driven**: the interview is a branching questionnaire
and job matches are scored with a transparent weighted point system. No LLM, no
API costs, fully deterministic and explainable.

> Status: **Step 2 of 8 — interview complete.** Job search and ranking next.

## Requirements

- Node.js **≥ 20** (uses the built-in TypeScript stripping to run from source)

## Setup

```bash
npm install
cp .env.example .env   # only needed once you wire up job search (later steps)
```

The **interview needs no keys**. Job-search providers do:

| Provider | Keys | Notes |
| --- | --- | --- |
| Adzuna | `ADZUNA_APP_ID` + `ADZUNA_APP_KEY` | Free tier; from developer.adzuna.com |
| JobTech Dev | — | Open API, **no key needed** |

Keys live in `.env` (git-ignored, never committed).

## Run

```bash
npm run dev        # run the interview from source (no build step)
npm run build      # compile to dist/
npm start          # run the compiled build
npm run typecheck  # type-check only
npm test           # run unit tests
```

## Architecture

```
src/
  config/     typed environment loading & validation (job providers only)
  models/     shared types (UserProfile, Job, JobProvider, ...)
  interview/  structured branching questionnaire + points engine  (step 2 ✓)
  profile/    profile summary & (soon) job-query building          (step 3)
  apis/       job providers behind one interface                   (step 4)
  ranking/    weighted compatibility scoring & explanations        (step 6)
  utils/      logging & helpers
```

### Design principles

- **Interview as data** — questions are a plain array with `when` (branching)
  and `apply` (profile mapping) functions. Adding or reordering questions is a
  data edit, not a code change.
- **One `JobProvider` interface** — adding a new job API is a single new file.
- **Explainable scoring** — the 0–100 score is a weighted sum of named
  sub-scores (title, skills, experience, location, remote, salary, …), so every
  recommendation can say exactly *why* it matched and what's missing.
- **Secrets only via `config/`** — nothing else reads `process.env`.
