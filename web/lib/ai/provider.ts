/**
 * Enda stället som pratar med språkmodellen.
 *
 * Rakt mot Messages-API:et med fetch i stället för Anthropics SDK. Vi gör ett
 * enda slags anrop, och ett paket till i bundlen för det är inte värt det —
 * dessutom håller det koden plattformsoberoende, vilket är samma princip som
 * JobTech-klienten följer.
 *
 * Funktionen kastar aldrig. En analys som inte går att hämta ska visa ett
 * vänligt fel, inte krascha annonssidan. Och viktigast: den **kostar pengar
 * varje gång den körs**, så allt som kan göra ett anrop i onödan — en retry
 * för mycket, en oparsad cache-miss — är en bugg med prislapp.
 */

const API_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";

/**
 * Sonnet, inte Haiku. Analysen ska våga säga att någon inte passar och
 * motivera varför utan att hitta på krav som inte står i annonsen — det är
 * precis den sortens omdöme som skiljer modellerna åt. Haiku vore tio gånger
 * billigare och det vore fel ställe att spara.
 */
const DEFAULT_MODEL = "claude-sonnet-5-5";

export function aiModel(): string {
  return process.env.AI_MODEL?.trim() || DEFAULT_MODEL;
}

/** Utan nyckel kör vi mock. Det är så hela flödet går att bygga och testa. */
export function isAiMock(): boolean {
  return process.env.AI_MOCK === "1" || !process.env.ANTHROPIC_API_KEY;
}

export type AiFailure =
  | "no-key"
  | "rate-limited"
  | "overloaded"
  | "timeout"
  | "bad-response"
  | "error";

export type AiResult =
  | { ok: true; text: string; inputTokens: number; outputTokens: number }
  | { ok: false; reason: AiFailure };

interface MessagesResponse {
  content?: Array<{ type?: string; text?: string }>;
  usage?: { input_tokens?: number; output_tokens?: number };
}

export interface CompleteOptions {
  system: string;
  user: string;
  maxTokens: number;
  /**
   * Första tecknen i svaret, lagda i modellens mun. För JSON-svar sätter vi
   * "{" — då kan modellen inte inleda med "Här kommer din analys:" och vi
   * slipper en parsning som fallerar på artighet.
   */
  prefill?: string;
  temperature?: number;
}

export async function complete(opts: CompleteOptions): Promise<AiResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { ok: false, reason: "no-key" };

  const messages: Array<{ role: "user" | "assistant"; content: string }> = [
    { role: "user", content: opts.user },
  ];
  if (opts.prefill) messages.push({ role: "assistant", content: opts.prefill });

  // Ett försök till, men bara när felet är övergående. Ett 400 beror på oss
  // och blir aldrig bättre av att skickas igen.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": key,
          "anthropic-version": API_VERSION,
        },
        body: JSON.stringify({
          model: aiModel(),
          max_tokens: opts.maxTokens,
          temperature: opts.temperature ?? 0.3,
          system: opts.system,
          messages,
        }),
        signal: AbortSignal.timeout(45_000),
        cache: "no-store",
      });

      if (res.status === 429 || res.status >= 500) {
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 1200));
          continue;
        }
        return { ok: false, reason: res.status === 429 ? "rate-limited" : "overloaded" };
      }

      if (!res.ok) {
        console.warn(`Anthropic svarade ${res.status}`);
        return { ok: false, reason: "error" };
      }

      const data = (await res.json()) as MessagesResponse;
      const text = (data.content ?? [])
        .filter((block) => block.type === "text" && block.text)
        .map((block) => block.text!)
        .join("");

      if (!text.trim()) return { ok: false, reason: "bad-response" };

      return {
        ok: true,
        // Prefillen kommer inte tillbaka i svaret — vi sätter tillbaka den.
        text: `${opts.prefill ?? ""}${text}`,
        inputTokens: data.usage?.input_tokens ?? 0,
        outputTokens: data.usage?.output_tokens ?? 0,
      };
    } catch (err) {
      const timeout = err instanceof Error && err.name === "TimeoutError";
      if (timeout || attempt === 1) {
        return { ok: false, reason: timeout ? "timeout" : "error" };
      }
    }
  }

  return { ok: false, reason: "error" };
}
