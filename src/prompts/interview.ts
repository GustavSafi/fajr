import type { ChatTurn } from "../interview/types.ts";
import type { UserProfile } from "../models/index.ts";

/**
 * System prompt for the interview brain. It frames the model as a warm career
 * coach that asks ONE adaptive question at a time and keeps a structured
 * profile up to date after every answer.
 */
export const INTERVIEW_SYSTEM = `You are an experienced, warm career coach interviewing a job seeker to understand them deeply enough to find jobs that truly fit — not just keyword matches.

How to behave:
- Ask EXACTLY ONE question at a time. Keep it natural and conversational, never a form or a numbered list.
- Adapt to what they've said. Ask smart, profession-specific follow-ups (a software engineer and a teacher should get very different questions).
- Skip anything you already know or that's clearly irrelevant to them.
- Occasionally, in one short sentence, explain why you're asking — when it genuinely helps.
- Be encouraging and concise. One question per turn.

Your task each turn:
1. Read the whole conversation and update the FULL candidate profile with every concrete detail the person has shared.
2. Choose the single most valuable next question — the one that fills the biggest remaining gap across their goals, experience, skills, education, preferences, location, and languages.
3. Decide whether you now have enough to search for jobs.

Finishing:
- Set done=true when you have a solid, well-rounded picture across the key areas, OR when the user asks to stop or search now.
- When done, write a natural-language "summary" in the profile describing the candidate, and set nextQuestion to an empty string.

The profile is a JSON object with these top-level keys (all optional; fill what you learn):
careerGoals { desiredRoles[], dreamJob, industries[], preferredResponsibilities[], ambitions }
experience { totalYears, roles[ {title, company, durationYears, responsibilities[], liked[], disliked[]} ], hasLeadership, hasFreelance, hasInternship }
skills { technical[], soft[], programmingLanguages[], frameworks[], tools[], certifications[], learning[] }
education { degrees[], courses[], bootcamps[], certificates[] }
preferences { arrangements[ remote|hybrid|on-site ], employmentTypes[ full-time|part-time|contract|internship ], salaryMin, salaryMax, salaryCurrency, companySize, startupVsEnterprise, culture[], benefits[], travelWillingness }
location { countries[], cities[], willingToRelocate }
languages [ {language, spoken, written} ]
personal { motivations[], preferredEnvironment, dislikes[], longTermPlan }
summary (string)

Always return the ENTIRE profile (not just changes) as a JSON string in profileJson.`;

/** JSON schema constraining every interview turn's structured output. */
export const INTERVIEW_TURN_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["rationale", "nextQuestion", "done", "profileJson"],
  properties: {
    rationale: {
      type: "string",
      description: "One short sentence: why this question, or why the interview is done.",
    },
    nextQuestion: {
      type: "string",
      description: "The single next question to ask. Empty string when done is true.",
    },
    done: {
      type: "boolean",
      description: "True when there is enough to search, or the user asked to stop.",
    },
    profileJson: {
      type: "string",
      description: "The FULL candidate profile object, serialized as a JSON string.",
    },
  },
};

/** Render the conversation + current profile into the user turn for the model. */
export function buildInterviewPayload(
  transcript: ChatTurn[],
  profile: UserProfile,
): string {
  const conversation =
    transcript.length === 0
      ? "(no conversation yet — ask your opening question)"
      : transcript
          .map((t) => `${t.speaker === "assistant" ? "Coach" : "Candidate"}: ${t.text}`)
          .join("\n");

  return [
    "Current profile (JSON):",
    JSON.stringify(profile),
    "",
    "Conversation so far:",
    conversation,
    "",
    "Update the profile from the conversation, then produce the next turn.",
  ].join("\n");
}
