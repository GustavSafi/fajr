import * as readline from "node:readline";
import { stdin, stdout } from "node:process";
import type { InterviewIO } from "./types.ts";

/**
 * Terminal-backed InterviewIO.
 *
 * Uses readline's async line iterator rather than `readline/promises`'
 * `question()` — the latter only resolves its first call when stdin is piped
 * (non-TTY), which breaks scripted input. The iterator works for both an
 * interactive terminal and piped input.
 */
export function createCliIO(): InterviewIO {
  const rl = readline.createInterface({ input: stdin });
  const lines = rl[Symbol.asyncIterator]();

  return {
    say(message: string) {
      stdout.write(`\n${message}\n`);
    },
    async ask(question: string): Promise<string> {
      stdout.write(`\n${question}\n> `);
      const { value, done } = await lines.next();
      return done ? "" : String(value).trim();
    },
    close() {
      rl.close();
    },
  };
}
