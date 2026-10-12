/**
 * Kvoträknaren bakom det anonyma gratisförsöket.
 *
 * Ett AI-anrop utan spärr är en öppen kran: ett skript kan dra tusen analyser
 * innan någon hinner märka det, och varje analys kostar riktiga pengar. Därför
 * finns räknaren innan den första analysen går live — inte efter.
 *
 * Gränssnittet är med flit litet så att minnesvarianten nedan kan bytas mot
 * Supabase utan att något annat i koden rörs.
 */

export interface LimitVerdict {
  allowed: boolean;
  /** Hur många försök som återstår efter det här. */
  remaining: number;
  /** När kvoten nollställs, om den gör det. */
  resetsAt?: Date;
}

export interface LimitStore {
  /** Räknar upp och svarar om anropet får göras. */
  consume(key: string, limit: number, windowSeconds: number): Promise<LimitVerdict>;
  /** Läser utan att räkna upp — för att visa "du har ett försök kvar". */
  peek(key: string, limit: number, windowSeconds: number): Promise<LimitVerdict>;
  /**
   * Lämnar tillbaka ett förbrukat försök.
   *
   * Vi räknar upp *före* anropet, annars kan hundra samtidiga förfrågningar
   * alla läsa "noll förbrukade" och släppas igenom. Men faller analysen på
   * vårt eget fel — timeout, modellen överbelastad — ska besökaren inte ha
   * bränt sitt enda försök på vårt haveri.
   */
  refund(key: string, windowSeconds: number): Promise<void>;
  readonly durable: boolean;
}

interface Entry {
  count: number;
  expiresAt: number;
}

/**
 * Minnesvariant för utveckling.
 *
 * Den överlever inte en omstart och delas inte mellan serverinstanser, så på
 * Vercel skulle varje ny lambda ha en egen tom räknare. Det är exakt därför
 * `durable` är false och varför `lib/limits/index.ts` vägrar servera gratis
 * analyser i produktion utan en riktig butik.
 */
export class MemoryLimitStore implements LimitStore {
  readonly durable = false;
  private entries = new Map<string, Entry>();

  private read(key: string, windowSeconds: number): Entry {
    const now = Date.now();
    const existing = this.entries.get(key);
    if (existing && existing.expiresAt > now) return existing;
    const fresh: Entry = { count: 0, expiresAt: now + windowSeconds * 1000 };
    this.entries.set(key, fresh);
    return fresh;
  }

  async peek(key: string, limit: number, windowSeconds: number): Promise<LimitVerdict> {
    const entry = this.read(key, windowSeconds);
    return {
      allowed: entry.count < limit,
      remaining: Math.max(0, limit - entry.count),
      resetsAt: new Date(entry.expiresAt),
    };
  }

  async refund(key: string, windowSeconds: number): Promise<void> {
    const entry = this.read(key, windowSeconds);
    if (entry.count > 0) entry.count -= 1;
  }

  async consume(key: string, limit: number, windowSeconds: number): Promise<LimitVerdict> {
    const entry = this.read(key, windowSeconds);
    if (entry.count >= limit) {
      return { allowed: false, remaining: 0, resetsAt: new Date(entry.expiresAt) };
    }
    entry.count += 1;
    // Enkel städning så att kartan inte växer i all oändlighet under dev.
    if (this.entries.size > 5000) {
      const now = Date.now();
      for (const [k, v] of this.entries) if (v.expiresAt <= now) this.entries.delete(k);
    }
    return {
      allowed: true,
      remaining: Math.max(0, limit - entry.count),
      resetsAt: new Date(entry.expiresAt),
    };
  }
}
