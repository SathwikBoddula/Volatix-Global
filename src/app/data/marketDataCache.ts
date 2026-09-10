import type { TickerData } from './mockData';

/** A successfully resolved live payload eligible for stale-if-error fallback. */
export interface MarketDataCacheEntry {
  data: TickerData;
  fetchedAt: number;
}

/**
 * Replaceable persistence boundary for the service's last-good live data.
 * Implementations must return `null` after the supplied TTL has elapsed.
 */
export interface MarketDataCache {
  get(ticker: string): Promise<MarketDataCacheEntry | null>;
  set(ticker: string, entry: MarketDataCacheEntry, ttlMs: number): Promise<void>;
}

interface StoredEntry extends MarketDataCacheEntry {
  expiresAt: number;
}

/**
 * Per-server cache adapter for development and single-instance deployment.
 * A distributed adapter can implement MarketDataCache without altering service callers.
 */
export class InMemoryMarketDataCache implements MarketDataCache {
  private readonly entries = new Map<string, StoredEntry>();

  constructor(private readonly now: () => number = () => Date.now()) {}

  async get(ticker: string): Promise<MarketDataCacheEntry | null> {
    const entry = this.entries.get(ticker);

    if (!entry) {
      return null;
    }

    if (entry.expiresAt <= this.now()) {
      this.entries.delete(ticker);
      return null;
    }

    return { data: entry.data, fetchedAt: entry.fetchedAt };
  }

  async set(ticker: string, entry: MarketDataCacheEntry, ttlMs: number): Promise<void> {
    if (ttlMs <= 0) {
      this.entries.delete(ticker);
      return;
    }

    this.entries.set(ticker, {
      ...entry,
      expiresAt: this.now() + ttlMs,
    });
  }
}
