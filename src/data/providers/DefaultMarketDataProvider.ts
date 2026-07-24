// src/data/providers/DefaultMarketDataProvider.ts
/**
 * Volatix — Default Market Data Provider
 *
 * Implements MarketDataProvider using the existing mock data generation.
 * This preserves the exact TickerData contract and indicator computations.
 *
 * @module data/providers/DefaultMarketDataProvider
 * @server-compatible — No browser APIs, works in Next.js Server Components
 */

import { MarketDataProvider } from './MarketDataProvider';
import { generateMockData, normalizeTicker, type TickerData } from '../../app/data/mockData';

/**
 * Default provider using existing mock data infrastructure.
 * In production, this will be replaced by YahooProvider, FinnhubProvider, etc.
 */
export class DefaultMarketDataProvider implements MarketDataProvider {
  public readonly providerName = 'DefaultMarketDataProvider (Mock)';

  /**
   * Fetch ticker data using existing generateMockData.
   * Preserves exact same behavior, contract, and indicator computations.
   */
  async fetchTickerData(symbol: string): Promise<TickerData | null> {
    // Normalize symbol using existing utility (handles .NS, aliases, case)
    const normalized = normalizeTicker(symbol);
    const canonicalKey = normalized.normalized;

    // Delegate to existing mock data generation
    // This preserves ALL current behavior: indicators, backtest, forecast, metadata
    const data = await generateMockData(canonicalKey);

    return data;
  }

  /**
   * Symbol search using known tickers list.
   * Returns normalized ticker metadata for UI autocomplete.
   */
}

/**
 * Singleton instance for application-wide use.
 * In future, this can be replaced via factory/DI without changing callers.
 */
export const defaultMarketDataProvider = new DefaultMarketDataProvider();
