import Anthropic from "@anthropic-ai/sdk";
import type { AppConfig } from "../config/config.ts";

/** Build an Anthropic client from validated config. */
export function createAnthropicClient(config: AppConfig): Anthropic {
  if (!config.anthropic.apiKey) {
    throw new Error("ANTHROPIC_API_KEY is missing — cannot create Anthropic client.");
  }
  return new Anthropic({ apiKey: config.anthropic.apiKey });
}

export interface StructuredRequest {
  model: string;
  /** System prompt — the role and rules. */
  system: string;
  /** The user turn content (data + instruction). */
  user: string;
  /** JSON Schema the response is constrained to. */
  schema: Record<string, unknown>;
  maxTokens?: number;
}

/**
 * Make a single Messages API call constrained to a JSON schema via structured
 * outputs, and return the parsed object. Centralized here so the interview and
 * (later) the ranking step share one well-behaved call path.
 */
export async function requestStructured<T>(
  client: Anthropic,
  req: StructuredRequest,
): Promise<T> {
  // `output_config` (structured outputs) is newer than the installed SDK's
  // param types, so we assemble params loosely and cast at the call boundary.
  const params = {
    model: req.model,
    max_tokens: req.maxTokens ?? 4000,
    system: req.system,
    messages: [{ role: "user", content: req.user }],
    output_config: { format: { type: "json_schema", schema: req.schema } },
  } as unknown as Anthropic.MessageCreateParamsNonStreaming;

  const response = await client.messages.create(params);

  const text = response.content
    .map((block) => ("text" in block ? block.text : ""))
    .join("")
    .trim();

  if (!text) {
    throw new Error("Anthropic returned no text content for a structured request.");
  }

  return JSON.parse(text) as T;
}
