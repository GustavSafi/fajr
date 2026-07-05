# AI Job Matcher

An AI-powered career assistant that runs an **adaptive interview** (one question
at a time, like a recruiter), builds a structured candidate profile, then
searches real job APIs and returns a **ranked, explained** list of matches.

> Status: **Step 1 of 8 — scaffold & config.** The interview, job search, and
> ranking are being built incrementally.

## Requirements

- Node.js **≥ 20** (uses the built-in `--env-file` and TypeScript stripping)

## Setup

```bash
npm install
cp .env.example .env   # then fill in your keys
```

Keys go in `.env` (git-ignored, never committed):

| Variable | Required | Purpose |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | yes | Powers the adaptive interview & match explanations |
| `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` | optional | Adzuna job search |
| JobTech Dev | — | Open API, **no key needed** |

## Run

```bash
npm run dev        # run from source (no build step)
npm run build      # compile to dist/
npm start          # run the compiled build
npm run typecheck  # type-check only
```

## Architecture

```
src/
  config/     typed environment loading & validation
  models/     shared TypeScript types (UserProfile, Job, JobProvider, ...)
  interview/  adaptive question-asking engine        (step 2)
  profile/    structured profile building & summary   (step 3)
  apis/       job providers behind one interface      (step 4)
  ranking/    compatibility scoring & explanations    (step 6)
  services/   orchestration wiring the pieces together
  prompts/    LLM prompt templates
  utils/      logging & helpers
```

### Design principles

- **One `JobProvider` interface** — adding a new job API is a single new file.
- **Explainable scoring** — the 0–100 score is a weighted sum of named
  sub-scores (title, skills, experience, location, remote, salary, …), so every
  recommendation can say exactly *why* it matched and what's missing.
- **Secrets only via `config/`** — nothing else reads `process.env`.
