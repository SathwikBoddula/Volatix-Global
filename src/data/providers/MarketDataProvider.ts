// src/data/providers/MarketDataProvider.ts
/**
 * Volatix — Market Data Provider Contract
 *
 * Defines the interface all market data providers must implement.
 * Dashboard components depend ONLY on this interface.
 *
 * @module data/providers/MarketDataProvider
 */

import type { TickerData } from '../../app/data/mockData';

/**
 * Market data provider interface.
 * Implementations encapsulate provider-specific logic (Yahoo, Finnhub, Mock, etc.)
 */
export interface MarketDataProvider {
  /**
   * Fetch complete ticker data for a canonical symbol.
   *
   * @param symbol - Canonical symbol (e.g., "AAPL", "RELIANCE.NS", "^NSEI")
   * @returns Complete TickerData or null if not found
   */
  fetchTickerData(symbol: string): Promise<TickerData | null>;

  /**
   * Optional: Search symbols by query for autocomplete.
   * Default implementation returns empty array.
   */

  /**
   * Optional: Provider metadata for diagnostics.
   */
  readonly providerName: string;
}
