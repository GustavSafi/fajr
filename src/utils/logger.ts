/** Minimal leveled logger. Verbosity is controlled by the LOG_LEVEL env var. */

const LEVELS = ["error", "warn", "info", "debug"] as const;
export type LogLevel = (typeof LEVELS)[number];

function currentLevel(): LogLevel {
  const raw = (process.env["LOG_LEVEL"] ?? "info").toLowerCase();
  return (LEVELS as readonly string[]).includes(raw) ? (raw as LogLevel) : "info";
}

function enabled(level: LogLevel): boolean {
  return LEVELS.indexOf(level) <= LEVELS.indexOf(currentLevel());
}

function emit(level: LogLevel, args: unknown[]): void {
  if (!enabled(level)) return;
  const tag = `[${level.toUpperCase()}]`;
  const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  fn(tag, ...args);
}

export const logger = {
  error: (...args: unknown[]) => emit("error", args),
  warn: (...args: unknown[]) => emit("warn", args),
  info: (...args: unknown[]) => emit("info", args),
  debug: (...args: unknown[]) => emit("debug", args),
};
