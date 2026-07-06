# Job Matcher

A career assistant that runs a **structured interview** (one question at a time,
like a guided recruiter), builds a candidate profile, then searches real job
APIs and returns a **ranked, explained** list of matches.

It is **rule-based, not AI-driven**: the interview is a branching questionnaire
and job matches are scored with a transparent weighted point system. No LLM, no
API costs, fully deterministic and explainable.

You pick **one source per run** — JobTech (Sweden) or Adzuna (international) —
and the questions, search, and scoring adapt to that source.

> Status: **Working end-to-end.** interview → search → ranked, explained results.

## How it works

```
pick source → structured interview → build query → search that source
            → rank (per-source weighted score) → explained results
```

Each job gets a 0–100 score from weighted sub-scores (title, skills, experience,
location, remote, salary, employment). Crucially, a dimension only counts when
the data exists — JobTech rarely lists salary, Adzuna has no remote flag — so
missing fields are skipped, never scored as zero. Every result shows **why** it
matched and **what's missing**:

```
 1. [ 84/100]  Backend Engineer — Randstad Technologies
      London, UK · hybrid · 117,000–130,000 GBP
      ✓ Title matches your target role
      ✓ Matches your skills: Go
      ✓ Hybrid — matches your preference
      → https://www.adzuna.co.uk/jobs/...
```

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
  interview/  structured branching questionnaire (source-aware)    ✓
  profile/    profile summary + job-query building                 ✓
  apis/       job providers (JobTech, Adzuna) behind one interface ✓
  ranking/    per-source weighted scoring & explanations           ✓
  results.ts  terminal renderer for ranked jobs
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
