// src/app/data/marketDataService.ts

/**
 * Volatix — Market Data Service (Milestone 3)
 *
 * Provider-agnostic application service that resolves a full `TickerData` for a
 * raw ticker, applying the production failure policy:
 *   • serve fresh live data on success,
 *   • retry retryable errors,
 *   • serve the last-good cached `TickerData` when a live fetch fails,
 *   • never silently substitute mock — mock is used only in `mock` mode.
 *
 * DESIGN: intentionally CLIENT-SAFE and dependency-injected. It does NOT import
 * `YahooDataProvider` (Node-only); the live provider and the mock fetcher are
 * injected at a SERVER-ONLY composition site (marketData.server.ts). The fan-out
 * itself lives in `assembleTickerData` (mockData.ts) — the single source of truth
 * shared with `generateMockData` — so this service holds no duplicate assembly.
 *
 * SCOPE: M3 delivers resilience; `getTickerData` returns `TickerData | null` and
 * is extended to carry data-status (source / asOf / stale) in M4.
 *
 * @module data/marketDataService
 */

import {
  type TickerData,
  type TickerDataStatus,
  type IDataProvider,
  assembleTickerData,
  normalizeTicker,
  getMarketDataMode,
} from './mockData';

/** Fetch a full TickerData from the mock generator (e.g. `generateMockData`). */
export type MockFetch = (rawTicker: string) => Promise<TickerData | null>;

export interface MarketDataServiceDeps {
  /** Live source (e.g. YahooDataProvider), injected at a server-only site. */
  liveProvider: IDataProvider;

  /** Mock/simulated source, used only in `mock` mode. */
  mockFetch: MockFetch;

  /** Injectable clock (tests). Defaults to Date.now. */
  now?: () => number;

  /** Retryable-error retries on the live path (default 1). */
  maxRetries?: number;

  /** Base delay for exponential backoff in ms (default 250). */
  baseRetryDelayMs?: number;
}

export interface MarketDataService {
  /** Resolve TickerData for a RAW ticker string (normalized once, internally). */
  getTickerData(rawTicker: string): Promise<TickerData | null>;
}

interface CacheEntry {
  data: TickerData;
  fetchedAt: number; // ms — surfaced as the "as of" timestamp in M4
}

export function createMarketDataService(deps: MarketDataServiceDeps): MarketDataService {
  const now = deps.now ?? (() => Date.now());
  const maxRetries = deps.maxRetries ?? 1;
  const baseRetryDelayMs = deps.baseRetryDelayMs ?? 250;

  const cache = new Map<string, CacheEntry>();

  async function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function getTickerData(rawTicker: string): Promise<TickerData | null> {
    const normalized = normalizeTicker(rawTicker);

    // `mock` mode = simulated data; explicit opt-in / dev / demo only.
    if (getMarketDataMode() === 'mock') {
      const data = await deps.mockFetch(rawTicker);
      return data
        ? {
            ...data,
            dataStatus: {
              source: 'mock',
              asOf: now(),
              stale: false,
              simulated: true,
            },
          }
        : null;
    }

    // `live` mode: try fresh, retrying only while failures are retryable.
    const key = normalized.normalized;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      let data: TickerData | null = null;
      let retryable = false;

      try {
        ({ data, retryable } = await assembleTickerData(deps.liveProvider, normalized));
      } catch {
        // Defensive: IDataProvider implementations should return DataResult
        // instead of throwing. Treat unexpected throws as retryable.
        retryable = true;
      }

      if (data) {
        const asOf = now();
        const dataStatus: TickerDataStatus = {
          source: 'live',
          asOf,
          stale: false,
          simulated: false,
        };
        const freshData = { ...data, dataStatus };

        cache.set(key, {
          data: freshData,
          fetchedAt: asOf,
        });

        return freshData;
      }

      if (!retryable) {
        break;
      }

      // Exponential backoff before retrying.
      if (attempt < maxRetries) {
        const delay = baseRetryDelayMs * Math.pow(2, attempt);
        await sleep(delay);
      }
    }

    // Failure policy: serve last-good cached real data; never silent mock.
    const cached = cache.get(key);
    return cached
      ? {
          ...cached.data,
          dataStatus: {
            source: 'live',
            asOf: cached.fetchedAt,
            stale: true,
            simulated: false,
          },
        }
      : null;
  }

  return {
    getTickerData,
  };
}
