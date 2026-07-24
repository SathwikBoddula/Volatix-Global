// src/data/providers/index.ts
/**
 * Volatix — Market Data Providers Public API
 *
 * Exports the provider interface and default implementation.
 * Callers import from here — never from concrete implementation files directly.
 *
 * @module data/providers
 */

export type { MarketDataProvider } from './MarketDataProvider';
export { DefaultMarketDataProvider, defaultMarketDataProvider } from './DefaultMarketDataProvider';

// Re-export types for convenience (avoid circular deps)
export type { TickerData, NormalizedTicker } from '../../app/data/mockData';
