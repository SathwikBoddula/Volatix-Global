//
// src/app/api/market-data/[ticker]/route.ts
//
import { NextRequest, NextResponse } from 'next/server';
import { getTickerData } from '@/app/data/marketData.server';
import { marketDataError, marketDataResponse, parseTicker } from '../contract';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ ticker: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const requestId = crypto.randomUUID();

  try {
    const { ticker } = await params;
    const rawTicker = parseTicker(ticker);

    if (!rawTicker) {
      return NextResponse.json(
        marketDataError('INVALID_TICKER', 'Ticker parameter is invalid.', requestId),
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const data = await getTickerData(rawTicker);

    if (!data) {
      return NextResponse.json(
        marketDataError('NOT_FOUND', 'No data is available for this ticker.', requestId),
        { status: 404, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const response = marketDataResponse(data, rawTicker, requestId);
    const cacheControl =
      response.meta.stale || response.meta.simulated
        ? 'no-store'
        : 'public, s-maxage=60, stale-while-revalidate=120';

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': cacheControl,
      },
    });
  } catch {
    return NextResponse.json(
      marketDataError('INTERNAL_ERROR', 'Unable to retrieve market data.', requestId),
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
