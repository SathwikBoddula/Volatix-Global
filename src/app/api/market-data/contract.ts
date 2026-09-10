import type { TickerData, TickerDataStatus } from '@/app/data/mockData';

export const MARKET_DATA_API_VERSION = 'v1' as const;

export type MarketDataErrorCode =
  | 'INVALID_TICKER'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export interface MarketDataResponse {
  version: typeof MARKET_DATA_API_VERSION;
  data: TickerData;
  meta: {
    requestId: string;
    ticker: string;
    source: TickerDataStatus['source'];
    asOf: string;
    stale: boolean;
    simulated: boolean;
  };
}

export interface MarketDataErrorResponse {
  version: typeof MARKET_DATA_API_VERSION;
  error: {
    code: MarketDataErrorCode;
    message: string;
    requestId: string;
  };
}

const TICKER_PATTERN = /^[A-Z0-9.^-]{1,16}$/;

/** Produces a safe, normalized path parameter or null when it is not a valid ticker. */
export function parseTicker(rawTicker: string): string | null {
  const ticker = rawTicker.trim().toUpperCase();
  return TICKER_PATTERN.test(ticker) ? ticker : null;
}

/** Creates the stable v1 success envelope from the existing domain payload. */
export function marketDataResponse(
  data: TickerData,
  ticker: string,
  requestId: string
): MarketDataResponse {
  const status: TickerDataStatus = data.dataStatus ?? {
    source: 'live',
    asOf: Date.now(),
    stale: false,
    simulated: false,
  };

  return {
    version: MARKET_DATA_API_VERSION,
    data,
    meta: {
      requestId,
      ticker,
      source: status.source,
      asOf: new Date(status.asOf).toISOString(),
      stale: status.stale,
      simulated: status.simulated,
    },
  };
}

/** Creates a safe, stable v1 error envelope. */
export function marketDataError(
  code: MarketDataErrorCode,
  message: string,
  requestId: string
): MarketDataErrorResponse {
  return {
    version: MARKET_DATA_API_VERSION,
    error: { code, message, requestId },
  };
}
