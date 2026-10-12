import { MemoryLimitStore, type LimitStore, type LimitVerdict } from "./store";

/**
 * Vilken kvotbutik som används, och vad som händer när ingen finns.
 *
 * Produktion utan en delad butik får **inte** servera gratis AI. Hellre att
 * gratisförsöket är avstängt tills Supabase är inkopplat än att det står öppet
 * utan räknare — i en serverlös miljö betyder "räknare i minnet" i praktiken
 * ingen räknare alls.
 */

let store: LimitStore | null = null;

export function limitStore(): LimitStore {
  if (!store) store = new MemoryLimitStore();
  return store;
}

/** Sätts när Supabase kopplas in. */
export function setLimitStore(next: LimitStore) {
  store = next;
}

/** Ett enda gratisförsök, och det förnyas aldrig. */
export const FREE_TRIAL_LIMIT = 1;
export const FREE_TRIAL_WINDOW_SECONDS = 60 * 60 * 24 * 365;

export function freeTrialAvailable(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return limitStore().durable;
}

export type { LimitStore, LimitVerdict };
