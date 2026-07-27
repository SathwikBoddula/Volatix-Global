// src/app/data/marketData.server.ts
/**
 * Volatix — Market Data (Server-Only Composition Site) (Milestone 3)
 *
 * This is the SERVER-ONLY wiring point where the Node-only live provider
 * (`YahooDataProvider`) and the client-safe mock generator (`generateMockData`)
 * are injected into the provider-agnostic `MarketDataService`. Concentrating the
 * composition here — behind `server-only` — is what keeps `yahoo-finance2` (and
 * any Node built-ins it reaches for) out of every client bundle.
 *
 * The `import 'server-only'` turns that boundary into a BUILD ERROR instead of a
 * subtle runtime bug: if a Client Component ever imports this module (directly or
 * transitively), the build fails loudly rather than shipping Node code to the
 * browser. `marketDataService.ts` stays client-safe precisely because it never
 * imports the live provider — this file is the only place they meet.
 *
 * WHY A MODULE SINGLETON: the service owns the last-good `TickerData` cache used
 * for stale-fallback. Building it once at module load lets that cache survive
 * across requests within a server instance, and it costs nothing in `mock` mode —
 * `YahooDataProvider` only imports `yahoo-finance2` lazily, on the first live
 * fetch, so constructing it here has zero bundle/runtime impact until used.
 *
 * LIVE-PATH CACHING: the live provider is wrapped in its own `CacheProvider`
 * instance (the same class the mock path uses via `ProviderRegistry`, exported
 * for reuse here) rather than reassigning that singleton — reassigning it would
 * mutate `generateMockData`'s wrapped provider for every other caller. This
 * instance is dedicated to `YahooDataProvider` only. It shares `CacheProvider`'s
 * existing TTL policy unmodified: `LIVE_CACHE_TTL_MS` for history/summary/
 * forecast/backtest, and `CacheProvider`'s own hardcoded 1-hour TTL for metadata.
 *
 * USAGE: server code (page.tsx, File 6) calls `getTickerData(rawTicker)` with a
 * RAW ticker string. Normalization, mode selection (`MARKET_DATA_MODE`), retry of
 * retryable failures, and stale-cache fallback all happen inside the service.
 *
 * @server-only
 * @module data/marketData.server
 */

import 'server-only';

import { createMarketDataService, type MarketDataService } from './marketDataService';
import { YahooDataProvider } from './YahooDataProvider';
import { generateMockData, type TickerData, CacheProvider } from './mockData';

/** History/summary/forecast/backtest TTL for the live path. Metadata uses CacheProvider's own 1h TTL. */
const LIVE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function createCachedLiveProvider(): CacheProvider {
  const cached = new CacheProvider();
  cached.setDefaultTtl(LIVE_CACHE_TTL_MS);
  cached.setWrappedProvider(new YahooDataProvider());
  return cached;
}

const marketDataService: MarketDataService = createMarketDataService({
  liveProvider: createCachedLiveProvider(),
  mockFetch: generateMockData,
});

export function getTickerData(rawTicker: string): Promise<TickerData | null> {
  return marketDataService.getTickerData(rawTicker);
}
