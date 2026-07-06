/** Fetch JSON with a timeout. Throws on non-2xx or network/timeout error. */
export async function fetchJson<T = unknown>(
  url: string | URL,
  timeoutMs = 12000,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText} for ${new URL(url).host}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}
